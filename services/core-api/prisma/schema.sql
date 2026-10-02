-- ---------------------------------------------------------------------------
-- Continuum CRM — PostgreSQL schema
--
-- Companion document to the PRD (Part Five, §24 / Appendix B). Generated from
-- the Prisma schema in services/core-api/prisma/schema.prisma, which is the
-- source of truth — regenerate rather than hand-editing:
--
--   npm run db:sql
--
-- Validated against PostgreSQL 16.
--
-- Two properties are load-bearing and must survive any future change:
--
--   1. Provenance is first-class. Every field the agent can infer carries a
--      `source`; Deal."stageSource" is stored separately from "stageId" so the
--      UI can always answer "human or agent?" without audit-log archaeology.
--
--   2. "Activity" and "AgentAction" are separate structured objects. An
--      Activity records what happened; an AgentAction records what the AI
--      proposed to do about it.
--
-- Row-level security policies ship separately in row-level-security.sql and are
-- deliberately not applied by default — see that file for the rationale and the
-- enable procedure.
-- ---------------------------------------------------------------------------

-- ===== migration: 20260803185750_init =====
-- CreateEnum
CREATE TYPE "RecordSource" AS ENUM ('HUMAN', 'AGENT_INFERRED', 'IMPORTED', 'ENRICHED');

-- CreateEnum
CREATE TYPE "WorkspaceMotion" AS ENUM ('SALES', 'AGENCY', 'HYBRID');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'MEMBER');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('EMAIL', 'CALL', 'MEETING', 'NOTE');

-- CreateEnum
CREATE TYPE "ActivityDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "SummaryStatus" AS ENUM ('PENDING', 'DONE', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('CONNECTED', 'ATTEMPTED_NO_CONNECT', 'VOICEMAIL', 'FAILED');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('CONTACT', 'COMPANY', 'DEAL', 'PROJECT', 'TASK');

-- CreateEnum
CREATE TYPE "AgentActionType" AS ENUM ('CREATE_CONTACT', 'UPDATE_CONTACT', 'CREATE_COMPANY', 'CHANGE_DEAL_STAGE', 'UPDATE_DEAL', 'CREATE_TASK', 'LINK_CONTACT_TO_DEAL');

-- CreateEnum
CREATE TYPE "AgentActionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'AUTO_APPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConfidenceTier" AS ENUM ('HIGH', 'MEDIUM');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GOOGLE', 'MICROSOFT', 'SLACK', 'TELEPHONY', 'ESIGN');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'ERROR', 'REAUTH_REQUIRED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExclusionKind" AS ENUM ('SENDER', 'DOMAIN', 'THREAD');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('HUMAN', 'AGENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('QUEUED', 'RUNNING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEAL_STALLING', 'AGENT_ACTION_PENDING', 'NEW_LEAD', 'CONNECTION_REAUTH', 'DEAL_WON', 'PROJECT_REVIEW');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "motion" "WorkspaceMotion" NOT NULL DEFAULT 'SALES',
    "showProjectsUi" BOOLEAN NOT NULL DEFAULT false,
    "stallingThresholdDays" INTEGER NOT NULL DEFAULT 5,
    "agentHighThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "agentMediumThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "planName" TEXT NOT NULL DEFAULT 'Team',
    "seatCount" INTEGER NOT NULL DEFAULT 1,
    "pricePerSeatCents" INTEGER NOT NULL DEFAULT 3900,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "winProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isWonStage" BOOLEAN NOT NULL DEFAULT false,
    "isLostStage" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "website" TEXT,
    "source" "RecordSource" NOT NULL DEFAULT 'HUMAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "source" "RecordSource" NOT NULL DEFAULT 'HUMAN',
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "stageSource" "RecordSource" NOT NULL DEFAULT 'HUMAN',
    "name" TEXT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
    "valueCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "ownerId" TEXT,
    "companyId" TEXT,
    "source" "RecordSource" NOT NULL DEFAULT 'HUMAN',
    "expectedCloseDate" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "stallingSince" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealContact" (
    "dealId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealContact_pkey" PRIMARY KEY ("dealId","contactId")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "direction" "ActivityDirection" NOT NULL DEFAULT 'INBOUND',
    "subject" TEXT,
    "body" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "source" "RecordSource" NOT NULL DEFAULT 'HUMAN',
    "externalRef" TEXT,
    "connectionId" TEXT,
    "threadRef" TEXT,
    "durationSeconds" INTEGER,
    "callOutcome" "CallOutcome",
    "recordingUrl" TEXT,
    "transcript" TEXT,
    "externalCallId" TEXT,
    "aiSummary" TEXT,
    "sentiment" "Sentiment",
    "nextStep" TEXT,
    "summaryStatus" "SummaryStatus" NOT NULL DEFAULT 'PENDING',
    "summaryError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityParticipant" (
    "activityId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,

    CONSTRAINT "ActivityParticipant_pkey" PRIMARY KEY ("activityId","contactId")
);

