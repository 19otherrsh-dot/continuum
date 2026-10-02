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
export declare const RecordSource: {
    readonly HUMAN: "HUMAN";
    readonly AGENT_INFERRED: "AGENT_INFERRED";
    readonly IMPORTED: "IMPORTED";
    readonly ENRICHED: "ENRICHED";
};
export type RecordSource = (typeof RecordSource)[keyof typeof RecordSource];
/** Which motion a workspace runs. Drives pipeline template + Project visibility. */
export declare const WorkspaceMotion: {
    readonly SALES: "SALES";
    readonly AGENCY: "AGENCY";
    readonly HYBRID: "HYBRID";
};
export type WorkspaceMotion = (typeof WorkspaceMotion)[keyof typeof WorkspaceMotion];
export declare const UserRole: {
    readonly ADMIN: "ADMIN";
    readonly MANAGER: "MANAGER";
    readonly MEMBER: "MEMBER";
};
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export declare const DealStatus: {
    readonly OPEN: "OPEN";
    readonly WON: "WON";
    readonly LOST: "LOST";
};
export type DealStatus = (typeof DealStatus)[keyof typeof DealStatus];
export declare const ActivityType: {
    readonly EMAIL: "EMAIL";
    readonly CALL: "CALL";
    readonly MEETING: "MEETING";
    readonly NOTE: "NOTE";
};
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];
export declare const ActivityDirection: {
    readonly INBOUND: "INBOUND";
    readonly OUTBOUND: "OUTBOUND";
    readonly INTERNAL: "INTERNAL";
};
export type ActivityDirection = (typeof ActivityDirection)[keyof typeof ActivityDirection];
/**
 * Summarization is decoupled from the Activity write. An Activity is always
 * persisted with participants/timestamp/subject even when the AI step fails —
 * the product degrades to "a well-organized timeline", never to "a wrong
 * pipeline" (FR-AC-03).
 */
export declare const SummaryStatus: {
    readonly PENDING: "PENDING";
    readonly DONE: "DONE";
    readonly FAILED: "FAILED";
    readonly SKIPPED: "SKIPPED";
};
export type SummaryStatus = (typeof SummaryStatus)[keyof typeof SummaryStatus];
export declare const Sentiment: {
    readonly POSITIVE: "POSITIVE";
    readonly NEUTRAL: "NEUTRAL";
    readonly NEGATIVE: "NEGATIVE";
};
export type Sentiment = (typeof Sentiment)[keyof typeof Sentiment];
/**
 * A call that rang out is not a conversation. Keeping these distinct stops the
 * pipeline from reading as healthier than it is (Epic C edge cases).
 */
export declare const CallOutcome: {
    readonly CONNECTED: "CONNECTED";
    readonly ATTEMPTED_NO_CONNECT: "ATTEMPTED_NO_CONNECT";
    readonly VOICEMAIL: "VOICEMAIL";
    readonly FAILED: "FAILED";
};
export type CallOutcome = (typeof CallOutcome)[keyof typeof CallOutcome];
/** Entities an Activity or a custom field can attach to. */
export declare const EntityType: {
    readonly CONTACT: "CONTACT";
    readonly COMPANY: "COMPANY";
    readonly DEAL: "DEAL";
    readonly PROJECT: "PROJECT";
    readonly TASK: "TASK";
};
export type EntityType = (typeof EntityType)[keyof typeof EntityType];
export declare const AgentActionType: {
    readonly CREATE_CONTACT: "CREATE_CONTACT";
    readonly UPDATE_CONTACT: "UPDATE_CONTACT";
    readonly CREATE_COMPANY: "CREATE_COMPANY";
    readonly CHANGE_DEAL_STAGE: "CHANGE_DEAL_STAGE";
    readonly UPDATE_DEAL: "UPDATE_DEAL";
    readonly CREATE_TASK: "CREATE_TASK";
    readonly LINK_CONTACT_TO_DEAL: "LINK_CONTACT_TO_DEAL";
};
export type AgentActionType = (typeof AgentActionType)[keyof typeof AgentActionType];
/**
 * `AUTO_APPLIED` exists in the model but is unreachable at V1 — every proposal
 * requires human confirmation. It is reserved for the Phase 2/3 limited
 * autonomy model (PRD §25.5) so enabling it needs no migration.
 */
