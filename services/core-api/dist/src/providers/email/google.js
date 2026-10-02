import { config } from '../../config.js';
import { ProviderAuthError, ProviderTransientError, } from '../types.js';
const OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const CALENDAR = 'https://www.googleapis.com/calendar/v3';
/**
 * Google Workspace — Gmail and Google Calendar behind one connection.
 *
 * The user connects once and both start syncing, because being asked to
 * connect "email" and then "calendar" separately is exactly the kind of setup
 * friction the product exists to remove (FR-INT-01).
 *
 * Read-only scopes only. Continuum never needs to send or modify mail, and
 * asking for permissions we do not use undermines the consent screen's claim
 * about what is captured.
 */
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid',
].join(' ');
export class GoogleEmailProvider {
    id = 'GOOGLE';
    displayName = 'Google Workspace';
    authorizationUrl(state) {
        const params = new URLSearchParams({
            client_id: config.google.clientId,
            redirect_uri: config.google.redirectUri,
            response_type: 'code',
            scope: SCOPES,
            // Needed to obtain a refresh token; without it the connection dies
            // silently in an hour.
            access_type: 'offline',
            prompt: 'consent',
            state,
        });
        return `${OAUTH_BASE}?${params.toString()}`;
    }
    async exchangeCode(code) {
        const body = new URLSearchParams({
            code,
            client_id: config.google.clientId,
            client_secret: config.google.clientSecret,
            redirect_uri: config.google.redirectUri,
            grant_type: 'authorization_code',
        });
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });
        if (!response.ok) {
            throw new ProviderAuthError(`Google token exchange failed: ${await response.text()}`);
        }
        const json = (await response.json());
        const profile = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${json.access_token}` },
        });
        const email = profile.ok ? (await profile.json()).email : null;
        return {
            accessToken: json.access_token,
            refreshToken: json.refresh_token ?? null,
            expiresAt: new Date(Date.now() + json.expires_in * 1000),
            accountEmail: email ?? null,
        };
    }
    async refresh(credentials) {
        if (!credentials.refreshToken) {
            throw new ProviderAuthError('No refresh token — the account must be reconnected');
        }
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                refresh_token: credentials.refreshToken,
                client_id: config.google.clientId,
                client_secret: config.google.clientSecret,
                grant_type: 'refresh_token',
            }),
        });
        if (response.status === 400 || response.status === 401) {
            // The user revoked access. Distinguished from a transient failure so the
            // connection lands in REAUTH_REQUIRED instead of retrying forever.
            throw new ProviderAuthError('Google refresh token was rejected');
        }
        if (!response.ok) {
            throw new ProviderTransientError(`Google token refresh failed (${response.status})`);
        }
        const json = (await response.json());
        return {
            ...credentials,
            accessToken: json.access_token,
            expiresAt: new Date(Date.now() + json.expires_in * 1000),
        };
    }
    /**
     * Gmail's `history` endpoint gives true incremental sync from a stored
     * historyId, so a poll costs one request when nothing has changed rather
     * than a full mailbox listing.
     */
    async fetchIncremental(credentials, cursor) {
        const token = requireToken(credentials);
        if (!cursor) {
            const profile = await this.get(`${GMAIL}/profile`, token);
            return { messages: [], cursor: profile.historyId };
        }
        const history = await this.get(`${GMAIL}/history?startHistoryId=${cursor}&historyTypes=messageAdded`, token);
        const ids = (history.history ?? [])
            .flatMap((entry) => entry.messagesAdded ?? [])
            .map((added) => added.message.id);
        const messages = await this.hydrate(ids, token, credentials.accountEmail ?? '');
        const events = await this.fetchCalendar(token, credentials.accountEmail ?? '');
        return { messages: [...messages, ...events], cursor: history.historyId ?? cursor };
    }
    async backfill(credentials, since) {
        const token = requireToken(credentials);
        const after = Math.floor(since.getTime() / 1000);
        const list = await this.get(`${GMAIL}/messages?q=${encodeURIComponent(`after:${after} -category:promotions -category:social`)}&maxResults=200`, token);
        const messages = await this.hydrate((list.messages ?? []).map((m) => m.id), token, credentials.accountEmail ?? '');
        const events = await this.fetchCalendar(token, credentials.accountEmail ?? '', since);
        const profile = await this.get(`${GMAIL}/profile`, token);
        return { messages: [...messages, ...events], cursor: profile.historyId };
    }
    async hydrate(ids, token, mailbox) {
        const out = [];
        // Bounded concurrency: Gmail rate-limits aggressively and a burst here
        // would trip backoff for the whole connection.
        for (const batch of chunk(ids, 10)) {
            const results = await Promise.all(batch.map((id) => this.get(`${GMAIL}/messages/${id}?format=full`, token).catch(() => null)));
            for (const message of results) {
                if (message)
                    out.push(toCapturedMessage(message, mailbox));
            }
        }
        return out;
    }
    async fetchCalendar(token, mailbox, since) {
        const timeMin = (since ?? new Date(Date.now() - 7 * 86_400_000)).toISOString();
        try {
            const data = await this.get(`${CALENDAR}/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&maxResults=250`, token);
            return (data.items ?? [])
                .filter((event) => event.status !== 'cancelled')
                .map((event) => {
                const start = event.start?.dateTime ?? event.start?.date;
                const end = event.end?.dateTime ?? event.end?.date;
                return {
                    // Stable across reschedules, which is what makes an updated event
                    // move the existing Activity rather than create a new one.
                    externalRef: `gcal:${event.id}`,
                    threadRef: null,
                    kind: 'MEETING',
                    subject: event.summary ?? 'Meeting',
                    body: event.description ?? '',
                    occurredAt: start ? new Date(start) : new Date(),
                    from: event.organizer?.email ?? mailbox,
                    to: (event.attendees ?? []).map((a) => a.email),
                    cc: [],
                    mailbox,
                    headers: {},
                    meetingStart: start ? new Date(start) : undefined,
                    meetingEnd: end ? new Date(end) : undefined,
                    attendees: (event.attendees ?? []).map((a) => a.email),
                };
            });
        }
        catch {
            // Calendar is best-effort. Losing events must not stop mail capture.
            return [];
        }
    }
    async get(url, token) {
        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (response.status === 401 || response.status === 403) {
            throw new ProviderAuthError(`Google rejected the access token (${response.status})`);
        }
        if (response.status === 429 || response.status >= 500) {
            const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
            throw new ProviderTransientError(`Google API temporarily unavailable (${response.status})`, Number.isFinite(retryAfter) ? retryAfter : undefined);
        }
        if (!response.ok) {
            throw new Error(`Google API error ${response.status}: ${await response.text()}`);
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
function chunk(items, size) {
    const out = [];
    for (let i = 0; i < items.length; i += size)
        out.push(items.slice(i, i + size));
    return out;
}
function toCapturedMessage(message, mailbox) {
    const headers = new Map((message.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value]));
    return {
        externalRef: `gmail:${message.id}`,
        threadRef: message.threadId ? `gmail-thread:${message.threadId}` : null,
        kind: 'EMAIL',
        subject: headers.get('subject') ?? null,
        body: extractBody(message.payload),
        occurredAt: message.internalDate
            ? new Date(Number.parseInt(message.internalDate, 10))
            : new Date(),
        from: headers.get('from') ?? '',
        to: splitAddresses(headers.get('to')),
        cc: splitAddresses(headers.get('cc')),
        mailbox,
        // Passed through verbatim so the noise filter can see List-Unsubscribe,
        // Precedence and friends.
        headers: Object.fromEntries(headers),
    };
}
function splitAddresses(value) {
    return value ? value.split(',').map((v) => v.trim()).filter(Boolean) : [];
}
/** Prefers text/plain; falls back to stripped HTML. */
function extractBody(payload) {
    if (!payload)
        return '';
    const decode = (data) => data ? Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8') : '';
    if (payload.mimeType === 'text/plain')
        return decode(payload.body?.data);
    for (const part of payload.parts ?? []) {
        if (part?.mimeType === 'text/plain')
            return decode(part.body?.data);
    }
    for (const part of payload.parts ?? []) {
        if (part?.mimeType === 'text/html') {
            return decode(part.body?.data)
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }
    }
    for (const part of payload.parts ?? []) {
        const nested = extractBody(part);
        if (nested)
            return nested;
    }
    return decode(payload.body?.data);
}