-- CreateTable
CREATE TABLE "ActivityLink" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ActivityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedMessage" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalRef" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentAction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "AgentActionType" NOT NULL,
    "status" "AgentActionStatus" NOT NULL DEFAULT 'PENDING',
    "targetEntityType" "EntityType" NOT NULL,
    "targetEntityId" TEXT,
    "proposedPayload" JSONB NOT NULL,
    "appliedPayload" JSONB,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "tier" "ConfidenceTier" NOT NULL,
    "rationale" TEXT,
    "sourceActivityId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCorrection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyId" TEXT,
    "actionType" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "originalValue" TEXT,
    "correctedValue" TEXT,
    "correctedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "companyId" TEXT,
    "ownerId" TEXT,
    "originatingDealId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectContact" (
    "projectId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "ProjectContact_pkey" PRIMARY KEY ("projectId","contactId")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "ownerId" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "source" "RecordSource" NOT NULL DEFAULT 'HUMAN',
    "entityType" "EntityType",
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
    "accountEmail" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "syncCursor" TEXT,
    "calendarCursor" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "nextPollAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "backoffSeconds" INTEGER NOT NULL DEFAULT 60,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "backfillCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaptureExclusion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT,
    "kind" "ExclusionKind" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaptureExclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "signerContactId" TEXT,
    "externalRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDef" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "CustomFieldType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomFieldDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" TEXT NOT NULL,
    "defId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tagging" (
    "tagId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,

    CONSTRAINT "Tagging_pkey" PRIMARY KEY ("tagId","entityType","entityId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "entityType" "EntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "priorValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldPermission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "field" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canWrite" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FieldPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "entityType" "EntityType",
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedById" TEXT,
    "status" "ExportStatus" NOT NULL DEFAULT 'QUEUED',
    "filePath" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_teamId_idx" ON "User"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "User_organizationId_email_key" ON "User"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Pipeline_organizationId_idx" ON "Pipeline"("organizationId");

-- CreateIndex
CREATE INDEX "Stage_pipelineId_idx" ON "Stage"("pipelineId");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_pipelineId_order_key" ON "Stage"("pipelineId", "order");

-- CreateIndex
CREATE INDEX "Company_organizationId_idx" ON "Company"("organizationId");

-- CreateIndex
CREATE INDEX "Company_organizationId_name_idx" ON "Company"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_organizationId_domain_key" ON "Company"("organizationId", "domain");

-- CreateIndex
CREATE INDEX "Contact_organizationId_idx" ON "Contact"("organizationId");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_organizationId_email_key" ON "Contact"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Deal_organizationId_idx" ON "Deal"("organizationId");

-- CreateIndex
CREATE INDEX "Deal_organizationId_status_idx" ON "Deal"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Deal_stageId_idx" ON "Deal"("stageId");

-- CreateIndex
CREATE INDEX "Deal_companyId_idx" ON "Deal"("companyId");

-- CreateIndex
CREATE INDEX "Deal_ownerId_idx" ON "Deal"("ownerId");

-- CreateIndex
CREATE INDEX "DealContact_contactId_idx" ON "DealContact"("contactId");

-- CreateIndex
CREATE INDEX "Activity_organizationId_occurredAt_idx" ON "Activity"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_organizationId_summaryStatus_idx" ON "Activity"("organizationId", "summaryStatus");

-- CreateIndex
CREATE INDEX "Activity_threadRef_idx" ON "Activity"("threadRef");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_connectionId_externalRef_key" ON "Activity"("connectionId", "externalRef");

-- CreateIndex
CREATE INDEX "ActivityParticipant_contactId_idx" ON "ActivityParticipant"("contactId");

-- CreateIndex
CREATE INDEX "ActivityLink_entityType_entityId_idx" ON "ActivityLink"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityLink_activityId_entityType_entityId_key" ON "ActivityLink"("activityId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ProcessedMessage_connectionId_idx" ON "ProcessedMessage"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedMessage_connectionId_externalRef_key" ON "ProcessedMessage"("connectionId", "externalRef");

-- CreateIndex
CREATE INDEX "AgentAction_organizationId_status_idx" ON "AgentAction"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AgentAction_organizationId_createdAt_idx" ON "AgentAction"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentAction_targetEntityType_targetEntityId_idx" ON "AgentAction"("targetEntityType", "targetEntityId");

-- CreateIndex
CREATE INDEX "AgentCorrection_organizationId_companyId_idx" ON "AgentCorrection"("organizationId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_originatingDealId_key" ON "Project"("originatingDealId");

-- CreateIndex
CREATE INDEX "Project_organizationId_status_idx" ON "Project"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "ProjectContact_contactId_idx" ON "ProjectContact"("contactId");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "Task_organizationId_status_idx" ON "Task"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Task_ownerId_idx" ON "Task"("ownerId");

-- CreateIndex
CREATE INDEX "IntegrationConnection_organizationId_idx" ON "IntegrationConnection"("organizationId");

-- CreateIndex
CREATE INDEX "IntegrationConnection_status_nextPollAt_idx" ON "IntegrationConnection"("status", "nextPollAt");

-- CreateIndex
CREATE INDEX "CaptureExclusion_organizationId_idx" ON "CaptureExclusion"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CaptureExclusion_organizationId_connectionId_kind_value_key" ON "CaptureExclusion"("organizationId", "connectionId", "kind", "value");

-- CreateIndex
CREATE INDEX "Proposal_organizationId_idx" ON "Proposal"("organizationId");

-- CreateIndex
CREATE INDEX "Proposal_dealId_idx" ON "Proposal"("dealId");

-- CreateIndex
CREATE INDEX "CustomFieldDef_organizationId_idx" ON "CustomFieldDef"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDef_organizationId_entityType_key_key" ON "CustomFieldDef"("organizationId", "entityType", "key");

-- CreateIndex
CREATE INDEX "CustomFieldValue_entityId_idx" ON "CustomFieldValue"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_defId_entityId_key" ON "CustomFieldValue"("defId", "entityId");

-- CreateIndex
CREATE INDEX "Tag_organizationId_idx" ON "Tag"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_organizationId_name_key" ON "Tag"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Tagging_entityType_entityId_idx" ON "Tagging"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldPermission_organizationId_entityType_field_role_key" ON "FieldPermission"("organizationId", "entityType", "field", "role");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_organizationId_idx" ON "ApiToken"("organizationId");

-- CreateIndex
CREATE INDEX "ExportJob_organizationId_idx" ON "ExportJob"("organizationId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealContact" ADD CONSTRAINT "DealContact_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealContact" ADD CONSTRAINT "DealContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityParticipant" ADD CONSTRAINT "ActivityParticipant_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityParticipant" ADD CONSTRAINT "ActivityParticipant_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLink" ADD CONSTRAINT "ActivityLink_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedMessage" ADD CONSTRAINT "ProcessedMessage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_sourceActivityId_fkey" FOREIGN KEY ("sourceActivityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentAction" ADD CONSTRAINT "AgentAction_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCorrection" ADD CONSTRAINT "AgentCorrection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCorrection" ADD CONSTRAINT "AgentCorrection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCorrection" ADD CONSTRAINT "AgentCorrection_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_originatingDealId_fkey" FOREIGN KEY ("originatingDealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContact" ADD CONSTRAINT "ProjectContact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContact" ADD CONSTRAINT "ProjectContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureExclusion" ADD CONSTRAINT "CaptureExclusion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaptureExclusion" ADD CONSTRAINT "CaptureExclusion_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDef" ADD CONSTRAINT "CustomFieldDef_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_defId_fkey" FOREIGN KEY ("defId") REFERENCES "CustomFieldDef"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tagging" ADD CONSTRAINT "Tagging_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldPermission" ADD CONSTRAINT "FieldPermission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== migration: 20260804062452_analytics_guardrails_envelope_encryption =====
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "autoApplyOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "encryptedDataKey" TEXT;

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_organizationId_name_createdAt_idx" ON "AnalyticsEvent"("organizationId", "name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_organizationId_threadRef_occurredAt_idx" ON "Activity"("organizationId", "threadRef", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_externalCallId_idx" ON "Activity"("externalCallId");

-- CreateIndex
CREATE INDEX "ActivityLink_activityId_idx" ON "ActivityLink"("activityId");

-- CreateIndex
CREATE INDEX "Deal_organizationId_pipelineId_status_updatedAt_idx" ON "Deal"("organizationId", "pipelineId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Deal_organizationId_status_lastActivityAt_idx" ON "Deal"("organizationId", "status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Deal_organizationId_stallingSince_idx" ON "Deal"("organizationId", "stallingSince");

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== migration: 20260804140000_qc_fixes_dedupe_transient_body =====
-- Transient full message text, held only until the enrichment worker consumes
-- it. `body` keeps a permanent excerpt (data minimization); this column exists
-- so summarization can run off the ingestion path without losing long threads.
ALTER TABLE "Activity" ADD COLUMN     "rawBodyTransient" TEXT;

-- Notification deduplication key. Previously smuggled through `body`, which
-- meant any notification that also carried human-readable text silently lost
-- its deduplication.
ALTER TABLE "Notification" ADD COLUMN     "dedupeKey" TEXT;

-- The enrichment worker claims pending summaries across all tenants, oldest
-- first.
CREATE INDEX "Activity_summaryStatus_createdAt_idx" ON "Activity"("summaryStatus", "createdAt");

-- Enforces deduplication in the database rather than via a read-then-write
-- check, which two concurrent workers would both pass. NULLs stay distinct in
-- Postgres, so notifications without a dedupe key are unaffected.
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");
