/**
 * Workspace-level defaults and tuning constants.
 *
 * Every value here is overridable per workspace (stored on `Organization`);
 * these are only the shipped defaults.
 */
/** Deal is flagged as stalling after this many days with no captured activity (FR-AC-06). */
export const DEFAULT_STALLING_THRESHOLD_DAYS = 5;
/**
 * Three-tier confidence model (PRD §25.1).
 *
 *   >= HIGH    -> pending proposal, surfaced prominently on the record
 *   MEDIUM..HIGH -> pending proposal, visible in the Agent Action Log only
 *   <  MEDIUM  -> no Agent Action created at all (FR-AGENT-06)
 *
 * The bottom tier is the important one: silence is preferred to a
 * low-confidence guess.
 */
export const DEFAULT_AGENT_HIGH_THRESHOLD = 0.8;
export const DEFAULT_AGENT_MEDIUM_THRESHOLD = 0.5;
/** Public REST API rate limit (FR-API-01). No punitive throttling below this. */
export const API_RATE_LIMIT_PER_MINUTE = 300;
/** Ingestion scheduler tick. Individual connections back off independently. */
export const INGESTION_TICK_MS = 30_000;
/** Base poll interval per healthy connection. */
export const CONNECTION_BASE_POLL_SECONDS = 60;
/** Exponential backoff ceiling for a failing connection (FR-AC-07). */
export const CONNECTION_MAX_BACKOFF_SECONDS = 3_600;
/** How far back the initial backfill reaches when a provider is first connected. */
export const INITIAL_BACKFILL_DAYS = 30;
/**
 * Data minimization (PRD §30).
 *
 * Continuum stores an excerpt of a captured message — enough to give the
 * summary an audit trail a user can check it against — not the full body. The
 * full text lives in the user's own mailbox, which is the appropriate system of
 * record for it; holding a second complete copy enlarges the blast radius of a
 * breach for no product benefit.
 *
 * The excerpt is taken *after* summarization, so summary quality is unaffected.
 */
export const STORED_BODY_EXCERPT_CHARS = 2_000;
/** Call transcripts are the evidence for a call summary, so they are kept longer. */
export const STORED_TRANSCRIPT_EXCERPT_CHARS = 8_000;
export function excerpt(text, limit) {
    if (!text)
        return null;
    const trimmed = text.trim();
    if (trimmed.length <= limit)
        return trimmed;
    return `${trimmed.slice(0, limit)}\n\n[Excerpt — the full message remains in your mailbox.]`;
}
/** Default stage template for the Sales motion (FR-PIPE-02). */
export const DEFAULT_SALES_STAGES = [
    { name: 'New Lead', winProbability: 0.1 },
    { name: 'Contacted', winProbability: 0.2 },
    { name: 'Qualified', winProbability: 0.4 },
    { name: 'Proposal', winProbability: 0.65 },
    { name: 'Won', winProbability: 1, isWonStage: true },
    { name: 'Lost', winProbability: 0, isLostStage: true },
];
/** Default stage template for the Agency motion — same spine, services vocabulary. */
export const DEFAULT_AGENCY_STAGES = [
    { name: 'Enquiry', winProbability: 0.1 },
    { name: 'Discovery', winProbability: 0.25 },
    { name: 'Scoping', winProbability: 0.45 },
    { name: 'Proposal Sent', winProbability: 0.7 },
    { name: 'Won', winProbability: 1, isWonStage: true },
    { name: 'Lost', winProbability: 0, isLostStage: true },
];
/**
 * Free-mail and consumer domains never map to a Company. Without this, every
 * personal address would mint a "gmail.com" account.
 */
export const CONSUMER_EMAIL_DOMAINS = new Set([
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'yahoo.co.uk',
    'hotmail.com',
    'outlook.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'aol.com',
    'proton.me',
    'protonmail.com',
    'gmx.com',
    'mail.com',
    'yandex.com',
    'zoho.com',
    'fastmail.com',
]);
/**
 * Local-parts that indicate machine senders. A newsletter from a known
 * customer's domain must not generate a new-contact proposal, so this filter
 * runs before the matching engine (Epic A edge cases).
 */
export const AUTOMATED_LOCAL_PARTS = [
    'no-reply',
    'noreply',
    'do-not-reply',
    'donotreply',
    'notifications',
    'notification',
    'mailer-daemon',
    'postmaster',
    'bounce',
    'bounces',
    'automated',
    'alerts',
    'alert',
    'newsletter',
    'news',
    'marketing',
    'support-noreply',
    'updates',
    'billing',
    'invoice',
    'receipts',
];
