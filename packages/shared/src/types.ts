import type {
  ActivityDirection,
  ActivityType,
  AgentActionStatus,
  AgentActionType,
  CallOutcome,
  ConfidenceTier,
  ConnectionStatus,
  ConsentRegime,
  CustomFieldType,
  DealStatus,
  EntityType,
  ExportStatus,
  IntegrationProvider,
  NotificationType,
  ProjectStatus,
  RecordSource,
  Sentiment,
  SummaryStatus,
  TaskStatus,
  UserRole,
  WorkspaceMotion,
} from './enums.js';

/** A field value paired with where it came from, so the UI can always show provenance (FR-DATA-02). */
export interface Sourced<T> {
  value: T;
  source: RecordSource;
}

export interface OrganizationDTO {
  id: string;
  name: string;
  motion: WorkspaceMotion;
  showProjectsUi: boolean;
  stallingThresholdDays: number;
  agentHighThreshold: number;
  agentMediumThreshold: number;
  planName: string;
  seatCount: number;
  pricePerSeatCents: number;
  createdAt: string;
}

export interface UserDTO {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  teamId: string | null;
  createdAt: string;
}

export interface CompanyDTO {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  source: RecordSource;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ContactDTO {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  title: string | null;
  companyId: string | null;
  company?: Pick<CompanyDTO, 'id' | 'name' | 'domain'> | null;
  source: RecordSource;
  excluded: boolean;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface StageDTO {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  winProbability: number;
  isWonStage: boolean;
  isLostStage: boolean;
}

export interface PipelineDTO {
  id: string;
  name: string;
  isDefault: boolean;
  stages: StageDTO[];
}

export interface DealContactDTO {
  contactId: string;
  role: string | null;
  contact: Pick<ContactDTO, 'id' | 'fullName' | 'email' | 'title'>;
}

export interface DealDTO {
  id: string;
  name: string;
  pipelineId: string;
  stageId: string;
  /** Stored separately from stageId so "human or agent?" is answerable directly. */
  stageSource: RecordSource;
  status: DealStatus;
  valueCents: number | null;
  currency: string;
  ownerId: string | null;
  companyId: string | null;
  company?: Pick<CompanyDTO, 'id' | 'name' | 'domain'> | null;
  contacts: DealContactDTO[];
  expectedCloseDate: string | null;
  /** Set when the deal crossed the workspace's inactivity threshold (FR-AC-06). */
  stallingSince: string | null;
  lastActivityAt: string | null;
  convertedProjectId: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  source: RecordSource;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityParticipantDTO {
  contactId: string;
  fullName: string;
  email: string;
}

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  direction: ActivityDirection;
  subject: string | null;
  body: string | null;
  occurredAt: string;
  durationSeconds: number | null;
  callOutcome: CallOutcome | null;
  recordingUrl: string | null;
  transcript: string | null;
  /** Null whenever summarization has not succeeded — never a fabricated value. */
  aiSummary: string | null;
  sentiment: Sentiment | null;
  /** Explicitly nullable: "no suggestion" is representable (FR-AC-03). */
  nextStep: string | null;
  summaryStatus: SummaryStatus;
  source: RecordSource;
  participants: ActivityParticipantDTO[];
  createdAt: string;
}

export interface AgentActionDTO {
  id: string;
  type: AgentActionType;
  status: AgentActionStatus;
  targetEntityType: EntityType;
  targetEntityId: string | null;
  proposedPayload: Record<string, unknown>;
  /** What was actually written on confirm — differs when the user corrected it. */
  appliedPayload: Record<string, unknown> | null;
  confidenceScore: number;
  tier: ConfidenceTier;
  rationale: string | null;
  sourceActivityId: string | null;
  sourceActivity?: Pick<ActivityDTO, 'id' | 'type' | 'subject' | 'occurredAt'> | null;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface MilestoneDTO {
  id: string;
  projectId: string;
  title: string;
  ownerId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  order: number;
}

export interface ProjectDTO {
  id: string;
  name: string;
  status: ProjectStatus;
  companyId: string | null;
  company?: Pick<CompanyDTO, 'id' | 'name' | 'domain'> | null;
  ownerId: string | null;
  originatingDealId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  milestones: MilestoneDTO[];
  contacts: DealContactDTO[];
  customFields: Record<string, unknown>;
  createdAt: string;
}

export interface TaskDTO {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  ownerId: string | null;
  status: TaskStatus;
  source: RecordSource;
  entityType: EntityType | null;
  entityId: string | null;
  createdAt: string;
}

export interface IntegrationConnectionDTO {
  id: string;
  provider: IntegrationProvider;
  status: ConnectionStatus;
  accountEmail: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  /** Seconds until the next poll; grows while a connection is failing. */
  backoffSeconds: number;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entityType: EntityType | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CustomFieldDefDTO {
  id: string;
  entityType: EntityType;
  key: string;
  label: string;
  type: CustomFieldType;
  options: string[];
  archivedAt: string | null;
}

export interface AuditLogDTO {
  id: string;
  actorType: string;
  actorId: string | null;
  actorName: string | null;
  entityType: EntityType;
  entityId: string;
  field: string;
  priorValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface ExportJobDTO {
  id: string;
  status: ExportStatus;
  downloadUrl: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface DashboardDTO {
  pipelineValueByStage: { stageId: string; stageName: string; count: number; valueCents: number }[];
  wonCount: number;
  lostCount: number;
  wonValueCents: number;
  /**
   * Share of open deals with captured activity inside the threshold window.
   * Surfaced as a first-class metric, not buried in an admin view (FR-REPORT-04).
   */
  captureCoverage: { totalOpenDeals: number; withRecentActivity: number; percentage: number };
  stallingDeals: number;
  pendingAgentActions: number;
  activitiesLast30Days: number;
  autoCapturedShare: number;
}

export interface ProjectReportDTO {
  activeProjects: number;
  averageDaysToDelivery: number | null;
  loadByOwner: { ownerId: string | null; ownerName: string; activeProjects: number }[];
}

export interface SearchResultDTO {
  entityType: EntityType;
  id: string;
  title: string;
  subtitle: string | null;
  score: number;
}

export interface CallConsentInfo {
  regime: ConsentRegime;
  requiresPrompt: boolean;
  region: string | null;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
