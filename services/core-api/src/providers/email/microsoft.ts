import { config } from '../../config.js';
import {
  ProviderAuthError,
  ProviderTransientError,
  type CapturedMessage,
  type EmailProvider,
  type EmailProviderCredentials,
  type FetchResult,
} from '../types.js';

const GRAPH = 'https://graph.microsoft.com/v1.0';

/**
 * Microsoft 365 — Outlook mail and calendar behind one connection (FR-INT-02).
 *
 * Graph's delta queries do the same job as Gmail's history endpoint: the
 * cursor is a `@odata.deltaLink` that returns only what changed.
 */
const SCOPES = ['offline_access', 'User.Read', 'Mail.Read', 'Calendars.Read'].join(' ');

export class MicrosoftEmailProvider implements EmailProvider {
  readonly id = 'MICROSOFT' as const;
  readonly displayName = 'Microsoft 365';

  private get authority(): string {
    return `https://login.microsoftonline.com/${config.microsoft.tenantId}`;
  }

  authorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: config.microsoft.clientId,
      response_type: 'code',
      redirect_uri: config.microsoft.redirectUri,
      response_mode: 'query',
      scope: SCOPES,
      state,
    });
    return `${this.authority}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<EmailProviderCredentials> {
    const response = await fetch(`${this.authority}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.microsoft.clientId,
        client_secret: config.microsoft.clientSecret,
        code,
        redirect_uri: config.microsoft.redirectUri,
        grant_type: 'authorization_code',
        scope: SCOPES,
      }),
    });

    if (!response.ok) {
      throw new ProviderAuthError(`Microsoft token exchange failed: ${await response.text()}`);
    }

    const json = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const me = await fetch(`${GRAPH}/me`, {
      headers: { Authorization: `Bearer ${json.access_token}` },
    });
    const profile = me.ok
      ? ((await me.json()) as { mail?: string; userPrincipalName?: string })
      : {};

    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? null,
      expiresAt: new Date(Date.now() + json.expires_in * 1000),
      accountEmail: profile.mail ?? profile.userPrincipalName ?? null,
    };
  }

  async refresh(credentials: EmailProviderCredentials): Promise<EmailProviderCredentials> {
    if (!credentials.refreshToken) {
      throw new ProviderAuthError('No refresh token — the account must be reconnected');
    }

    const response = await fetch(`${this.authority}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.microsoft.clientId,
        client_secret: config.microsoft.clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
        scope: SCOPES,
      }),
    });

    if (response.status === 400 || response.status === 401) {
      throw new ProviderAuthError('Microsoft refresh token was rejected');
    }
    if (!response.ok) {
      throw new ProviderTransientError(`Microsoft token refresh failed (${response.status})`);
    }

    const json = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    return {
      ...credentials,
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? credentials.refreshToken,
      expiresAt: new Date(Date.now() + json.expires_in * 1000),
    };
  }

  async fetchIncremental(
    credentials: EmailProviderCredentials,
    cursor: string | null,
  ): Promise<FetchResult> {
    const token = requireToken(credentials);
    const mailbox = credentials.accountEmail ?? '';

    const url =
      cursor ??
      `${GRAPH}/me/mailFolders/inbox/messages/delta?$select=id,conversationId,subject,body,bodyPreview,receivedDateTime,from,toRecipients,ccRecipients,internetMessageHeaders`;

    const page = await this.get<GraphDeltaPage<GraphMessage>>(url, token);
    const messages = (page.value ?? []).map((m) => toCapturedMessage(m, mailbox));
    const events = await this.fetchCalendar(token, mailbox);

    return {
      messages: [...messages, ...events],
      cursor: page['@odata.deltaLink'] ?? page['@odata.nextLink'] ?? cursor,
    };
  }

  async backfill(credentials: EmailProviderCredentials, since: Date): Promise<FetchResult> {
    const token = requireToken(credentials);
    const mailbox = credentials.accountEmail ?? '';

    const filter = encodeURIComponent(`receivedDateTime ge ${since.toISOString()}`);
    const page = await this.get<GraphDeltaPage<GraphMessage>>(
      `${GRAPH}/me/messages?$filter=${filter}&$top=200&$select=id,conversationId,subject,body,receivedDateTime,from,toRecipients,ccRecipients,internetMessageHeaders`,
      token,
    );

    const messages = (page.value ?? []).map((m) => toCapturedMessage(m, mailbox));
    const events = await this.fetchCalendar(token, mailbox, since);

    // Establish a delta cursor for subsequent incremental polls.
    const delta = await this.get<GraphDeltaPage<GraphMessage>>(
      `${GRAPH}/me/mailFolders/inbox/messages/delta?$select=id`,
      token,
    ).catch(() => null);

    return {
      messages: [...messages, ...events],
      cursor: delta?.['@odata.deltaLink'] ?? null,
    };
  }

  private async fetchCalendar(
    token: string,
    mailbox: string,
    since?: Date,
  ): Promise<CapturedMessage[]> {
    const start = (since ?? new Date(Date.now() - 7 * 86_400_000)).toISOString();
    const end = new Date(Date.now() + 60 * 86_400_000).toISOString();

    try {
      const page = await this.get<GraphDeltaPage<GraphEvent>>(
        `${GRAPH}/me/calendarView?startDateTime=${start}&endDateTime=${end}&$top=250`,
        token,
      );

      return (page.value ?? [])
        .filter((event) => !event.isCancelled)
        .map((event) => ({
          externalRef: `msgraph-event:${event.id}`,
          threadRef: null,
          kind: 'MEETING' as const,
          subject: event.subject ?? 'Meeting',
          body: event.bodyPreview ?? '',
          occurredAt: new Date(event.start?.dateTime ?? Date.now()),
          from: event.organizer?.emailAddress?.address ?? mailbox,
          to: (event.attendees ?? []).map((a) => a.emailAddress.address),
          cc: [],
          mailbox,
          headers: {},
          meetingStart: event.start ? new Date(event.start.dateTime) : undefined,
          meetingEnd: event.end ? new Date(event.end.dateTime) : undefined,
          attendees: (event.attendees ?? []).map((a) => a.emailAddress.address),
        }));
    } catch {
      return [];
    }
  }

  private async get<T>(url: string, token: string): Promise<T> {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (response.status === 401 || response.status === 403) {
      throw new ProviderAuthError(`Microsoft rejected the access token (${response.status})`);
    }
    if (response.status === 429 || response.status >= 500) {
      const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
      throw new ProviderTransientError(
        `Microsoft Graph temporarily unavailable (${response.status})`,
        Number.isFinite(retryAfter) ? retryAfter : undefined,
      );
    }
    if (!response.ok) {
      throw new Error(`Microsoft Graph error ${response.status}: ${await response.text()}`);
    }
    return (await response.json()) as T;
  }
}

interface GraphDeltaPage<T> {
  value?: T[];
  '@odata.deltaLink'?: string;
  '@odata.nextLink'?: string;
}

interface GraphMessage {
  id: string;
  conversationId?: string;
  subject?: string;
  body?: { contentType: string; content: string };
  bodyPreview?: string;
  receivedDateTime?: string;
  from?: { emailAddress: { address: string; name?: string } };
  toRecipients?: { emailAddress: { address: string; name?: string } }[];
  ccRecipients?: { emailAddress: { address: string; name?: string } }[];
  internetMessageHeaders?: { name: string; value: string }[];
}

interface GraphEvent {
  id: string;
  subject?: string;
  bodyPreview?: string;
  isCancelled?: boolean;
  start?: { dateTime: string };
  end?: { dateTime: string };
  organizer?: { emailAddress?: { address: string } };
  attendees?: { emailAddress: { address: string } }[];
}

function requireToken(credentials: EmailProviderCredentials): string {
  if (!credentials.accessToken) {
    throw new ProviderAuthError('Connection has no access token');
  }
  return credentials.accessToken;
}

function formatAddress(entry?: { emailAddress: { address: string; name?: string } }): string {
  if (!entry) return '';
  const { address, name } = entry.emailAddress;
  return name ? `${name} <${address}>` : address;
}

function toCapturedMessage(message: GraphMessage, mailbox: string): CapturedMessage {
  const html = message.body?.contentType?.toLowerCase() === 'html';
  const content = message.body?.content ?? message.bodyPreview ?? '';

  return {
    externalRef: `msgraph:${message.id}`,
    threadRef: message.conversationId ? `msgraph-thread:${message.conversationId}` : null,
    kind: 'EMAIL',
    subject: message.subject ?? null,
    body: html
      ? content
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : content,
    occurredAt: message.receivedDateTime ? new Date(message.receivedDateTime) : new Date(),
    from: formatAddress(message.from),
    to: (message.toRecipients ?? []).map(formatAddress),
    cc: (message.ccRecipients ?? []).map(formatAddress),
    mailbox,
    headers: Object.fromEntries(
      (message.internetMessageHeaders ?? []).map((h) => [h.name.toLowerCase(), h.value]),
    ),
  };
}