export declare const AgentActionStatus: {
    readonly PENDING: "PENDING";
    readonly CONFIRMED: "CONFIRMED";
    readonly REJECTED: "REJECTED";
    readonly AUTO_APPLIED: "AUTO_APPLIED";
    readonly FAILED: "FAILED";
};
export type AgentActionStatus = (typeof AgentActionStatus)[keyof typeof AgentActionStatus];
/** Confidence tier a proposal landed in. LOW proposals are never persisted. */
export declare const ConfidenceTier: {
    readonly HIGH: "HIGH";
    readonly MEDIUM: "MEDIUM";
};
export type ConfidenceTier = (typeof ConfidenceTier)[keyof typeof ConfidenceTier];
export declare const IntegrationProvider: {
    readonly GOOGLE: "GOOGLE";
    readonly MICROSOFT: "MICROSOFT";
    readonly SLACK: "SLACK";
    readonly TELEPHONY: "TELEPHONY";
    readonly ESIGN: "ESIGN";
};
export type IntegrationProvider = (typeof IntegrationProvider)[keyof typeof IntegrationProvider];
/**
 * `ERROR` is transient and retried with backoff; `REAUTH_REQUIRED` needs the
 * user to act and must surface a specific prompt, not a generic sync error.
 */
export declare const ConnectionStatus: {
    readonly CONNECTED: "CONNECTED";
    readonly ERROR: "ERROR";
    readonly REAUTH_REQUIRED: "REAUTH_REQUIRED";
    readonly DISCONNECTED: "DISCONNECTED";
};
export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus];
export declare const ProjectStatus: {
    readonly ACTIVE: "ACTIVE";
    readonly ON_HOLD: "ON_HOLD";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELLED: "CANCELLED";
};
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];
export declare const TaskStatus: {
    readonly OPEN: "OPEN";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELLED: "CANCELLED";
};
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
export declare const ExclusionKind: {
    readonly SENDER: "SENDER";
    readonly DOMAIN: "DOMAIN";
    readonly THREAD: "THREAD";
};
export type ExclusionKind = (typeof ExclusionKind)[keyof typeof ExclusionKind];
export declare const CustomFieldType: {
    readonly TEXT: "TEXT";
    readonly NUMBER: "NUMBER";
    readonly DATE: "DATE";
    readonly BOOLEAN: "BOOLEAN";
    readonly SELECT: "SELECT";
};
export type CustomFieldType = (typeof CustomFieldType)[keyof typeof CustomFieldType];
export declare const ActorType: {
    readonly HUMAN: "HUMAN";
    readonly AGENT: "AGENT";
    readonly SYSTEM: "SYSTEM";
};
export type ActorType = (typeof ActorType)[keyof typeof ActorType];
export declare const ExportStatus: {
    readonly QUEUED: "QUEUED";
    readonly RUNNING: "RUNNING";
    readonly READY: "READY";
    readonly FAILED: "FAILED";
};
export type ExportStatus = (typeof ExportStatus)[keyof typeof ExportStatus];
export declare const NotificationType: {
    readonly DEAL_STALLING: "DEAL_STALLING";
    readonly AGENT_ACTION_PENDING: "AGENT_ACTION_PENDING";
    readonly NEW_LEAD: "NEW_LEAD";
    readonly CONNECTION_REAUTH: "CONNECTION_REAUTH";
    readonly DEAL_WON: "DEAL_WON";
    readonly PROJECT_REVIEW: "PROJECT_REVIEW";
};
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
/** Consent regime for call recording, resolved from the dialled number. */
export declare const ConsentRegime: {
    readonly ONE_PARTY: "ONE_PARTY";
    readonly TWO_PARTY: "TWO_PARTY";
    readonly UNKNOWN: "UNKNOWN";
};
export type ConsentRegime = (typeof ConsentRegime)[keyof typeof ConsentRegime];
