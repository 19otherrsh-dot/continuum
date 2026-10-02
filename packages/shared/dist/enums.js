/**
 * Enumerations shared between the API and the web app.
 *
 * These mirror the Prisma enums exactly. They are duplicated here rather than
 * imported from the generated client so the web app never has to depend on
 * Prisma, and so the values are usable in a browser bundle.
 */
/**
 * Provenance of a field value. Present on every object that the agent can
 * infer, from the first migration — retrofitting this distinction later would
 * require backfilling every historical record (PRD Part Five, §24).
 */
export const RecordSource = {
    HUMAN: 'HUMAN',
    AGENT_INFERRED: 'AGENT_INFERRED',
    IMPORTED: 'IMPORTED',
    ENRICHED: 'ENRICHED',
};
/** Which motion a workspace runs. Drives pipeline template + Project visibility. */
export const WorkspaceMotion = {
    SALES: 'SALES',
    AGENCY: 'AGENCY',
    HYBRID: 'HYBRID',
};
export const UserRole = {
    ADMIN: 'ADMIN',
    MANAGER: 'MANAGER',
    MEMBER: 'MEMBER',
};
export const DealStatus = {
    OPEN: 'OPEN',
    WON: 'WON',
    LOST: 'LOST',
};
export const ActivityType = {
    EMAIL: 'EMAIL',
    CALL: 'CALL',
    MEETING: 'MEETING',
    NOTE: 'NOTE',
};
export const ActivityDirection = {
    INBOUND: 'INBOUND',
    OUTBOUND: 'OUTBOUND',
    INTERNAL: 'INTERNAL',
};
/**
 * Summarization is decoupled from the Activity write. An Activity is always
 * persisted with participants/timestamp/subject even when the AI step fails —
 * the product degrades to "a well-organized timeline", never to "a wrong
 * pipeline" (FR-AC-03).
 */
export const SummaryStatus = {
    PENDING: 'PENDING',
    DONE: 'DONE',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
};
export const Sentiment = {
    POSITIVE: 'POSITIVE',
    NEUTRAL: 'NEUTRAL',
    NEGATIVE: 'NEGATIVE',
};
/**
 * A call that rang out is not a conversation. Keeping these distinct stops the
 * pipeline from reading as healthier than it is (Epic C edge cases).
 */
export const CallOutcome = {
    CONNECTED: 'CONNECTED',
    ATTEMPTED_NO_CONNECT: 'ATTEMPTED_NO_CONNECT',
    VOICEMAIL: 'VOICEMAIL',
    FAILED: 'FAILED',
};
/** Entities an Activity or a custom field can attach to. */
export const EntityType = {
    CONTACT: 'CONTACT',
    COMPANY: 'COMPANY',
    DEAL: 'DEAL',
    PROJECT: 'PROJECT',
    TASK: 'TASK',
};
export const AgentActionType = {
    CREATE_CONTACT: 'CREATE_CONTACT',
    UPDATE_CONTACT: 'UPDATE_CONTACT',
    CREATE_COMPANY: 'CREATE_COMPANY',
    CHANGE_DEAL_STAGE: 'CHANGE_DEAL_STAGE',
    UPDATE_DEAL: 'UPDATE_DEAL',
    CREATE_TASK: 'CREATE_TASK',
    LINK_CONTACT_TO_DEAL: 'LINK_CONTACT_TO_DEAL',
};
/**
 * `AUTO_APPLIED` exists in the model but is unreachable at V1 — every proposal
 * requires human confirmation. It is reserved for the Phase 2/3 limited
 * autonomy model (PRD §25.5) so enabling it needs no migration.
 */
export const AgentActionStatus = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    REJECTED: 'REJECTED',
    AUTO_APPLIED: 'AUTO_APPLIED',
    FAILED: 'FAILED',
};
/** Confidence tier a proposal landed in. LOW proposals are never persisted. */
export const ConfidenceTier = {
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
};
export const IntegrationProvider = {
    GOOGLE: 'GOOGLE',
    MICROSOFT: 'MICROSOFT',
    SLACK: 'SLACK',
    TELEPHONY: 'TELEPHONY',
    ESIGN: 'ESIGN',
};
/**
 * `ERROR` is transient and retried with backoff; `REAUTH_REQUIRED` needs the
 * user to act and must surface a specific prompt, not a generic sync error.
 */
export const ConnectionStatus = {
    CONNECTED: 'CONNECTED',
    ERROR: 'ERROR',
    REAUTH_REQUIRED: 'REAUTH_REQUIRED',
    DISCONNECTED: 'DISCONNECTED',
};
export const ProjectStatus = {
    ACTIVE: 'ACTIVE',
    ON_HOLD: 'ON_HOLD',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};
export const TaskStatus = {
    OPEN: 'OPEN',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
};
export const ExclusionKind = {
    SENDER: 'SENDER',
    DOMAIN: 'DOMAIN',
    THREAD: 'THREAD',
};
export const CustomFieldType = {
    TEXT: 'TEXT',
    NUMBER: 'NUMBER',
    DATE: 'DATE',
    BOOLEAN: 'BOOLEAN',
    SELECT: 'SELECT',
};
export const ActorType = {
    HUMAN: 'HUMAN',
    AGENT: 'AGENT',
    SYSTEM: 'SYSTEM',
};
export const ExportStatus = {
    QUEUED: 'QUEUED',
    RUNNING: 'RUNNING',
    READY: 'READY',
    FAILED: 'FAILED',
};
export const NotificationType = {
    DEAL_STALLING: 'DEAL_STALLING',
    AGENT_ACTION_PENDING: 'AGENT_ACTION_PENDING',
    NEW_LEAD: 'NEW_LEAD',
    CONNECTION_REAUTH: 'CONNECTION_REAUTH',
    DEAL_WON: 'DEAL_WON',
    PROJECT_REVIEW: 'PROJECT_REVIEW',
};
/** Consent regime for call recording, resolved from the dialled number. */
export const ConsentRegime = {
    ONE_PARTY: 'ONE_PARTY',
    TWO_PARTY: 'TWO_PARTY',
    UNKNOWN: 'UNKNOWN',
};
