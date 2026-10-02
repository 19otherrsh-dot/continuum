import type { ConsentRegime } from '@continuum/shared';

/**
 * Provider contracts.
 *
 * Everything above this layer is written against these interfaces, so nothing
 * in the ingestion pipeline, the AI layer, or the API knows whether it is
 * talking to Gmail or to the deterministic simulator. That is what makes the
 * product runnable end to end with no credentials, and what makes the live
 * adapters swappable without touching business logic.
 */

/** A normalised message from any email provider. */
export interface CapturedMessage {
  /** Provider-side identifier. Doubles as the dedupe key (FR-AC-09). */
  externalRef: string;
  threadRef: string | null;
  kind: 'EMAIL' | 'MEETING';
  subject: string | null;
  body: string;
  occurredAt: Date;
  from: string;
  to: string[];
  cc: string[];
  /** The mailbox that received this message — used to decide direction. */
  mailbox: string;
  /**
   * Raw headers the noise filter needs (List-Unsubscribe, Precedence, …).
   * Lowercased keys.
   */
  headers: Record<string, string>;
  /** Meetings only. A rescheduled event keeps its externalRef and updates in place. */
  meetingStart?: Date;
  meetingEnd?: Date;
  attendees?: string[];
}

export interface FetchResult {
  messages: CapturedMessage[];
  /** Opaque provider cursor to persist and pass back on the next poll. */
  cursor: string | null;
}

/** Raised when a provider rejects our credentials, as opposed to failing transiently. */
export class ProviderAuthError extends Error {
  readonly kind = 'auth';
  constructor(message: string) {
    super(message);
    this.name = 'ProviderAuthError';
  }
}

/** Raised on rate limits and outages — retried with backoff, never dropped. */
export class ProviderTransientError extends Error {
  readonly kind = 'transient';
  constructor(
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ProviderTransientError';
  }
}

export interface EmailProviderCredentials {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  accountEmail: string | null;
}

/**
 * A connected mail + calendar account. Google and Microsoft each expose both
 * from a single connection, so the user connects once rather than twice
 * (FR-INT-01, FR-INT-02).
 */
export interface EmailProvider {
  readonly id: 'GOOGLE' | 'MICROSOFT';
  readonly displayName: string;

  /** URL to send the user to for consent. */
  authorizationUrl(state: string): string;

  /** Exchanges the OAuth code for tokens. */
  exchangeCode(code: string): Promise<EmailProviderCredentials>;

  /** Refreshes an expired access token. */
  refresh(credentials: EmailProviderCredentials): Promise<EmailProviderCredentials>;

  /**
   * Incremental sync from a cursor. Called on every poll; must be cheap and
   * must not re-deliver everything when the cursor is valid.
   */
  fetchIncremental(
    credentials: EmailProviderCredentials,
    cursor: string | null,
  ): Promise<FetchResult>;

  /**
   * One-time historical pull on connect, so the user lands on a populated
   * pipeline rather than an empty state (Journey 1).
   */
  backfill(credentials: EmailProviderCredentials, since: Date): Promise<FetchResult>;
}

export interface PlacedCall {
  externalCallId: string;
  /** False when the call never connected — logged distinctly from a conversation. */
  connected: boolean;
  outcome: 'CONNECTED' | 'ATTEMPTED_NO_CONNECT' | 'VOICEMAIL' | 'FAILED';
  durationSeconds: number;
  recordingUrl: string | null;
  /** Present immediately for the simulator; arrives by webhook for live providers. */
  transcript: string | null;
}

export interface TelephonyProvider {
  readonly id: string;

  /**
   * Consent regime for a destination number. Two-party jurisdictions get a
   * spoken prompt before recording begins (FR-PIPE-04).
   */
  consentRegimeFor(e164Number: string): { regime: ConsentRegime; region: string | null };

  placeCall(options: {
    to: string;
    from?: string;
    /** When true, play a consent announcement before recording starts. */
    requireConsentPrompt: boolean;
    /** Recording is skipped entirely where it is not permitted. */
    record: boolean;
    callbackUrl: string;
  }): Promise<PlacedCall>;

  transcribe(recordingUrl: string): Promise<string | null>;
}

export interface SlackProvider {
  readonly id: string;
  notify(options: { channel: string; title: string; body: string; url?: string }): Promise<void>;
}

export interface ESignProvider {
  readonly id: string;
  send(options: {
    title: string;
    body: string;
    signerEmail: string;
    signerName: string;
  }): Promise<{ externalRef: string; status: string }>;
  status(externalRef: string): Promise<{ status: string; signedAt: Date | null }>;
}
