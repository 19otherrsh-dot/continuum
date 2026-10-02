/**
 * Workspace-level defaults and tuning constants.
 *
 * Every value here is overridable per workspace (stored on `Organization`);
 * these are only the shipped defaults.
 */
/** Deal is flagged as stalling after this many days with no captured activity (FR-AC-06). */
export declare const DEFAULT_STALLING_THRESHOLD_DAYS = 5;
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
export declare const DEFAULT_AGENT_HIGH_THRESHOLD = 0.8;
export declare const DEFAULT_AGENT_MEDIUM_THRESHOLD = 0.5;
/** Public REST API rate limit (FR-API-01). No punitive throttling below this. */
export declare const API_RATE_LIMIT_PER_MINUTE = 300;
/** Ingestion scheduler tick. Individual connections back off independently. */
export declare const INGESTION_TICK_MS = 30000;
/** Base poll interval per healthy connection. */
export declare const CONNECTION_BASE_POLL_SECONDS = 60;
/** Exponential backoff ceiling for a failing connection (FR-AC-07). */
export declare const CONNECTION_MAX_BACKOFF_SECONDS = 3600;
/** How far back the initial backfill reaches when a provider is first connected. */
export declare const INITIAL_BACKFILL_DAYS = 30;
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
export declare const STORED_BODY_EXCERPT_CHARS = 2000;
/** Call transcripts are the evidence for a call summary, so they are kept longer. */
export declare const STORED_TRANSCRIPT_EXCERPT_CHARS = 8000;
export declare function excerpt(text: string | null | undefined, limit: number): string | null;
/** Default stage template for the Sales motion (FR-PIPE-02). */
export declare const DEFAULT_SALES_STAGES: readonly [{
    readonly name: "New Lead";
    readonly winProbability: 0.1;
}, {
    readonly name: "Contacted";
    readonly winProbability: 0.2;
}, {
    readonly name: "Qualified";
    readonly winProbability: 0.4;
}, {
    readonly name: "Proposal";
    readonly winProbability: 0.65;
}, {
    readonly name: "Won";
    readonly winProbability: 1;
    readonly isWonStage: true;
}, {
    readonly name: "Lost";
    readonly winProbability: 0;
    readonly isLostStage: true;
}];
/** Default stage template for the Agency motion — same spine, services vocabulary. */
export declare const DEFAULT_AGENCY_STAGES: readonly [{
    readonly name: "Enquiry";
    readonly winProbability: 0.1;
}, {
    readonly name: "Discovery";
    readonly winProbability: 0.25;
}, {
    readonly name: "Scoping";
    readonly winProbability: 0.45;
}, {
    readonly name: "Proposal Sent";
    readonly winProbability: 0.7;
}, {
    readonly name: "Won";
    readonly winProbability: 1;
    readonly isWonStage: true;
}, {
    readonly name: "Lost";
    readonly winProbability: 0;
    readonly isLostStage: true;
}];
/**
 * Free-mail and consumer domains never map to a Company. Without this, every
 * personal address would mint a "gmail.com" account.
 */
export declare const CONSUMER_EMAIL_DOMAINS: Set<string>;
/**
 * Local-parts that indicate machine senders. A newsletter from a known
 * customer's domain must not generate a new-contact proposal, so this filter
 * runs before the matching engine (Epic A edge cases).
 */
export declare const AUTOMATED_LOCAL_PARTS: string[];
