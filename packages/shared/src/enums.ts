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
} as const;
export type RecordSource = (typeof RecordSource)[keyof typeof RecordSource];

/** Which motion a workspace runs. Drives pipeline template + Project visibility. */
export const WorkspaceMotion = {
  SALES: 'SALES',
  AGENCY: 'AGENCY',
  HYBRID: 'HYBRID',
} as const;
export type WorkspaceMotion = (typeof WorkspaceMotion)[keyof typeof WorkspaceMotion];

export const UserRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const DealStatus = {
  OPEN: 'OPEN',
  WON: 'WON',
  LOST: 'LOST',
} as const;
export type DealStatus = (typeof DealStatus)[keyof typeof DealStatus];

export const ActivityType = {
  EMAIL: 'EMAIL',
  CALL: 'CALL',
  MEETING: 'MEETING',
  NOTE: 'NOTE',
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const ActivityDirection = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
  INTERNAL: 'INTERNAL',
} as const;
export type ActivityDirection = (typeof ActivityDirection)[keyof typeof ActivityDirection];

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
} as const;
export type SummaryStatus = (typeof SummaryStatus)[keyof typeof SummaryStatus];

export const Sentiment = {
  POSITIVE: 'POSITIVE',
  NEUTRAL: 'NEUTRAL',
  NEGATIVE: 'NEGATIVE',
} as const;
export type Sentiment = (typeof Sentiment)[keyof typeof Sentiment];

/**
 * A call that rang out is not a conversation. Keeping these distinct stops the
 * pipeline from reading as healthier than it is (Epic C edge cases).
 */
export const CallOutcome = {
  CONNECTED: 'CONNECTED',
  ATTEMPTED_NO_CONNECT: 'ATTEMPTED_NO_CONNECT',
  VOICEMAIL: 'VOICEMAIL',
  FAILED: 'FAILED',
} as const;
export type CallOutcome = (typeof CallOutcome)[keyof typeof CallOutcome];

/** Entities an Activity or a custom field can attach to. */
export const EntityType = {
  CONTACT: 'CONTACT',
  COMPANY: 'COMPANY',
  DEAL: 'DEAL',
  PROJECT: 'PROJECT',
  TASK: 'TASK',
} as const;
export type EntityType = (typeof EntityType)[keyof typeof EntityType];

export const AgentActionType = {
  CREATE_CONTACT: 'CREATE_CONTACT',
  UPDATE_CONTACT: 'UPDATE_CONTACT',
  CREATE_COMPANY: 'CREATE_COMPANY',
  CHANGE_DEAL_STAGE: 'CHANGE_DEAL_STAGE',
  UPDATE_DEAL: 'UPDATE_DEAL',
  CREATE_TASK: 'CREATE_TASK',
  LINK_CONTACT_TO_DEAL: 'LINK_CONTACT_TO_DEAL',
} as const;
export type AgentActionType = (typeof AgentActionType)[keyof typeof AgentActionType];

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
} as const;
export type AgentActionStatus = (typeof AgentActionStatus)[keyof typeof AgentActionStatus];

/** Confidence tier a proposal landed in. LOW proposals are never persisted. */
export const ConfidenceTier = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
} as const;
export type ConfidenceTier = (typeof ConfidenceTier)[keyof typeof ConfidenceTier];

export const IntegrationProvider = {
  GOOGLE: 'GOOGLE',
  MICROSOFT: 'MICROSOFT',
  SLACK: 'SLACK',
  TELEPHONY: 'TELEPHONY',
  ESIGN: 'ESIGN',
} as const;
export type IntegrationProvider =
  (typeof IntegrationProvider)[keyof typeof IntegrationProvider];

/**
 * `ERROR` is transient and retried with backoff; `REAUTH_REQUIRED` needs the
 * user to act and must surface a specific prompt, not a generic sync error.
 */
export const ConnectionStatus = {
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
  REAUTH_REQUIRED: 'REAUTH_REQUIRED',
  DISCONNECTED: 'DISCONNECTED',
} as const;
export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

export const ProjectStatus = {
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const TaskStatus = {
  OPEN: 'OPEN',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const ExclusionKind = {
  SENDER: 'SENDER',
  DOMAIN: 'DOMAIN',
  THREAD: 'THREAD',
} as const;
export type ExclusionKind = (typeof ExclusionKind)[keyof typeof ExclusionKind];

export const CustomFieldType = {
  TEXT: 'TEXT',
  NUMBER: 'NUMBER',
  DATE: 'DATE',
  BOOLEAN: 'BOOLEAN',
  SELECT: 'SELECT',
} as const;
export type CustomFieldType = (typeof CustomFieldType)[keyof typeof CustomFieldType];

export const ActorType = {
  HUMAN: 'HUMAN',
  AGENT: 'AGENT',
  SYSTEM: 'SYSTEM',
} as const;
export type ActorType = (typeof ActorType)[keyof typeof ActorType];

export const ExportStatus = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  READY: 'READY',
  FAILED: 'FAILED',
} as const;
export type ExportStatus = (typeof ExportStatus)[keyof typeof ExportStatus];

export const NotificationType = {
  DEAL_STALLING: 'DEAL_STALLING',
  AGENT_ACTION_PENDING: 'AGENT_ACTION_PENDING',
  NEW_LEAD: 'NEW_LEAD',
  CONNECTION_REAUTH: 'CONNECTION_REAUTH',
  DEAL_WON: 'DEAL_WON',
  PROJECT_REVIEW: 'PROJECT_REVIEW',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** Consent regime for call recording, resolved from the dialled number. */
export const ConsentRegime = {
  ONE_PARTY: 'ONE_PARTY',
  TWO_PARTY: 'TWO_PARTY',
  UNKNOWN: 'UNKNOWN',
} as const;
export type ConsentRegime = (typeof ConsentRegime)[keyof typeof ConsentRegime];
