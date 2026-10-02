import { config } from '../../config.js';
import { ProviderAuthError, ProviderTransientError, } from '../types.js';
const GRAPH = 'https://graph.microsoft.com/v1.0';
/**
 * Microsoft 365 — Outlook mail and calendar behind one connection (FR-INT-02).
 *
 * Graph's delta queries do the same job as Gmail's history endpoint: the
 * cursor is a `@odata.deltaLink` that returns only what changed.
 */
const SCOPES = ['offline_access', 'User.Read', 'Mail.Read', 'Calendars.Read'].join(' ');
export class MicrosoftEmailProvider {
    id = 'MICROSOFT';
    displayName = 'Microsoft 365';
    get authority() {
        return `https://login.microsoftonline.com/${config.microsoft.tenantId}`;
    }
    authorizationUrl(state) {
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
    async exchangeCode(code) {
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
        const json = (await response.json());
        const me = await fetch(`${GRAPH}/me`, {
            headers: { Authorization: `Bearer ${json.access_token}` },
        });
        const profile = me.ok
            ? (await me.json())
            : {};
        return {
            accessToken: json.access_token,
            refreshToken: json.refresh_token ?? null,
            expiresAt: new Date(Date.now() + json.expires_in * 1000),
            accountEmail: profile.mail ?? profile.userPrincipalName ?? null,
        };
    }
    async refresh(credentials) {
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
        const json = (await response.json());
        return {
            ...credentials,
            accessToken: json.access_token,
            refreshToken: json.refresh_token ?? credentials.refreshToken,
            expiresAt: new Date(Date.now() + json.expires_in * 1000),
        };
    }
    async fetchIncremental(credentials, cursor) {
        const token = requireToken(credentials);
        const mailbox = credentials.accountEmail ?? '';
        const url = cursor ??
            `${GRAPH}/me/mailFolders/inbox/messages/delta?$select=id,conversationId,subject,body,bodyPreview,receivedDateTime,from,toRecipients,ccRecipients,internetMessageHeaders`;
        const page = await this.get(url, token);
        const messages = (page.value ?? []).map((m) => toCapturedMessage(m, mailbox));
        const events = await this.fetchCalendar(token, mailbox);
        return {
            messages: [...messages, ...events],
            cursor: page['@odata.deltaLink'] ?? page['@odata.nextLink'] ?? cursor,
        };
    }
    async backfill(credentials, since) {
        const token = requireToken(credentials);
        const mailbox = credentials.accountEmail ?? '';
        const filter = encodeURIComponent(`receivedDateTime ge ${since.toISOString()}`);
        const page = await this.get(`${GRAPH}/me/messages?$filter=${filter}&$top=200&$select=id,conversationId,subject,body,receivedDateTime,from,toRecipients,ccRecipients,internetMessageHeaders`, token);
        const messages = (page.value ?? []).map((m) => toCapturedMessage(m, mailbox));
        const events = await this.fetchCalendar(token, mailbox, since);
        // Establish a delta cursor for subsequent incremental polls.
        const delta = await this.get(`${GRAPH}/me/mailFolders/inbox/messages/delta?$select=id`, token).catch(() => null);
        return {
            messages: [...messages, ...events],
            cursor: delta?.['@odata.deltaLink'] ?? null,
        };
    }
    async fetchCalendar(token, mailbox, since) {
        const start = (since ?? new Date(Date.now() - 7 * 86_400_000)).toISOString();
        const end = new Date(Date.now() + 60 * 86_400_000).toISOString();
        try {
            const page = await this.get(`${GRAPH}/me/calendarView?startDateTime=${start}&endDateTime=${end}&$top=250`, token);
            return (page.value ?? [])
                .filter((event) => !event.isCancelled)
                .map((event) => ({
                externalRef: `msgraph-event:${event.id}`,
                threadRef: null,
                kind: 'MEETING',
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
        }
        catch {
            return [];
        }
    }
    async get(url, token) {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (response.status === 401 || response.status === 403) {
            throw new ProviderAuthError(`Microsoft rejected the access token (${response.status})`);
        }
        if (response.status === 429 || response.status >= 500) {
            const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
            throw new ProviderTransientError(`Microsoft Graph temporarily unavailable (${response.status})`, Number.isFinite(retryAfter) ? retryAfter : undefined);
        }
        if (!response.ok) {
            throw new Error(`Microsoft Graph error ${response.status}: ${await response.text()}`);
        }
        return (await response.json());
    }
}
function requireToken(credentials) {
    if (!credentials.accessToken) {
        throw new ProviderAuthError('Connection has no access token');
    }
    return credentials.accessToken;
}
function formatAddress(entry) {
    if (!entry)
        return '';
    const { address, name } = entry.emailAddress;
    return name ? `${name} <${address}>` : address;
}
function toCapturedMessage(message, mailbox) {
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
        headers: Object.fromEntries((message.internetMessageHeaders ?? []).map((h) => [h.name.toLowerCase(), h.value])),
    };
}
