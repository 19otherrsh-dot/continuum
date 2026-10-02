import {
  ProviderAuthError,
  ProviderTransientError,
  type CapturedMessage,
  type EmailProvider,
  type EmailProviderCredentials,
  type FetchResult,
} from '../types.js';
import { SIMULATOR_MAILBOX, rescheduledMeeting, simulatorInbox } from './fixtures.js';

/**
 * Deterministic email + calendar provider.
 *
 * Its job is to make the capture engine exercisable without credentials, and
 * to make the tricky paths reproducible: the cursor advances the same way on
 * every run, the fixture set covers the edge cases the pipeline must handle,
 * and a reschedule is delivered under an existing externalRef so in-place
 * update is testable.
 *
 * Faults can be injected on demand so the backoff and reauth paths are
 * exercisable too, rather than only reachable by breaking a real integration.
 */
export class SimulatorEmailProvider implements EmailProvider {
  readonly id = 'GOOGLE' as const;
  readonly displayName = 'Simulated Workspace';

  /** Set by tests or the demo endpoint to force the next fetch to fail. */
  static faultMode: 'none' | 'transient' | 'auth' = 'none';

  /** Extra messages queued by tests or the demo endpoint. */
  private static injected: CapturedMessage[] = [];

  static injectMessage(message: CapturedMessage): void {
    SimulatorEmailProvider.injected.push(message);
  }

  static reset(): void {
    SimulatorEmailProvider.injected = [];
    SimulatorEmailProvider.faultMode = 'none';
  }

  authorizationUrl(state: string): string {
    // No consent screen to visit — the callback can be hit directly.
    return `/api/v1/integrations/simulator/callback?state=${encodeURIComponent(state)}`;
  }

  async exchangeCode(): Promise<EmailProviderCredentials> {
    return {
      accessToken: 'simulator-access-token',
      refreshToken: 'simulator-refresh-token',
      expiresAt: new Date(Date.now() + 3600_000),
      accountEmail: SIMULATOR_MAILBOX,
    };
  }

  async refresh(credentials: EmailProviderCredentials): Promise<EmailProviderCredentials> {
    return { ...credentials, expiresAt: new Date(Date.now() + 3600_000) };
  }

  /**
   * Cursor is the index into the fixture inbox already delivered. Later polls
   * return only what is new — including a rescheduled meeting under an
   * externalRef that has already been seen.
   */
  async fetchIncremental(
    _credentials: EmailProviderCredentials,
    cursor: string | null,
  ): Promise<FetchResult> {
    this.maybeFault();

    const inbox = simulatorInbox();
    const delivered = Number.parseInt(cursor ?? '0', 10) || 0;

    if (delivered < inbox.length) {
      // Deliver the backlog in one batch on the first incremental poll after
      // connect, mirroring how a real provider returns a history page.
      return { messages: inbox.slice(delivered), cursor: String(inbox.length) };
    }

    const queued = SimulatorEmailProvider.injected.splice(0);
    if (queued.length > 0) {
      return { messages: queued, cursor: String(delivered) };
    }

    // Once the inbox is drained, deliver the reschedule exactly once so the
    // in-place-update path is exercised on a normal poll cycle.
    if (delivered === inbox.length) {
      return { messages: [rescheduledMeeting()], cursor: String(delivered + 1) };
    }

    return { messages: [], cursor };
  }

  async backfill(
    _credentials: EmailProviderCredentials,
    since: Date,
  ): Promise<FetchResult> {
    this.maybeFault();
    const inbox = simulatorInbox().filter((message) => message.occurredAt >= since);
    return { messages: inbox, cursor: String(simulatorInbox().length) };
  }

  private maybeFault(): void {
    if (SimulatorEmailProvider.faultMode === 'transient') {
      SimulatorEmailProvider.faultMode = 'none';
      throw new ProviderTransientError('Simulated provider rate limit', 30);
    }
    if (SimulatorEmailProvider.faultMode === 'auth') {
      SimulatorEmailProvider.faultMode = 'none';
      // The connection should land in REAUTH_REQUIRED and stop polling until a
      // human reconnects, rather than retrying a credential that will not heal.
      throw new ProviderAuthError('Simulated token revocation');
    }
  }
}
