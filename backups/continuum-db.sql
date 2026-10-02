--
-- PostgreSQL database dump
--

\restrict CRwhEgkMzVPGTB0uxlLHAqXW8IWFfM34c5gGjY1C73GPNM5e1q8swg5pgok11BR

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_teamId_fkey";
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Team" DROP CONSTRAINT IF EXISTS "Team_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Task" DROP CONSTRAINT IF EXISTS "Task_ownerId_fkey";
ALTER TABLE IF EXISTS ONLY public."Task" DROP CONSTRAINT IF EXISTS "Task_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Tagging" DROP CONSTRAINT IF EXISTS "Tagging_tagId_fkey";
ALTER TABLE IF EXISTS ONLY public."Tag" DROP CONSTRAINT IF EXISTS "Tag_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Stage" DROP CONSTRAINT IF EXISTS "Stage_pipelineId_fkey";
ALTER TABLE IF EXISTS ONLY public."Proposal" DROP CONSTRAINT IF EXISTS "Proposal_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Proposal" DROP CONSTRAINT IF EXISTS "Proposal_dealId_fkey";
ALTER TABLE IF EXISTS ONLY public."Project" DROP CONSTRAINT IF EXISTS "Project_ownerId_fkey";
ALTER TABLE IF EXISTS ONLY public."Project" DROP CONSTRAINT IF EXISTS "Project_originatingDealId_fkey";
ALTER TABLE IF EXISTS ONLY public."Project" DROP CONSTRAINT IF EXISTS "Project_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Project" DROP CONSTRAINT IF EXISTS "Project_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."ProjectContact" DROP CONSTRAINT IF EXISTS "ProjectContact_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public."ProjectContact" DROP CONSTRAINT IF EXISTS "ProjectContact_contactId_fkey";
ALTER TABLE IF EXISTS ONLY public."ProcessedMessage" DROP CONSTRAINT IF EXISTS "ProcessedMessage_connectionId_fkey";
ALTER TABLE IF EXISTS ONLY public."Pipeline" DROP CONSTRAINT IF EXISTS "Pipeline_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Milestone" DROP CONSTRAINT IF EXISTS "Milestone_projectId_fkey";
ALTER TABLE IF EXISTS ONLY public."Milestone" DROP CONSTRAINT IF EXISTS "Milestone_ownerId_fkey";
ALTER TABLE IF EXISTS ONLY public."IntegrationConnection" DROP CONSTRAINT IF EXISTS "IntegrationConnection_userId_fkey";
ALTER TABLE IF EXISTS ONLY public."IntegrationConnection" DROP CONSTRAINT IF EXISTS "IntegrationConnection_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."FieldPermission" DROP CONSTRAINT IF EXISTS "FieldPermission_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."ExportJob" DROP CONSTRAINT IF EXISTS "ExportJob_requestedById_fkey";
ALTER TABLE IF EXISTS ONLY public."ExportJob" DROP CONSTRAINT IF EXISTS "ExportJob_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Deal" DROP CONSTRAINT IF EXISTS "Deal_stageId_fkey";
ALTER TABLE IF EXISTS ONLY public."Deal" DROP CONSTRAINT IF EXISTS "Deal_pipelineId_fkey";
ALTER TABLE IF EXISTS ONLY public."Deal" DROP CONSTRAINT IF EXISTS "Deal_ownerId_fkey";
ALTER TABLE IF EXISTS ONLY public."Deal" DROP CONSTRAINT IF EXISTS "Deal_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Deal" DROP CONSTRAINT IF EXISTS "Deal_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."DealContact" DROP CONSTRAINT IF EXISTS "DealContact_dealId_fkey";
ALTER TABLE IF EXISTS ONLY public."DealContact" DROP CONSTRAINT IF EXISTS "DealContact_contactId_fkey";
ALTER TABLE IF EXISTS ONLY public."CustomFieldValue" DROP CONSTRAINT IF EXISTS "CustomFieldValue_defId_fkey";
ALTER TABLE IF EXISTS ONLY public."CustomFieldDef" DROP CONSTRAINT IF EXISTS "CustomFieldDef_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Contact" DROP CONSTRAINT IF EXISTS "Contact_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Contact" DROP CONSTRAINT IF EXISTS "Contact_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."Company" DROP CONSTRAINT IF EXISTS "Company_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."CaptureExclusion" DROP CONSTRAINT IF EXISTS "CaptureExclusion_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."CaptureExclusion" DROP CONSTRAINT IF EXISTS "CaptureExclusion_connectionId_fkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."ApiToken" DROP CONSTRAINT IF EXISTS "ApiToken_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."AnalyticsEvent" DROP CONSTRAINT IF EXISTS "AnalyticsEvent_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."AgentCorrection" DROP CONSTRAINT IF EXISTS "AgentCorrection_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."AgentCorrection" DROP CONSTRAINT IF EXISTS "AgentCorrection_correctedById_fkey";
ALTER TABLE IF EXISTS ONLY public."AgentCorrection" DROP CONSTRAINT IF EXISTS "AgentCorrection_companyId_fkey";
ALTER TABLE IF EXISTS ONLY public."AgentAction" DROP CONSTRAINT IF EXISTS "AgentAction_sourceActivityId_fkey";
ALTER TABLE IF EXISTS ONLY public."AgentAction" DROP CONSTRAINT IF EXISTS "AgentAction_reviewedByUserId_fkey";
ALTER TABLE IF EXISTS ONLY public."AgentAction" DROP CONSTRAINT IF EXISTS "AgentAction_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Activity" DROP CONSTRAINT IF EXISTS "Activity_organizationId_fkey";
ALTER TABLE IF EXISTS ONLY public."Activity" DROP CONSTRAINT IF EXISTS "Activity_connectionId_fkey";
ALTER TABLE IF EXISTS ONLY public."ActivityParticipant" DROP CONSTRAINT IF EXISTS "ActivityParticipant_contactId_fkey";
ALTER TABLE IF EXISTS ONLY public."ActivityParticipant" DROP CONSTRAINT IF EXISTS "ActivityParticipant_activityId_fkey";
ALTER TABLE IF EXISTS ONLY public."ActivityLink" DROP CONSTRAINT IF EXISTS "ActivityLink_activityId_fkey";
DROP INDEX IF EXISTS public."User_teamId_idx";
DROP INDEX IF EXISTS public."User_organizationId_idx";
DROP INDEX IF EXISTS public."User_organizationId_email_key";
DROP INDEX IF EXISTS public."Team_organizationId_idx";
DROP INDEX IF EXISTS public."Task_ownerId_idx";
DROP INDEX IF EXISTS public."Task_organizationId_status_idx";
DROP INDEX IF EXISTS public."Tagging_entityType_entityId_idx";
DROP INDEX IF EXISTS public."Tag_organizationId_name_key";
DROP INDEX IF EXISTS public."Tag_organizationId_idx";
DROP INDEX IF EXISTS public."Stage_pipelineId_order_key";
DROP INDEX IF EXISTS public."Stage_pipelineId_idx";
DROP INDEX IF EXISTS public."Proposal_organizationId_idx";
DROP INDEX IF EXISTS public."Proposal_dealId_idx";
DROP INDEX IF EXISTS public."Project_ownerId_idx";
DROP INDEX IF EXISTS public."Project_originatingDealId_key";
DROP INDEX IF EXISTS public."Project_organizationId_status_idx";
DROP INDEX IF EXISTS public."Project_companyId_idx";
DROP INDEX IF EXISTS public."ProjectContact_contactId_idx";
DROP INDEX IF EXISTS public."ProcessedMessage_connectionId_idx";
DROP INDEX IF EXISTS public."ProcessedMessage_connectionId_externalRef_key";
DROP INDEX IF EXISTS public."Pipeline_organizationId_idx";
DROP INDEX IF EXISTS public."Notification_userId_readAt_idx";
DROP INDEX IF EXISTS public."Notification_userId_dedupeKey_key";
DROP INDEX IF EXISTS public."Milestone_projectId_idx";
DROP INDEX IF EXISTS public."IntegrationConnection_status_nextPollAt_idx";
DROP INDEX IF EXISTS public."IntegrationConnection_organizationId_idx";
DROP INDEX IF EXISTS public."FieldPermission_organizationId_entityType_field_role_key";
DROP INDEX IF EXISTS public."ExportJob_organizationId_idx";
DROP INDEX IF EXISTS public."Deal_stageId_idx";
DROP INDEX IF EXISTS public."Deal_ownerId_idx";
DROP INDEX IF EXISTS public."Deal_organizationId_status_lastActivityAt_idx";
DROP INDEX IF EXISTS public."Deal_organizationId_status_idx";
DROP INDEX IF EXISTS public."Deal_organizationId_stallingSince_idx";
DROP INDEX IF EXISTS public."Deal_organizationId_pipelineId_status_updatedAt_idx";
DROP INDEX IF EXISTS public."Deal_organizationId_idx";
DROP INDEX IF EXISTS public."Deal_companyId_idx";
DROP INDEX IF EXISTS public."DealContact_contactId_idx";
DROP INDEX IF EXISTS public."CustomFieldValue_entityId_idx";
DROP INDEX IF EXISTS public."CustomFieldValue_defId_entityId_key";
DROP INDEX IF EXISTS public."CustomFieldDef_organizationId_idx";
DROP INDEX IF EXISTS public."CustomFieldDef_organizationId_entityType_key_key";
DROP INDEX IF EXISTS public."Contact_organizationId_idx";
DROP INDEX IF EXISTS public."Contact_organizationId_email_key";
DROP INDEX IF EXISTS public."Contact_companyId_idx";
DROP INDEX IF EXISTS public."Company_organizationId_name_idx";
DROP INDEX IF EXISTS public."Company_organizationId_idx";
DROP INDEX IF EXISTS public."Company_organizationId_domain_key";
DROP INDEX IF EXISTS public."CaptureExclusion_organizationId_idx";
DROP INDEX IF EXISTS public."CaptureExclusion_organizationId_connectionId_kind_value_key";
DROP INDEX IF EXISTS public."AuditLog_organizationId_createdAt_idx";
DROP INDEX IF EXISTS public."AuditLog_entityType_entityId_idx";
DROP INDEX IF EXISTS public."ApiToken_tokenHash_key";
DROP INDEX IF EXISTS public."ApiToken_organizationId_idx";
DROP INDEX IF EXISTS public."AnalyticsEvent_organizationId_name_createdAt_idx";
DROP INDEX IF EXISTS public."AnalyticsEvent_name_createdAt_idx";
DROP INDEX IF EXISTS public."AgentCorrection_organizationId_companyId_idx";
DROP INDEX IF EXISTS public."AgentAction_targetEntityType_targetEntityId_idx";
DROP INDEX IF EXISTS public."AgentAction_organizationId_status_idx";
DROP INDEX IF EXISTS public."AgentAction_organizationId_createdAt_idx";
DROP INDEX IF EXISTS public."Activity_threadRef_idx";
DROP INDEX IF EXISTS public."Activity_summaryStatus_createdAt_idx";
DROP INDEX IF EXISTS public."Activity_organizationId_threadRef_occurredAt_idx";
DROP INDEX IF EXISTS public."Activity_organizationId_summaryStatus_idx";
DROP INDEX IF EXISTS public."Activity_organizationId_occurredAt_idx";
DROP INDEX IF EXISTS public."Activity_externalCallId_idx";
DROP INDEX IF EXISTS public."Activity_connectionId_externalRef_key";
DROP INDEX IF EXISTS public."ActivityParticipant_contactId_idx";
DROP INDEX IF EXISTS public."ActivityLink_entityType_entityId_idx";
DROP INDEX IF EXISTS public."ActivityLink_activityId_idx";
DROP INDEX IF EXISTS public."ActivityLink_activityId_entityType_entityId_key";
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."User" DROP CONSTRAINT IF EXISTS "User_pkey";
ALTER TABLE IF EXISTS ONLY public."Team" DROP CONSTRAINT IF EXISTS "Team_pkey";
ALTER TABLE IF EXISTS ONLY public."Task" DROP CONSTRAINT IF EXISTS "Task_pkey";
ALTER TABLE IF EXISTS ONLY public."Tagging" DROP CONSTRAINT IF EXISTS "Tagging_pkey";
ALTER TABLE IF EXISTS ONLY public."Tag" DROP CONSTRAINT IF EXISTS "Tag_pkey";
ALTER TABLE IF EXISTS ONLY public."Stage" DROP CONSTRAINT IF EXISTS "Stage_pkey";
ALTER TABLE IF EXISTS ONLY public."Proposal" DROP CONSTRAINT IF EXISTS "Proposal_pkey";
ALTER TABLE IF EXISTS ONLY public."Project" DROP CONSTRAINT IF EXISTS "Project_pkey";
ALTER TABLE IF EXISTS ONLY public."ProjectContact" DROP CONSTRAINT IF EXISTS "ProjectContact_pkey";
ALTER TABLE IF EXISTS ONLY public."ProcessedMessage" DROP CONSTRAINT IF EXISTS "ProcessedMessage_pkey";
ALTER TABLE IF EXISTS ONLY public."Pipeline" DROP CONSTRAINT IF EXISTS "Pipeline_pkey";
ALTER TABLE IF EXISTS ONLY public."Organization" DROP CONSTRAINT IF EXISTS "Organization_pkey";
ALTER TABLE IF EXISTS ONLY public."Notification" DROP CONSTRAINT IF EXISTS "Notification_pkey";
ALTER TABLE IF EXISTS ONLY public."Milestone" DROP CONSTRAINT IF EXISTS "Milestone_pkey";
ALTER TABLE IF EXISTS ONLY public."IntegrationConnection" DROP CONSTRAINT IF EXISTS "IntegrationConnection_pkey";
ALTER TABLE IF EXISTS ONLY public."FieldPermission" DROP CONSTRAINT IF EXISTS "FieldPermission_pkey";
ALTER TABLE IF EXISTS ONLY public."ExportJob" DROP CONSTRAINT IF EXISTS "ExportJob_pkey";
ALTER TABLE IF EXISTS ONLY public."Deal" DROP CONSTRAINT IF EXISTS "Deal_pkey";
ALTER TABLE IF EXISTS ONLY public."DealContact" DROP CONSTRAINT IF EXISTS "DealContact_pkey";
ALTER TABLE IF EXISTS ONLY public."CustomFieldValue" DROP CONSTRAINT IF EXISTS "CustomFieldValue_pkey";
ALTER TABLE IF EXISTS ONLY public."CustomFieldDef" DROP CONSTRAINT IF EXISTS "CustomFieldDef_pkey";
ALTER TABLE IF EXISTS ONLY public."Contact" DROP CONSTRAINT IF EXISTS "Contact_pkey";
ALTER TABLE IF EXISTS ONLY public."Company" DROP CONSTRAINT IF EXISTS "Company_pkey";
ALTER TABLE IF EXISTS ONLY public."CaptureExclusion" DROP CONSTRAINT IF EXISTS "CaptureExclusion_pkey";
ALTER TABLE IF EXISTS ONLY public."AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_pkey";
ALTER TABLE IF EXISTS ONLY public."ApiToken" DROP CONSTRAINT IF EXISTS "ApiToken_pkey";
ALTER TABLE IF EXISTS ONLY public."AnalyticsEvent" DROP CONSTRAINT IF EXISTS "AnalyticsEvent_pkey";
ALTER TABLE IF EXISTS ONLY public."AgentCorrection" DROP CONSTRAINT IF EXISTS "AgentCorrection_pkey";
ALTER TABLE IF EXISTS ONLY public."AgentAction" DROP CONSTRAINT IF EXISTS "AgentAction_pkey";
ALTER TABLE IF EXISTS ONLY public."Activity" DROP CONSTRAINT IF EXISTS "Activity_pkey";
ALTER TABLE IF EXISTS ONLY public."ActivityParticipant" DROP CONSTRAINT IF EXISTS "ActivityParticipant_pkey";
ALTER TABLE IF EXISTS ONLY public."ActivityLink" DROP CONSTRAINT IF EXISTS "ActivityLink_pkey";
DROP TABLE IF EXISTS public._prisma_migrations;
DROP TABLE IF EXISTS public."User";
DROP TABLE IF EXISTS public."Team";
DROP TABLE IF EXISTS public."Task";
DROP TABLE IF EXISTS public."Tagging";
DROP TABLE IF EXISTS public."Tag";
DROP TABLE IF EXISTS public."Stage";
DROP TABLE IF EXISTS public."Proposal";
DROP TABLE IF EXISTS public."ProjectContact";
DROP TABLE IF EXISTS public."Project";
DROP TABLE IF EXISTS public."ProcessedMessage";
DROP TABLE IF EXISTS public."Pipeline";
DROP TABLE IF EXISTS public."Organization";
DROP TABLE IF EXISTS public."Notification";
DROP TABLE IF EXISTS public."Milestone";
DROP TABLE IF EXISTS public."IntegrationConnection";
DROP TABLE IF EXISTS public."FieldPermission";
DROP TABLE IF EXISTS public."ExportJob";
DROP TABLE IF EXISTS public."DealContact";
DROP TABLE IF EXISTS public."Deal";
DROP TABLE IF EXISTS public."CustomFieldValue";
DROP TABLE IF EXISTS public."CustomFieldDef";
DROP TABLE IF EXISTS public."Contact";
DROP TABLE IF EXISTS public."Company";
DROP TABLE IF EXISTS public."CaptureExclusion";
DROP TABLE IF EXISTS public."AuditLog";
DROP TABLE IF EXISTS public."ApiToken";
DROP TABLE IF EXISTS public."AnalyticsEvent";
DROP TABLE IF EXISTS public."AgentCorrection";
DROP TABLE IF EXISTS public."AgentAction";
DROP TABLE IF EXISTS public."ActivityParticipant";
DROP TABLE IF EXISTS public."ActivityLink";
DROP TABLE IF EXISTS public."Activity";
DROP TYPE IF EXISTS public."WorkspaceMotion";
DROP TYPE IF EXISTS public."UserRole";
DROP TYPE IF EXISTS public."TaskStatus";
DROP TYPE IF EXISTS public."SummaryStatus";
DROP TYPE IF EXISTS public."Sentiment";
DROP TYPE IF EXISTS public."RecordSource";
DROP TYPE IF EXISTS public."ProjectStatus";
DROP TYPE IF EXISTS public."NotificationType";
DROP TYPE IF EXISTS public."IntegrationProvider";
DROP TYPE IF EXISTS public."ExportStatus";
DROP TYPE IF EXISTS public."ExclusionKind";
DROP TYPE IF EXISTS public."EntityType";
DROP TYPE IF EXISTS public."DealStatus";
DROP TYPE IF EXISTS public."CustomFieldType";
DROP TYPE IF EXISTS public."ConnectionStatus";
DROP TYPE IF EXISTS public."ConfidenceTier";
DROP TYPE IF EXISTS public."CallOutcome";
DROP TYPE IF EXISTS public."AgentActionType";
DROP TYPE IF EXISTS public."AgentActionStatus";
DROP TYPE IF EXISTS public."ActorType";
DROP TYPE IF EXISTS public."ActivityType";
DROP TYPE IF EXISTS public."ActivityDirection";
--
-- Name: ActivityDirection; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ActivityDirection" AS ENUM (
    'INBOUND',
    'OUTBOUND',
    'INTERNAL'
);


--
-- Name: ActivityType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ActivityType" AS ENUM (
    'EMAIL',
    'CALL',
    'MEETING',
    'NOTE'
);


--
-- Name: ActorType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ActorType" AS ENUM (
    'HUMAN',
    'AGENT',
    'SYSTEM'
);


--
-- Name: AgentActionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentActionStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'REJECTED',
    'AUTO_APPLIED',
    'FAILED'
);


--
-- Name: AgentActionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AgentActionType" AS ENUM (
    'CREATE_CONTACT',
    'UPDATE_CONTACT',
    'CREATE_COMPANY',
    'CHANGE_DEAL_STAGE',
    'UPDATE_DEAL',
    'CREATE_TASK',
    'LINK_CONTACT_TO_DEAL'
);


--
-- Name: CallOutcome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CallOutcome" AS ENUM (
    'CONNECTED',
    'ATTEMPTED_NO_CONNECT',
    'VOICEMAIL',
    'FAILED'
);


--
-- Name: ConfidenceTier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConfidenceTier" AS ENUM (
    'HIGH',
    'MEDIUM'
);


--
-- Name: ConnectionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConnectionStatus" AS ENUM (
    'CONNECTED',
    'ERROR',
    'REAUTH_REQUIRED',
    'DISCONNECTED'
);


--
-- Name: CustomFieldType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CustomFieldType" AS ENUM (
    'TEXT',
    'NUMBER',
    'DATE',
    'BOOLEAN',
    'SELECT'
);


--
-- Name: DealStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DealStatus" AS ENUM (
    'OPEN',
    'WON',
    'LOST'
);


--
-- Name: EntityType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EntityType" AS ENUM (
    'CONTACT',
    'COMPANY',
    'DEAL',
    'PROJECT',
    'TASK'
);


--
-- Name: ExclusionKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExclusionKind" AS ENUM (
    'SENDER',
    'DOMAIN',
    'THREAD'
);


--
-- Name: ExportStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExportStatus" AS ENUM (
    'QUEUED',
    'RUNNING',
    'READY',
    'FAILED'
);


--
-- Name: IntegrationProvider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."IntegrationProvider" AS ENUM (
    'GOOGLE',
    'MICROSOFT',
    'SLACK',
    'TELEPHONY',
    'ESIGN'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationType" AS ENUM (
    'DEAL_STALLING',
    'AGENT_ACTION_PENDING',
    'NEW_LEAD',
    'CONNECTION_REAUTH',
    'DEAL_WON',
    'PROJECT_REVIEW'
);


--
-- Name: ProjectStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ProjectStatus" AS ENUM (
    'ACTIVE',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: RecordSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecordSource" AS ENUM (
    'HUMAN',
    'AGENT_INFERRED',
    'IMPORTED',
    'ENRICHED'
);


--
-- Name: Sentiment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Sentiment" AS ENUM (
    'POSITIVE',
    'NEUTRAL',
    'NEGATIVE'
);


--
-- Name: SummaryStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SummaryStatus" AS ENUM (
    'PENDING',
    'DONE',
    'FAILED',
    'SKIPPED'
);


--
-- Name: TaskStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaskStatus" AS ENUM (
    'OPEN',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'MANAGER',
    'MEMBER'
);


--
-- Name: WorkspaceMotion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."WorkspaceMotion" AS ENUM (
    'SALES',
    'AGENCY',
    'HYBRID'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Activity" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    type public."ActivityType" NOT NULL,
    direction public."ActivityDirection" DEFAULT 'INBOUND'::public."ActivityDirection" NOT NULL,
    subject text,
    body text,
    "occurredAt" timestamp(3) without time zone NOT NULL,
    source public."RecordSource" DEFAULT 'HUMAN'::public."RecordSource" NOT NULL,
    "externalRef" text,
    "connectionId" text,
    "threadRef" text,
    "durationSeconds" integer,
    "callOutcome" public."CallOutcome",
    "recordingUrl" text,
    transcript text,
    "externalCallId" text,
    "aiSummary" text,
    sentiment public."Sentiment",
    "nextStep" text,
    "summaryStatus" public."SummaryStatus" DEFAULT 'PENDING'::public."SummaryStatus" NOT NULL,
    "summaryError" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "rawBodyTransient" text
);


--
-- Name: ActivityLink; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ActivityLink" (
    id text NOT NULL,
    "activityId" text NOT NULL,
    "entityType" public."EntityType" NOT NULL,
    "entityId" text NOT NULL,
    "isPrimary" boolean DEFAULT false NOT NULL
);


--
-- Name: ActivityParticipant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ActivityParticipant" (
    "activityId" text NOT NULL,
    "contactId" text NOT NULL
);


--
-- Name: AgentAction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AgentAction" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    type public."AgentActionType" NOT NULL,
    status public."AgentActionStatus" DEFAULT 'PENDING'::public."AgentActionStatus" NOT NULL,
    "targetEntityType" public."EntityType" NOT NULL,
    "targetEntityId" text,
    "proposedPayload" jsonb NOT NULL,
    "appliedPayload" jsonb,
    "confidenceScore" double precision NOT NULL,
    tier public."ConfidenceTier" NOT NULL,
    rationale text,
    "sourceActivityId" text,
    "reviewedByUserId" text,
    "reviewedAt" timestamp(3) without time zone,
    "failureReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AgentCorrection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AgentCorrection" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "companyId" text,
    "actionType" text NOT NULL,
    "fieldPath" text NOT NULL,
    "originalValue" text,
    "correctedValue" text,
    "correctedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AnalyticsEvent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AnalyticsEvent" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "userId" text,
    name text NOT NULL,
    properties jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ApiToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ApiToken" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    "tokenHash" text NOT NULL,
    "tokenPrefix" text NOT NULL,
    "lastUsedAt" timestamp(3) without time zone,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "actorType" public."ActorType" NOT NULL,
    "actorId" text,
    "actorName" text,
    "entityType" public."EntityType" NOT NULL,
    "entityId" text NOT NULL,
    field text NOT NULL,
    "priorValue" text,
    "newValue" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CaptureExclusion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CaptureExclusion" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "connectionId" text,
    kind public."ExclusionKind" NOT NULL,
    value text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Company; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Company" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    domain text,
    website text,
    source public."RecordSource" DEFAULT 'HUMAN'::public."RecordSource" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Contact" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "companyId" text,
    email text NOT NULL,
    "firstName" text,
    "lastName" text,
    phone text,
    title text,
    source public."RecordSource" DEFAULT 'HUMAN'::public."RecordSource" NOT NULL,
    excluded boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CustomFieldDef; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CustomFieldDef" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "entityType" public."EntityType" NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    type public."CustomFieldType" DEFAULT 'TEXT'::public."CustomFieldType" NOT NULL,
    options text[] DEFAULT ARRAY[]::text[],
    "archivedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CustomFieldValue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CustomFieldValue" (
    id text NOT NULL,
    "defId" text NOT NULL,
    "entityId" text NOT NULL,
    value jsonb NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Deal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Deal" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "pipelineId" text NOT NULL,
    "stageId" text NOT NULL,
    "stageSource" public."RecordSource" DEFAULT 'HUMAN'::public."RecordSource" NOT NULL,
    name text NOT NULL,
    status public."DealStatus" DEFAULT 'OPEN'::public."DealStatus" NOT NULL,
    "valueCents" integer,
    currency text DEFAULT 'USD'::text NOT NULL,
    "ownerId" text,
    "companyId" text,
    source public."RecordSource" DEFAULT 'HUMAN'::public."RecordSource" NOT NULL,
    "expectedCloseDate" timestamp(3) without time zone,
    "lastActivityAt" timestamp(3) without time zone,
    "stallingSince" timestamp(3) without time zone,
    "closedAt" timestamp(3) without time zone,
    "needsReview" boolean DEFAULT false NOT NULL,
    "reviewReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: DealContact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DealContact" (
    "dealId" text NOT NULL,
    "contactId" text NOT NULL,
    role text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ExportJob; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExportJob" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "requestedById" text,
    status public."ExportStatus" DEFAULT 'QUEUED'::public."ExportStatus" NOT NULL,
    "filePath" text,
    error text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


--
-- Name: FieldPermission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FieldPermission" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "entityType" public."EntityType" NOT NULL,
    field text NOT NULL,
    role public."UserRole" NOT NULL,
    "canRead" boolean DEFAULT true NOT NULL,
    "canWrite" boolean DEFAULT true NOT NULL
);


--
-- Name: IntegrationConnection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."IntegrationConnection" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "userId" text,
    provider public."IntegrationProvider" NOT NULL,
    status public."ConnectionStatus" DEFAULT 'CONNECTED'::public."ConnectionStatus" NOT NULL,
    "accountEmail" text,
    "accessToken" text,
    "refreshToken" text,
    "expiresAt" timestamp(3) without time zone,
    "syncCursor" text,
    "calendarCursor" text,
    "lastSyncedAt" timestamp(3) without time zone,
    "nextPollAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "backoffSeconds" integer DEFAULT 60 NOT NULL,
    "failureCount" integer DEFAULT 0 NOT NULL,
    "lastError" text,
    "backfillCompletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Milestone; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Milestone" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    title text NOT NULL,
    "ownerId" text,
    "dueDate" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "userId" text NOT NULL,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    body text,
    "entityType" public."EntityType",
    "entityId" text,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dedupeKey" text
);


--
-- Name: Organization; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Organization" (
    id text NOT NULL,
    name text NOT NULL,
    motion public."WorkspaceMotion" DEFAULT 'SALES'::public."WorkspaceMotion" NOT NULL,
    "showProjectsUi" boolean DEFAULT false NOT NULL,
    "stallingThresholdDays" integer DEFAULT 5 NOT NULL,
    "agentHighThreshold" double precision DEFAULT 0.8 NOT NULL,
    "agentMediumThreshold" double precision DEFAULT 0.5 NOT NULL,
    "planName" text DEFAULT 'Team'::text NOT NULL,
    "seatCount" integer DEFAULT 1 NOT NULL,
    "pricePerSeatCents" integer DEFAULT 3900 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "autoApplyOptIn" boolean DEFAULT false NOT NULL,
    "encryptedDataKey" text
);


--
-- Name: Pipeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Pipeline" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ProcessedMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProcessedMessage" (
    id text NOT NULL,
    "connectionId" text NOT NULL,
    "externalRef" text NOT NULL,
    "processedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Project; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    status public."ProjectStatus" DEFAULT 'ACTIVE'::public."ProjectStatus" NOT NULL,
    "companyId" text,
    "ownerId" text,
    "originatingDealId" text,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ProjectContact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProjectContact" (
    "projectId" text NOT NULL,
    "contactId" text NOT NULL,
    role text
);


--
-- Name: Proposal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Proposal" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    "dealId" text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    "signerContactId" text,
    "externalRef" text,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "signedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Stage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Stage" (
    id text NOT NULL,
    "pipelineId" text NOT NULL,
    name text NOT NULL,
    "order" integer NOT NULL,
    "winProbability" double precision DEFAULT 0 NOT NULL,
    "isWonStage" boolean DEFAULT false NOT NULL,
    "isLostStage" boolean DEFAULT false NOT NULL
);


--
-- Name: Tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tag" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    color text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Tagging; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tagging" (
    "tagId" text NOT NULL,
    "entityType" public."EntityType" NOT NULL,
    "entityId" text NOT NULL
);


--
-- Name: Task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Task" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    title text NOT NULL,
    notes text,
    "dueAt" timestamp(3) without time zone,
    "ownerId" text,
    status public."TaskStatus" DEFAULT 'OPEN'::public."TaskStatus" NOT NULL,
    source public."RecordSource" DEFAULT 'HUMAN'::public."RecordSource" NOT NULL,
    "entityType" public."EntityType",
    "entityId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Team" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "organizationId" text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    name text NOT NULL,
    role public."UserRole" DEFAULT 'MEMBER'::public."UserRole" NOT NULL,
    "teamId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: Activity; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Activity" (id, "organizationId", type, direction, subject, body, "occurredAt", source, "externalRef", "connectionId", "threadRef", "durationSeconds", "callOutcome", "recordingUrl", transcript, "externalCallId", "aiSummary", sentiment, "nextStep", "summaryStatus", "summaryError", "createdAt", "rawBodyTransient") FROM stdin;
6b84d346-9dd5-4f3b-87a0-1098e0d87913	c7904668-4dc6-4a89-b778-e21b92b765fb	NOTE	INTERNAL	\N	Called Acme Corp, they are interested in hybrid pipeline.	2026-08-06 06:04:28.024	HUMAN	note:d61c65d8-c00d-4f77-9336-7c9e56715215-1785996267893	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	SKIPPED	\N	2026-08-06 06:04:28.036	\N
5a106c7d-5eb4-421a-a32d-2e20a52ada9f	033c85aa-d15a-47b9-be4e-229e3f590e49	EMAIL	INBOUND	Brand refresh — first thoughts	We want the refresh to land before the funding announcement in March. The current identity reads as a 2019 startup and we are talking to institutional investors now.	2026-07-13 05:46:39.84	AGENT_INFERRED	\N	\N	\N	\N	\N	\N	\N	\N	Lumen wants the brand refresh completed before a March funding announcement. Their current identity no longer suits the institutional investors they are now speaking to.	POSITIVE	Share a scope and indicative timeline	DONE	\N	2026-08-06 05:46:39.841	\N
1721e3b3-a0f5-425c-be16-8b143c65755a	033c85aa-d15a-47b9-be4e-229e3f590e49	EMAIL	INBOUND	Re: Brand refresh — scope	The scope looks right. One thing: our head of product wants the design system usable by engineers directly, not just a PDF. Can you include tokens and a component library?	2026-07-25 05:46:39.85	AGENT_INFERRED	\N	\N	\N	\N	\N	\N	\N	\N	Scope approved with one addition: the design system must be engineer-consumable, with design tokens and a component library rather than a static PDF.	POSITIVE	Add tokens and component library to the scope and re-send	DONE	\N	2026-08-06 05:46:39.851	\N
e1bb72c8-ff52-4971-9223-20987308fe3e	033c85aa-d15a-47b9-be4e-229e3f590e49	EMAIL	INBOUND	Re: Brand refresh — signed	Signed and returned this morning. Looking forward to getting started. Kickoff week of the 14th works our end.	2026-08-04 05:46:39.861	AGENT_INFERRED	\N	\N	\N	\N	\N	\N	\N	\N	Lumen signed the agreement and confirmed kickoff for the week of the 14th.	POSITIVE	Schedule kickoff for the week of the 14th	DONE	\N	2026-08-06 05:46:39.862	\N
68f83516-6665-4c06-8f36-4a9e06bf16ed	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	CALL	OUTBOUND	Call with Dana	Rep: Thanks for making the time. I know you were waiting on the security review before we talked commercials.\n\nContact: That's right. Marcus came back yesterday — he's satisfied with the data-handling summary. No blockers from his side.\n\nRep: That's good to hear. So where does that leave us?\n\nContact: Budget's approved. Finance signed off this morning for the forty-seat pilot. What I need from you is the paperwork, and we'd like to be live by the start of next month.\n\nRep: I can have the agreement over to you today. On timing, forty seats provisioned inside a week is realistic once it's signed.\n\nContact: Good. Send it across and I'll get it turned around this week.\n\nRep: Will do. I'll also include the onboarding plan so your team knows what the first fortnight looks like.\n\nContact: Appreciated. Talk soon.	2026-08-06 05:47:21.425	HUMAN	\N	\N	\N	442	CONNECTED	sim://recordings/sim-call-d473c3ad-4531-4d45-8063-178e48263e32	Rep: Thanks for making the time. I know you were waiting on the security review before we talked commercials.\n\nContact: That's right. Marcus came back yesterday — he's satisfied with the data-handling summary. No blockers from his side.\n\nRep: That's good to hear. So where does that leave us?\n\nContact: Budget's approved. Finance signed off this morning for the forty-seat pilot. What I need from you is the paperwork, and we'd like to be live by the start of next month.\n\nRep: I can have the agreement over to you today. On timing, forty seats provisioned inside a week is realistic once it's signed.\n\nContact: Good. Send it across and I'll get it turned around this week.\n\nRep: Will do. I'll also include the onboarding plan so your team knows what the first fortnight looks like.\n\nContact: Appreciated. Talk soon.	sim-call-d473c3ad-4531-4d45-8063-178e48263e32	Rep: Thanks for making the time. I know you were waiting on the security review before we talked commercials. Contact: That's right.	POSITIVE	Get it turned around this week	DONE	\N	2026-08-06 05:47:21.426	\N
078b38eb-6437-47be-b714-6fddcca91b3c	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	EMAIL	INBOUND	Re: Northwind — pilot scope	Hi,\n\nThanks for sending the scope over. I walked the team through it this morning and the reaction was positive. The 40-seat pilot looks right for us.\n\nTwo things before we go further: we need SSO on day one, and our security team will want to see your data-handling summary.\n\nCan we get 30 minutes on Thursday?\n\nBest,\nDana	2026-07-31 03:30:00	AGENT_INFERRED	sim-msg-001	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-thread-northwind	\N	\N	\N	\N	\N	Hi, Thanks for sending the scope over. I walked the team through it this morning and the reaction was positive. The 40-seat pilot looks right for us.	POSITIVE	Get 30 minutes on Thursday	DONE	\N	2026-08-06 05:46:40.78	\N
559cf950-4378-403d-8eed-5e3386e6ead4	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	EMAIL	INBOUND	Re: Northwind — pilot scope (looping in security)	Adding Marcus from our security side.\n\nMarcus, this is the vendor I mentioned. They've got the data-handling summary coming ahead of Thursday.\n\nDana	2026-08-01 05:30:00	AGENT_INFERRED	sim-msg-003	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-thread-northwind	\N	\N	\N	\N	\N	Adding Marcus from our security side. Marcus, this is the vendor I mentioned. They've got the data-handling summary coming ahead of Thursday.	NEUTRAL	\N	DONE	\N	2026-08-06 05:46:40.875	\N
8943afb8-070f-4cba-8724-98b412dbf973	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	EMAIL	OUTBOUND	Re: Northwind — pilot scope	Dana,\n\nThursday at 2pm works. I'll send an invite.\n\nSSO is included in the plan you're looking at, and I'll attach the data-handling summary ahead of the call so your security team has time with it.\n\nSpeak Thursday,	2026-07-31 08:30:00	AGENT_INFERRED	sim-msg-002	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-thread-northwind	\N	\N	\N	\N	\N	Dana, Thursday at 2pm works. I'll send an invite. SSO is included in the plan you're looking at, and I'll attach the data-handling summary ahead of the call so your security team has time with it.	NEUTRAL	Send an invite	DONE	\N	2026-08-06 05:46:40.84	\N
8b4c6bcc-db8d-4ad8-ba00-4f959f5c8f60	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	EMAIL	INBOUND	Re: Northwind — pilot scope	Good news — budget is approved for the 40-seat pilot.\n\nFinance signed off this morning. Send the paperwork over and we'll get it turned around this week. We're aiming to be live by the start of next month.\n\nDana	2026-08-04 03:30:00	AGENT_INFERRED	sim-msg-004	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-thread-northwind	\N	\N	\N	\N	\N	Good news — budget is approved for the 40-seat pilot. Finance signed off this morning. Send the paperwork over and we'll get it turned around this week.	POSITIVE	Get it turned around this week	DONE	\N	2026-08-06 05:46:40.96	\N
92f94fc9-d055-4c10-a315-d63ded437cd4	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	EMAIL	INBOUND	Harbor Creative — website rebuild	Hello,\n\nWe're a 30-person design studio and we're looking at rebuilding our marketing site before the new year. Rough budget is somewhere around 60k.\n\nI've copied Priya from our agency partner, who'll be helping us scope it.\n\nWould you have capacity to talk next week?\n\nRegards,\nTomas Lind\nHarbor Creative	2026-07-29 09:30:00	AGENT_INFERRED	sim-msg-007	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-thread-harbor	\N	\N	\N	\N	\N	Hello, We're a 30-person design studio and we're looking at rebuilding our marketing site before the new year. Rough budget is somewhere around 60k. I've copied Priya from our agency partner, who'll be helping us scope it.	NEUTRAL	\N	DONE	\N	2026-08-06 05:46:40.998	\N
9a912c8e-d241-4d4b-bf18-3cd7fabdd108	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	EMAIL	OUTBOUND	Re: Harbor Creative — website rebuild	Tomas,\n\nWe'd be glad to. I've put a hold on Tuesday at 11.\n\nAhead of that, it would help to know roughly how many templates you're expecting and whether the CMS is staying put.	2026-07-30 03:30:00	AGENT_INFERRED	sim-msg-008	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-thread-harbor	\N	\N	\N	\N	\N	Tomas, We'd be glad to. I've put a hold on Tuesday at 11. Ahead of that, it would help to know roughly how many templates you're expecting and whether the CMS is staying put.	POSITIVE	\N	DONE	\N	2026-08-06 05:46:41.022	\N
9b62ed95-3628-4db3-8beb-9e6bded7def1	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	MEETING	OUTBOUND	Northwind — security review (moved)	Rescheduled at Northwind's request.	2026-08-08 10:30:00	AGENT_INFERRED	sim-evt-101	7e93e369-f261-4f3d-94a9-f9f8d058848e	\N	3600	\N	\N	\N	\N	Walk through the data-handling summary with Northwind security.	NEUTRAL	\N	DONE	\N	2026-08-06 05:46:41.048	\N
\.


--
-- Data for Name: ActivityLink; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ActivityLink" (id, "activityId", "entityType", "entityId", "isPrimary") FROM stdin;
23e330c9-cafc-4d40-9c6b-e48192e28e50	5a106c7d-5eb4-421a-a32d-2e20a52ada9f	PROJECT	fef7ae42-2459-40c7-91ba-5c778d121bc3	t
fee94793-d64e-4b57-b7d1-6cd6b921fa89	1721e3b3-a0f5-425c-be16-8b143c65755a	PROJECT	fef7ae42-2459-40c7-91ba-5c778d121bc3	t
3b625b4d-d408-4736-9302-51026ef18073	e1bb72c8-ff52-4971-9223-20987308fe3e	PROJECT	fef7ae42-2459-40c7-91ba-5c778d121bc3	t
2adfec92-bf3f-48a9-a67e-bba9933df954	6b84d346-9dd5-4f3b-87a0-1098e0d87913	DEAL	d61c65d8-c00d-4f77-9336-7c9e56715215	t
9440e639-47e5-4fc6-9aba-aaafb56a4514	6b84d346-9dd5-4f3b-87a0-1098e0d87913	PROJECT	b87d51b6-a186-4c83-8423-aab2b0b77410	t
417e05cb-e378-4f1e-b5e4-e7f06a1a4e5b	5a106c7d-5eb4-421a-a32d-2e20a52ada9f	DEAL	f0b2a662-4329-41ee-b880-6540ab469dfd	t
78062526-d1a5-42ed-a4ba-877711b51a8d	5a106c7d-5eb4-421a-a32d-2e20a52ada9f	COMPANY	46dc2e8e-bcaa-46be-88f5-8b8741c9d4de	f
0071d526-96b4-4c1f-a5bd-5b4b9751b531	5a106c7d-5eb4-421a-a32d-2e20a52ada9f	CONTACT	fc527b9d-b722-4ff0-9464-424bcac1cf54	f
0b6c2745-f75d-4b4f-a6e7-640041ad8efe	1721e3b3-a0f5-425c-be16-8b143c65755a	DEAL	f0b2a662-4329-41ee-b880-6540ab469dfd	t
1d0d9743-bf8a-45b3-8e90-234b583b71c6	1721e3b3-a0f5-425c-be16-8b143c65755a	COMPANY	46dc2e8e-bcaa-46be-88f5-8b8741c9d4de	f
795d4b6d-72de-4ef3-bda7-03affb9b6db4	1721e3b3-a0f5-425c-be16-8b143c65755a	CONTACT	fc527b9d-b722-4ff0-9464-424bcac1cf54	f
d308d43f-338e-4582-8915-f0ac5ba6138a	e1bb72c8-ff52-4971-9223-20987308fe3e	DEAL	f0b2a662-4329-41ee-b880-6540ab469dfd	t
9a058209-467b-4c80-b39f-a9b32198529d	e1bb72c8-ff52-4971-9223-20987308fe3e	COMPANY	46dc2e8e-bcaa-46be-88f5-8b8741c9d4de	f
3e51327b-a881-42e7-a6bb-a94209e153f2	e1bb72c8-ff52-4971-9223-20987308fe3e	CONTACT	fc527b9d-b722-4ff0-9464-424bcac1cf54	f
ee938e08-fa44-4abb-bb30-7ef8d21c172f	078b38eb-6437-47be-b714-6fddcca91b3c	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	t
9f106072-f41f-4393-af6c-bf8dd6021b1c	078b38eb-6437-47be-b714-6fddcca91b3c	COMPANY	1febc317-a802-4841-9389-aaa38b63b10c	f
2651a185-002f-4300-a318-aded87c10d61	078b38eb-6437-47be-b714-6fddcca91b3c	CONTACT	00dab006-9623-4134-9b47-57575550572f	f
e9af115d-be98-400d-9d6a-f81cfcfc024b	8943afb8-070f-4cba-8724-98b412dbf973	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	t
247c5a39-efab-4dac-82d4-6e06b2ff6c51	8943afb8-070f-4cba-8724-98b412dbf973	COMPANY	1febc317-a802-4841-9389-aaa38b63b10c	f
ed0dc0dc-6232-4af5-b34a-46f278d31057	8943afb8-070f-4cba-8724-98b412dbf973	CONTACT	00dab006-9623-4134-9b47-57575550572f	f
483ecf5e-342f-40c4-bcca-d5db0a8ba76c	559cf950-4378-403d-8eed-5e3386e6ead4	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	t
3fc802f4-fa6f-475d-8681-8a7cba3056b6	559cf950-4378-403d-8eed-5e3386e6ead4	COMPANY	1febc317-a802-4841-9389-aaa38b63b10c	f
45ce6aa2-243c-4709-a10d-8217c055952a	559cf950-4378-403d-8eed-5e3386e6ead4	CONTACT	00dab006-9623-4134-9b47-57575550572f	f
3f04ffb3-f8a6-4163-b8d1-696bd2a59d34	8b4c6bcc-db8d-4ad8-ba00-4f959f5c8f60	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	t
9517c751-42a3-4729-8b43-30bab26f6e86	8b4c6bcc-db8d-4ad8-ba00-4f959f5c8f60	COMPANY	1febc317-a802-4841-9389-aaa38b63b10c	f
60421d5f-df51-4eaa-aabe-d313d60cf7d8	8b4c6bcc-db8d-4ad8-ba00-4f959f5c8f60	CONTACT	00dab006-9623-4134-9b47-57575550572f	f
c519f60c-b097-48bd-923f-4561684b4c22	9b62ed95-3628-4db3-8beb-9e6bded7def1	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	t
d5b9cf1c-72f4-438d-ad12-10c89db2a674	9b62ed95-3628-4db3-8beb-9e6bded7def1	COMPANY	1febc317-a802-4841-9389-aaa38b63b10c	f
faa240ae-42bf-48c4-b87a-5497ccc8f992	9b62ed95-3628-4db3-8beb-9e6bded7def1	CONTACT	00dab006-9623-4134-9b47-57575550572f	f
eeb3d716-a99d-4641-bcca-1b5e41772e96	68f83516-6665-4c06-8f36-4a9e06bf16ed	CONTACT	00dab006-9623-4134-9b47-57575550572f	t
\.


--
-- Data for Name: ActivityParticipant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ActivityParticipant" ("activityId", "contactId") FROM stdin;
5a106c7d-5eb4-421a-a32d-2e20a52ada9f	fc527b9d-b722-4ff0-9464-424bcac1cf54
1721e3b3-a0f5-425c-be16-8b143c65755a	fc527b9d-b722-4ff0-9464-424bcac1cf54
e1bb72c8-ff52-4971-9223-20987308fe3e	fc527b9d-b722-4ff0-9464-424bcac1cf54
078b38eb-6437-47be-b714-6fddcca91b3c	00dab006-9623-4134-9b47-57575550572f
8943afb8-070f-4cba-8724-98b412dbf973	00dab006-9623-4134-9b47-57575550572f
559cf950-4378-403d-8eed-5e3386e6ead4	00dab006-9623-4134-9b47-57575550572f
8b4c6bcc-db8d-4ad8-ba00-4f959f5c8f60	00dab006-9623-4134-9b47-57575550572f
9b62ed95-3628-4db3-8beb-9e6bded7def1	00dab006-9623-4134-9b47-57575550572f
68f83516-6665-4c06-8f36-4a9e06bf16ed	00dab006-9623-4134-9b47-57575550572f
\.


--
-- Data for Name: AgentAction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AgentAction" (id, "organizationId", type, status, "targetEntityType", "targetEntityId", "proposedPayload", "appliedPayload", "confidenceScore", tier, rationale, "sourceActivityId", "reviewedByUserId", "reviewedAt", "failureReason", "createdAt") FROM stdin;
f928a994-a338-416f-a57a-96a74cc5d315	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	CHANGE_DEAL_STAGE	CONFIRMED	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	{"stageName": "Proposal"}	{"stageName": "Proposal"}	0.9	HIGH	The message states: "budget is approved". Stage proposals never advance more than one stage at a time.	8b4c6bcc-db8d-4ad8-ba00-4f959f5c8f60	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	2026-08-06 05:47:21.511	\N	2026-08-06 05:46:43.808
c7ac2e22-c3f2-44de-9894-06e6475d646a	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	CREATE_CONTACT	CONFIRMED	CONTACT	\N	{"email": "marcus.bell@northwind-logistics.com", "title": null, "dealId": "1d3aa010-3e13-4066-a9fd-2a23d9735b0a", "lastName": "Bell", "firstName": "Marcus"}	{"email": "marcus.bell@northwind-logistics.com", "title": "Head of Security", "dealId": "1d3aa010-3e13-4066-a9fd-2a23d9735b0a", "lastName": "Bell", "firstName": "Marc"}	0.85	HIGH	marcus.bell@northwind-logistics.com took part in this thread and their domain belongs to a company already in the CRM, but there is no contact for them yet. Creating a record always requires confirmation, whatever the confidence.	559cf950-4378-403d-8eed-5e3386e6ead4	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	2026-08-06 05:47:21.576	\N	2026-08-06 05:46:40.925
4581ddaa-372a-44c3-b04c-2983010a91c1	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	CHANGE_DEAL_STAGE	PENDING	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	{"stageName": "Qualified"}	\N	0.8	HIGH	[via MCP] Journey harness check Stage proposals never advance more than one stage at a time.	\N	\N	\N	\N	2026-08-06 05:47:24.497
a2a94897-d08e-464e-9937-c68e334fb204	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	CHANGE_DEAL_STAGE	PENDING	DEAL	3f8c5a27-723f-496d-8eed-faa63dd34503	{"stageName": "Qualified"}	\N	0.87	HIGH	[via MCP] Journey harness — guardrail check The message suggested moving to Won, which is more than one stage ahead. Proposing Qualified instead — large jumps usually mean the context was misread. Stage proposals never advance more than one stage at a time.	\N	\N	\N	\N	2026-08-06 05:47:24.69
\.


--
-- Data for Name: AgentCorrection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AgentCorrection" (id, "organizationId", "companyId", "actionType", "fieldPath", "originalValue", "correctedValue", "correctedById", "createdAt") FROM stdin;
0e69257c-0cfa-4ac2-99f6-5b3f68aa6472	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	1febc317-a802-4841-9389-aaa38b63b10c	CREATE_CONTACT	title	null	Head of Security	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	2026-08-06 05:47:21.581
a2569130-7808-446c-b6f2-d4f34dba00c5	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	1febc317-a802-4841-9389-aaa38b63b10c	CREATE_CONTACT	firstName	Marcus	Marc	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	2026-08-06 05:47:21.581
\.


--
-- Data for Name: AnalyticsEvent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AnalyticsEvent" (id, "organizationId", "userId", name, properties, "createdAt") FROM stdin;
52516e4d-cec2-405a-9532-2384900af48d	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	deal_stage_changed	{"dealId": "1d3aa010-3e13-4066-a9fd-2a23d9735b0a", "source": "agent", "toStatus": "OPEN"}	2026-08-06 05:47:21.5
64a4fac1-4475-4c74-a402-19091c4095d2	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	agent_action_resolved	{"outcome": "confirmed", "actionId": "f928a994-a338-416f-a57a-96a74cc5d315", "actionType": "CHANGE_DEAL_STAGE", "confidenceTier": "HIGH", "secondsToResolution": 38}	2026-08-06 05:47:21.517
a1f0a810-0e30-48f2-88d5-b928f1665a68	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	agent_action_created	{"actionId": "4581ddaa-372a-44c3-b04c-2983010a91c1", "actionType": "CHANGE_DEAL_STAGE", "sourceKind": null, "autoApplied": false, "confidenceTier": "HIGH", "guardrailApplied": false}	2026-08-06 05:47:24.501
f4643a43-a857-4e8e-a6bb-f7fa11a5ffc8	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	agent_action_created	{"actionId": "a2a94897-d08e-464e-9937-c68e334fb204", "actionType": "CHANGE_DEAL_STAGE", "sourceKind": null, "autoApplied": false, "confidenceTier": "HIGH", "guardrailApplied": true}	2026-08-06 05:47:24.695
4fa08e6a-b972-40cb-972a-a4260c2bc586	0231b15a-38c0-4d75-87de-37634e13b507	\N	signup_completed	{"motion": "SALES"}	2026-08-06 05:47:24.802
e79a8706-9cbf-4e08-bb21-996edd14801c	c7904668-4dc6-4a89-b778-e21b92b765fb	f681df60-14aa-4720-8ca7-6defa3d97a82	deal_stage_changed	{"dealId": "d61c65d8-c00d-4f77-9336-7c9e56715215", "source": "human", "toStatus": "OPEN"}	2026-08-06 06:03:11.078
be4ea2c2-9b8d-4910-9ba3-ec32c9949adf	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	activity_captured	{"source": "AGENT_INFERRED", "direction": "INBOUND", "activityId": "078b38eb-6437-47be-b714-6fddcca91b3c", "activityType": "EMAIL", "linkedToDeal": true}	2026-08-06 05:46:40.807
7452796d-53aa-45a8-b078-c614b46ca6e3	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	first_activity_captured	{"provider": "GOOGLE", "connectionId": "7e93e369-f261-4f3d-94a9-f9f8d058848e", "secondsSinceConnection": 1}	2026-08-06 05:46:40.816
138c9c5c-4fd1-4c43-ae5f-014a74b71ca5	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	activity_captured	{"source": "AGENT_INFERRED", "direction": "OUTBOUND", "activityId": "8943afb8-070f-4cba-8724-98b412dbf973", "activityType": "EMAIL", "linkedToDeal": true}	2026-08-06 05:46:40.853
5625b434-19cf-47d4-9c1d-0236b3d1e986	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	activity_captured	{"source": "AGENT_INFERRED", "direction": "INBOUND", "activityId": "559cf950-4378-403d-8eed-5e3386e6ead4", "activityType": "EMAIL", "linkedToDeal": true}	2026-08-06 05:46:40.892
ef6f1b22-3c1c-477f-90e6-003af72cb244	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	agent_action_created	{"actionId": "c7ac2e22-c3f2-44de-9894-06e6475d646a", "actionType": "CREATE_CONTACT", "sourceKind": null, "autoApplied": false, "confidenceTier": "HIGH", "guardrailApplied": false}	2026-08-06 05:46:40.931
0e8c89f5-1ac8-44bb-b974-b35944c26169	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	activity_captured	{"source": "AGENT_INFERRED", "direction": "INBOUND", "activityId": "8b4c6bcc-db8d-4ad8-ba00-4f959f5c8f60", "activityType": "EMAIL", "linkedToDeal": true}	2026-08-06 05:46:40.974
9fae8f59-8bee-44fe-b788-837aeff933f9	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	activity_captured	{"source": "AGENT_INFERRED", "direction": "INBOUND", "activityId": "92f94fc9-d055-4c10-a315-d63ded437cd4", "activityType": "EMAIL", "linkedToDeal": false}	2026-08-06 05:46:41.004
7c2ffb07-f83e-4aaa-9c5c-c30223002054	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	activity_captured	{"source": "AGENT_INFERRED", "direction": "OUTBOUND", "activityId": "9a912c8e-d241-4d4b-bf18-3cd7fabdd108", "activityType": "EMAIL", "linkedToDeal": false}	2026-08-06 05:46:41.028
c12d4f23-a9a9-4f13-afd4-6e104505f8a5	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	activity_captured	{"source": "AGENT_INFERRED", "direction": "OUTBOUND", "activityId": "9b62ed95-3628-4db3-8beb-9e6bded7def1", "activityType": "MEETING", "linkedToDeal": true}	2026-08-06 05:46:41.062
fae2aaa2-820c-41a1-896f-12c63f8e4866	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	agent_action_resolved	{"outcome": "edited", "actionId": "c7ac2e22-c3f2-44de-9894-06e6475d646a", "actionType": "CREATE_CONTACT", "confidenceTier": "HIGH", "secondsToResolution": 41}	2026-08-06 05:47:21.586
4786e79e-30ed-440c-a541-6eee5b1c4abf	033c85aa-d15a-47b9-be4e-229e3f590e49	09ec6c66-b4a7-49df-8394-1ca2894f15cd	deal_converted_to_project	{"dealId": "f0b2a662-4329-41ee-b880-6540ab469dfd", "projectId": "fef7ae42-2459-40c7-91ba-5c778d121bc3", "hoursSinceWon": 48, "activitiesCarriedOver": 3}	2026-08-06 05:47:21.795
1eede48d-ccdd-4e8f-8e2b-2f384f93cb91	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	export_requested	{"jobId": "2c2826bf-f01b-4f9a-a940-571e82e4950e"}	2026-08-06 05:47:21.89
58550630-45ac-4464-aff8-d354433dbe2c	c7904668-4dc6-4a89-b778-e21b92b765fb	\N	signup_completed	{"motion": "HYBRID"}	2026-08-06 06:01:24.762
b2cf0ce1-f6f4-49e4-9a6a-cf0d2e1b5f6b	c7904668-4dc6-4a89-b778-e21b92b765fb	f681df60-14aa-4720-8ca7-6defa3d97a82	deal_stage_changed	{"dealId": "d61c65d8-c00d-4f77-9336-7c9e56715215", "source": "human", "toStatus": "WON"}	2026-08-06 06:12:03.036
f8d283ad-110c-47c1-be60-9b3467dee1fb	c7904668-4dc6-4a89-b778-e21b92b765fb	f681df60-14aa-4720-8ca7-6defa3d97a82	deal_converted_to_project	{"dealId": "d61c65d8-c00d-4f77-9336-7c9e56715215", "projectId": "b87d51b6-a186-4c83-8423-aab2b0b77410", "hoursSinceWon": 0, "activitiesCarriedOver": 1}	2026-08-06 06:13:28.079
e4b599ac-4d91-41f9-bbb2-1b582895c5c0	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	\N	stalling_deal_flagged	{"dealId": "3f8c5a27-723f-496d-8eed-faa63dd34503", "thresholdDays": 5}	2026-08-06 05:46:40.762
ceb8bd6e-ff15-4c88-8cbc-aee9f7768b66	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	\N	capture_coverage	{"openDeals": 2, "percentage": 0, "windowDays": 7, "dealsWithRecentActivity": 0}	2026-08-06 05:46:40.783
0dfef162-1e73-4d53-9215-5e84139cda7b	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	\N	agent_action_created	{"actionId": "f928a994-a338-416f-a57a-96a74cc5d315", "actionType": "CHANGE_DEAL_STAGE", "sourceKind": "EMAIL", "autoApplied": false, "confidenceTier": "HIGH", "guardrailApplied": false}	2026-08-06 05:46:43.811
\.


--
-- Data for Name: ApiToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ApiToken" (id, "organizationId", name, "tokenHash", "tokenPrefix", "lastUsedAt", "revokedAt", "createdAt") FROM stdin;
425a4bdd-b22e-48cd-9dce-ba884b82b4f9	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	journey-harness	91ead18a334c3bbe6de28ba1ecdb388d09e366d003fa8608d31e922eaf209388	ctm_73jBHYb	2026-08-06 05:47:24.541	2026-08-06 05:47:24.571	2026-08-06 05:47:24.523
\.


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, "organizationId", "actorType", "actorId", "actorName", "entityType", "entityId", field, "priorValue", "newValue", "createdAt") FROM stdin;
9568130d-156f-4c56-9e4e-502946585a60	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	HUMAN	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	Alex Rivera	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	stageId	Qualified	Proposal	2026-08-06 05:47:21.507
251faa3a-f168-4507-b1fd-26ae884fb664	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	HUMAN	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	Alex Rivera	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	stageSource	HUMAN	AGENT_INFERRED	2026-08-06 05:47:21.507
93012d50-c58f-4776-8036-138a2a380eda	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	HUMAN	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	Alex Rivera	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	agent:CHANGE_DEAL_STAGE	{"stageName":"Proposal"}	{"stageName":"Proposal"}	2026-08-06 05:47:21.52
71d773d8-6e43-4d83-8ae0-83125db048da	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	HUMAN	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	Alex Rivera	CONTACT	c7ac2e22-c3f2-44de-9894-06e6475d646a	agent:CREATE_CONTACT	{"email":"marcus.bell@northwind-logistics.com","title":null,"dealId":"1d3aa010-3e13-4066-a9fd-2a23d9735b0a","lastName":"Bell","firstName":"Marcus"}	{"email":"marcus.bell@northwind-logistics.com","title":"Head of Security","dealId":"1d3aa010-3e13-4066-a9fd-2a23d9735b0a","lastName":"Bell","firstName":"Marc"}	2026-08-06 05:47:21.591
b80a5723-07f9-4f4f-8ff3-0d4f1d0a2290	033c85aa-d15a-47b9-be4e-229e3f590e49	HUMAN	09ec6c66-b4a7-49df-8394-1ca2894f15cd	Nina Alvarez	PROJECT	fef7ae42-2459-40c7-91ba-5c778d121bc3	convertedFromDeal	Lumen Partners — brand refresh	Lumen Partners — brand refresh	2026-08-06 05:47:21.797
d4755c3c-0537-42a8-a523-47230b64ac7f	c7904668-4dc6-4a89-b778-e21b92b765fb	HUMAN	f681df60-14aa-4720-8ca7-6defa3d97a82	Test User	DEAL	d61c65d8-c00d-4f77-9336-7c9e56715215	created	\N	Acme Corp Deal	2026-08-06 06:02:42.657
fb199323-7bdf-4348-ac87-e18ec11a8720	c7904668-4dc6-4a89-b778-e21b92b765fb	HUMAN	f681df60-14aa-4720-8ca7-6defa3d97a82	Test User	DEAL	d61c65d8-c00d-4f77-9336-7c9e56715215	stageId	New Lead	Contacted	2026-08-06 06:03:11.126
3236d043-33c5-4ce0-80b0-df6688ab546b	c7904668-4dc6-4a89-b778-e21b92b765fb	HUMAN	f681df60-14aa-4720-8ca7-6defa3d97a82	Test User	DEAL	d61c65d8-c00d-4f77-9336-7c9e56715215	stageSource	HUMAN	HUMAN	2026-08-06 06:03:11.126
618929de-778a-4ea0-b691-73262737ef08	c7904668-4dc6-4a89-b778-e21b92b765fb	HUMAN	f681df60-14aa-4720-8ca7-6defa3d97a82	Test User	DEAL	d61c65d8-c00d-4f77-9336-7c9e56715215	note	\N	Called Acme Corp, they are interested in hybrid pipeline.	2026-08-06 06:04:28.402
36bfeb2b-e6d7-49bb-ac3d-28b8db6e3f39	c7904668-4dc6-4a89-b778-e21b92b765fb	HUMAN	f681df60-14aa-4720-8ca7-6defa3d97a82	Test User	CONTACT	24dcfd8b-b9d5-4bdf-98c8-40e6d0e97f60	created	\N	john@example.com	2026-08-06 06:09:00.347
d773551d-c784-4840-b8be-6d15574a502e	c7904668-4dc6-4a89-b778-e21b92b765fb	HUMAN	f681df60-14aa-4720-8ca7-6defa3d97a82	Test User	CONTACT	8757f5e6-8ef2-4972-9a45-46c65f324b6a	created	\N	john.doe@example.com	2026-08-06 06:09:05.117
b67f583c-f65b-4480-87bd-d598769de507	c7904668-4dc6-4a89-b778-e21b92b765fb	HUMAN	f681df60-14aa-4720-8ca7-6defa3d97a82	Test User	DEAL	d61c65d8-c00d-4f77-9336-7c9e56715215	stageId	Contacted	Won	2026-08-06 06:12:03.073
21776cf5-3a45-4462-a0ec-bd2c25e05731	c7904668-4dc6-4a89-b778-e21b92b765fb	HUMAN	f681df60-14aa-4720-8ca7-6defa3d97a82	Test User	DEAL	d61c65d8-c00d-4f77-9336-7c9e56715215	stageSource	HUMAN	HUMAN	2026-08-06 06:12:03.073
85465364-9c41-4526-add5-a1a9a15d158c	c7904668-4dc6-4a89-b778-e21b92b765fb	HUMAN	f681df60-14aa-4720-8ca7-6defa3d97a82	Test User	PROJECT	b87d51b6-a186-4c83-8423-aab2b0b77410	convertedFromDeal	Acme Corp Deal	Acme Corp Deal	2026-08-06 06:13:28.165
\.


--
-- Data for Name: CaptureExclusion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CaptureExclusion" (id, "organizationId", "connectionId", kind, value, "createdAt") FROM stdin;
\.


--
-- Data for Name: Company; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Company" (id, "organizationId", name, domain, website, source, "createdAt", "updatedAt") FROM stdin;
1febc317-a802-4841-9389-aaa38b63b10c	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	Northwind Logistics	northwind-logistics.com	https://northwind-logistics.com	HUMAN	2026-08-06 05:46:39.67	2026-08-06 05:46:39.67
3c7dae6b-e6cc-4723-9ffb-c4de5a96d9a3	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	Meridian Freight	meridianfreight.test	\N	HUMAN	2026-08-06 05:46:39.698	2026-08-06 05:46:39.698
46dc2e8e-bcaa-46be-88f5-8b8741c9d4de	033c85aa-d15a-47b9-be4e-229e3f590e49	Lumen Partners	lumenpartners.test	\N	HUMAN	2026-08-06 05:46:39.824	2026-08-06 05:46:39.824
87662cbf-d082-4fc3-8238-02055e7b4539	033c85aa-d15a-47b9-be4e-229e3f590e49	Harbor Creative	harborcreative.test	\N	HUMAN	2026-08-06 05:46:39.868	2026-08-06 05:46:39.868
\.


--
-- Data for Name: Contact; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Contact" (id, "organizationId", "companyId", email, "firstName", "lastName", phone, title, source, excluded, "createdAt", "updatedAt") FROM stdin;
61b4650c-56b3-4dde-a87e-3c9f8627f0e5	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	3c7dae6b-e6cc-4723-9ffb-c4de5a96d9a3	p.raman@meridianfreight.test	Priya	Raman	\N	Head of Procurement	HUMAN	f	2026-08-06 05:46:39.701	2026-08-06 05:46:39.701
00dab006-9623-4134-9b47-57575550572f	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	1febc317-a802-4841-9389-aaa38b63b10c	dana.whitfield@northwind-logistics.com	Dana	Whitfield	+14155550142	VP Operations	HUMAN	f	2026-08-06 05:46:39.678	2026-08-06 05:46:39.716
fc527b9d-b722-4ff0-9464-424bcac1cf54	033c85aa-d15a-47b9-be4e-229e3f590e49	46dc2e8e-bcaa-46be-88f5-8b8741c9d4de	tomas@lumenpartners.test	Tomas	Lind	\N	Marketing Director	HUMAN	f	2026-08-06 05:46:39.827	2026-08-06 05:46:39.827
8a3729dd-7e99-4bab-8ee1-ed9a9f9aed33	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	1febc317-a802-4841-9389-aaa38b63b10c	marcus.bell@northwind-logistics.com	Marc	Bell	\N	Head of Security	AGENT_INFERRED	f	2026-08-06 05:47:21.566	2026-08-06 05:47:21.566
24dcfd8b-b9d5-4bdf-98c8-40e6d0e97f60	c7904668-4dc6-4a89-b778-e21b92b765fb	\N	john@example.com	\N	\N	\N	\N	HUMAN	f	2026-08-06 06:09:00.185	2026-08-06 06:09:00.185
8757f5e6-8ef2-4972-9a45-46c65f324b6a	c7904668-4dc6-4a89-b778-e21b92b765fb	\N	john.doe@example.com	John	Doe	\N	\N	HUMAN	f	2026-08-06 06:09:05.023	2026-08-06 06:09:05.023
\.


--
-- Data for Name: CustomFieldDef; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CustomFieldDef" (id, "organizationId", "entityType", key, label, type, options, "archivedAt", "createdAt") FROM stdin;
39e401c8-28a8-4ae3-9d8c-42c992f72cb6	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	DEAL	procurement_route	Procurement route	SELECT	{Direct,Reseller,Marketplace}	\N	2026-08-06 05:46:39.731
\.


--
-- Data for Name: CustomFieldValue; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CustomFieldValue" (id, "defId", "entityId", value, "updatedAt") FROM stdin;
\.


--
-- Data for Name: Deal; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Deal" (id, "organizationId", "pipelineId", "stageId", "stageSource", name, status, "valueCents", currency, "ownerId", "companyId", source, "expectedCloseDate", "lastActivityAt", "stallingSince", "closedAt", "needsReview", "reviewReason", "createdAt", "updatedAt") FROM stdin;
f0b2a662-4329-41ee-b880-6540ab469dfd	033c85aa-d15a-47b9-be4e-229e3f590e49	378f2f86-d0d4-4d26-b942-fb94aff6347a	c01f9236-067c-49c4-bbd6-a80478258c43	HUMAN	Lumen Partners — brand refresh	WON	7500000	USD	09ec6c66-b4a7-49df-8394-1ca2894f15cd	46dc2e8e-bcaa-46be-88f5-8b8741c9d4de	HUMAN	\N	2026-08-04 05:46:39.83	\N	2026-08-04 05:46:39.83	f	\N	2026-08-06 05:46:39.831	2026-08-06 05:46:39.831
7ddf55e2-1556-4656-924d-406f5228c9a2	033c85aa-d15a-47b9-be4e-229e3f590e49	378f2f86-d0d4-4d26-b942-fb94aff6347a	b1a671f5-8247-469f-9f5b-613459a90bc2	HUMAN	Harbor Creative — website rebuild	OPEN	6000000	USD	09ec6c66-b4a7-49df-8394-1ca2894f15cd	87662cbf-d082-4fc3-8238-02055e7b4539	HUMAN	\N	2026-08-03 05:46:39.875	\N	\N	f	\N	2026-08-06 05:46:39.875	2026-08-06 05:46:39.875
3f8c5a27-723f-496d-8eed-faa63dd34503	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	5cbb266e-92c5-47ab-ba71-9f449eddf23c	a92cdb22-86aa-47d5-a000-8f21a115e485	HUMAN	Meridian Freight — regional rollout	OPEN	12000000	USD	fd05f565-a0be-42fb-a06b-c7d282b410d6	3c7dae6b-e6cc-4723-9ffb-c4de5a96d9a3	HUMAN	\N	2026-07-19 05:46:39.707	2026-08-06 05:46:40.743	\N	f	\N	2026-07-07 05:46:39.707	2026-08-06 05:46:40.744
1d3aa010-3e13-4066-a9fd-2a23d9735b0a	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	5cbb266e-92c5-47ab-ba71-9f449eddf23c	7fab3bbe-9542-4004-96fc-d46b65a9c604	AGENT_INFERRED	Northwind Logistics — 40-seat pilot	OPEN	4800000	USD	fd05f565-a0be-42fb-a06b-c7d282b410d6	1febc317-a802-4841-9389-aaa38b63b10c	HUMAN	2026-08-27 05:46:39.682	2026-08-05 08:30:00	\N	\N	f	\N	2026-08-06 05:46:39.684	2026-08-06 05:47:21.496
d61c65d8-c00d-4f77-9336-7c9e56715215	c7904668-4dc6-4a89-b778-e21b92b765fb	cc3959be-2e34-43a7-b0fa-c43a25b4b448	be0b781f-dcb5-4186-9e73-b267f5105ab3	HUMAN	Acme Corp Deal	WON	500000	USD	f681df60-14aa-4720-8ca7-6defa3d97a82	\N	HUMAN	\N	2026-08-06 06:04:28.024	\N	2026-08-06 06:12:02.95	f	\N	2026-08-06 06:02:42.573	2026-08-06 06:12:02.964
\.


--
-- Data for Name: DealContact; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DealContact" ("dealId", "contactId", role, "createdAt") FROM stdin;
1d3aa010-3e13-4066-a9fd-2a23d9735b0a	00dab006-9623-4134-9b47-57575550572f	decision maker	2026-08-06 05:46:39.693
3f8c5a27-723f-496d-8eed-faa63dd34503	61b4650c-56b3-4dde-a87e-3c9f8627f0e5	champion	2026-08-06 05:46:39.713
f0b2a662-4329-41ee-b880-6540ab469dfd	fc527b9d-b722-4ff0-9464-424bcac1cf54	decision maker	2026-08-06 05:46:39.835
1d3aa010-3e13-4066-a9fd-2a23d9735b0a	8a3729dd-7e99-4bab-8ee1-ed9a9f9aed33	\N	2026-08-06 05:47:21.573
\.


--
-- Data for Name: ExportJob; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ExportJob" (id, "organizationId", "requestedById", status, "filePath", error, "createdAt", "completedAt") FROM stdin;
2c2826bf-f01b-4f9a-a940-571e82e4950e	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	READY	D:\\Antigravity\\Continuum\\exports\\2c2826bf-f01b-4f9a-a940-571e82e4950e	\N	2026-08-06 05:47:21.884	2026-08-06 05:47:21.979
\.


--
-- Data for Name: FieldPermission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FieldPermission" (id, "organizationId", "entityType", field, role, "canRead", "canWrite") FROM stdin;
\.


--
-- Data for Name: IntegrationConnection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."IntegrationConnection" (id, "organizationId", "userId", provider, status, "accountEmail", "accessToken", "refreshToken", "expiresAt", "syncCursor", "calendarCursor", "lastSyncedAt", "nextPollAt", "backoffSeconds", "failureCount", "lastError", "backfillCompletedAt", "createdAt", "updatedAt") FROM stdin;
7e93e369-f261-4f3d-94a9-f9f8d058848e	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	GOOGLE	CONNECTED	you@continuum.test	2JJOaSNOxPjN+U06.CjiviSoL7xiKcUpZWV0yyg==.c88lNauYxEDrYH3gktBmSsknXuvHZQ==	1etHbuvcpZ1Ihefu.oUz+y2WMULQXglGSSmrzJA==.S+WqBPyZrJLBZMhnw6ow3Lm7C9hwxpY=	2026-08-06 16:52:29.465	10	\N	2026-08-06 16:35:43.437	2026-08-06 16:36:43.437	60	0	\N	2026-08-06 05:46:41.08	2026-08-06 05:46:39.727	2026-08-06 16:35:43.442
\.


--
-- Data for Name: Milestone; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Milestone" (id, "projectId", title, "ownerId", "dueDate", "completedAt", "order", "createdAt") FROM stdin;
8117cfa2-c608-4804-b6b8-77fc81881214	fef7ae42-2459-40c7-91ba-5c778d121bc3	Kickoff workshop	\N	\N	\N	0	2026-08-06 05:47:21.827
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "organizationId", "userId", type, title, body, "entityType", "entityId", "readAt", "createdAt", "dedupeKey") FROM stdin;
a8bcac49-db6e-42d8-9297-2b130bbe0142	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	fd05f565-a0be-42fb-a06b-c7d282b410d6	DEAL_STALLING	Meridian Freight — regional rollout has gone quiet	No captured activity in 5 days.	DEAL	3f8c5a27-723f-496d-8eed-faa63dd34503	\N	2026-08-06 05:46:40.754	stalling:3f8c5a27-723f-496d-8eed-faa63dd34503
b6988514-5414-425d-84d0-3420d8c82861	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	c4e1c60b-0af3-40ca-ace1-14a67b7412f7	AGENT_ACTION_PENDING	Add marcus.bell@northwind-logistics.com as a contact?	marcus.bell@northwind-logistics.com took part in this thread and their domain belongs to a company already in the CRM, but there is no contact for them yet. Creating a record always requires confirmation, whatever the confidence.	CONTACT	\N	\N	2026-08-06 05:46:40.939	agent-action:c7ac2e22-c3f2-44de-9894-06e6475d646a
e2d6ee1c-4c7e-4759-a740-510fbc8aa102	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	fd05f565-a0be-42fb-a06b-c7d282b410d6	AGENT_ACTION_PENDING	Move this deal to Proposal?	The message states: "budget is approved". Stage proposals never advance more than one stage at a time.	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	\N	2026-08-06 05:46:43.816	agent-action:f928a994-a338-416f-a57a-96a74cc5d315
2d36c0cc-78bd-473f-b0ef-9d6a4b4442bb	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	fd05f565-a0be-42fb-a06b-c7d282b410d6	AGENT_ACTION_PENDING	Move this deal to Qualified?	[via MCP] Journey harness check Stage proposals never advance more than one stage at a time.	DEAL	1d3aa010-3e13-4066-a9fd-2a23d9735b0a	\N	2026-08-06 05:47:24.51	agent-action:4581ddaa-372a-44c3-b04c-2983010a91c1
28ea2bfc-eef2-4caa-9788-303b8e355fc7	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	fd05f565-a0be-42fb-a06b-c7d282b410d6	AGENT_ACTION_PENDING	Move this deal to Won?	[via MCP] Journey harness — guardrail check The message suggested moving to Won, which is more than one stage ahead. Proposing Qualified instead — large jumps usually mean the context was misread. Stage proposals never advance more than one stage at a time.	DEAL	3f8c5a27-723f-496d-8eed-faa63dd34503	\N	2026-08-06 05:47:24.699	agent-action:a2a94897-d08e-464e-9937-c68e334fb204
\.


--
-- Data for Name: Organization; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Organization" (id, name, motion, "showProjectsUi", "stallingThresholdDays", "agentHighThreshold", "agentMediumThreshold", "planName", "seatCount", "pricePerSeatCents", "createdAt", "updatedAt", "autoApplyOptIn", "encryptedDataKey") FROM stdin;
d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	Northwind Sales	SALES	f	5	0.8	0.5	Team	2	3900	2026-08-06 05:46:39.501	2026-08-06 05:46:39.501	f	\N
033c85aa-d15a-47b9-be4e-229e3f590e49	Harbor Studio	AGENCY	t	5	0.8	0.5	Team	1	3900	2026-08-06 05:46:39.739	2026-08-06 05:46:39.739	f	\N
0231b15a-38c0-4d75-87de-37634e13b507	Harness 1785995244714	SALES	f	5	0.8	0.5	Team	1	3900	2026-08-06 05:47:24.718	2026-08-06 05:47:24.718	f	\N
c7904668-4dc6-4a89-b778-e21b92b765fb	Test Company	SALES	f	5	0.8	0.5	Team	1	3900	2026-08-06 06:01:24.376	2026-08-06 08:33:55.852	f	\N
\.


--
-- Data for Name: Pipeline; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Pipeline" (id, "organizationId", name, "isDefault", "createdAt") FROM stdin;
5cbb266e-92c5-47ab-ba71-9f449eddf23c	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	Sales Pipeline	t	2026-08-06 05:46:39.659
378f2f86-d0d4-4d26-b942-fb94aff6347a	033c85aa-d15a-47b9-be4e-229e3f590e49	Client Pipeline	t	2026-08-06 05:46:39.816
c438b8f4-2e1c-45e5-9a77-94f2b4003fc8	0231b15a-38c0-4d75-87de-37634e13b507	Sales Pipeline	t	2026-08-06 05:47:24.795
cc3959be-2e34-43a7-b0fa-c43a25b4b448	c7904668-4dc6-4a89-b778-e21b92b765fb	Sales Pipeline	t	2026-08-06 06:01:24.671
\.


--
-- Data for Name: ProcessedMessage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProcessedMessage" (id, "connectionId", "externalRef", "processedAt") FROM stdin;
da5f40f5-8189-4afa-9501-e3640e2097f5	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-msg-001	2026-08-06 05:46:40.758
2584d6df-5fe5-4659-a2f4-463592a8deea	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-msg-002	2026-08-06 05:46:40.823
aa748b29-27b8-4d44-b851-cb464d277f1b	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-msg-003	2026-08-06 05:46:40.863
ce8861f0-5b7c-46c6-b401-5b8227aa2bc6	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-msg-004	2026-08-06 05:46:40.948
5c1dad3f-924b-4b20-8ce7-ba5213e0a51c	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-msg-005	2026-08-06 05:46:40.98
2d0053db-4258-4878-8a43-9e9dcd2286ac	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-msg-006	2026-08-06 05:46:40.984
1689bf88-c789-4636-9f62-2e7c01ea670c	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-msg-007	2026-08-06 05:46:40.99
aa9675c5-4bb6-49be-b709-e9e7ffca79b4	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-msg-008	2026-08-06 05:46:41.012
82c3e509-8f7b-4cf3-8f9f-d8038cc487db	7e93e369-f261-4f3d-94a9-f9f8d058848e	sim-evt-101	2026-08-06 05:46:41.036
\.


--
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Project" (id, "organizationId", name, status, "companyId", "ownerId", "originatingDealId", "startedAt", "completedAt", "createdAt", "updatedAt") FROM stdin;
fef7ae42-2459-40c7-91ba-5c778d121bc3	033c85aa-d15a-47b9-be4e-229e3f590e49	Lumen Partners — brand refresh	ACTIVE	46dc2e8e-bcaa-46be-88f5-8b8741c9d4de	09ec6c66-b4a7-49df-8394-1ca2894f15cd	f0b2a662-4329-41ee-b880-6540ab469dfd	2026-08-06 05:47:21.78	\N	2026-08-06 05:47:21.781	2026-08-06 05:47:21.781
b87d51b6-a186-4c83-8423-aab2b0b77410	c7904668-4dc6-4a89-b778-e21b92b765fb	Acme Corp Deal	ACTIVE	\N	f681df60-14aa-4720-8ca7-6defa3d97a82	d61c65d8-c00d-4f77-9336-7c9e56715215	2026-08-06 06:13:27.636	\N	2026-08-06 06:13:27.65	2026-08-06 06:13:27.65
\.


--
-- Data for Name: ProjectContact; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ProjectContact" ("projectId", "contactId", role) FROM stdin;
fef7ae42-2459-40c7-91ba-5c778d121bc3	fc527b9d-b722-4ff0-9464-424bcac1cf54	decision maker
\.


--
-- Data for Name: Proposal; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Proposal" (id, "organizationId", "dealId", title, body, "signerContactId", "externalRef", status, "sentAt", "signedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Stage; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Stage" (id, "pipelineId", name, "order", "winProbability", "isWonStage", "isLostStage") FROM stdin;
ff8dc38f-344f-4cbc-9361-980dee876d94	c438b8f4-2e1c-45e5-9a77-94f2b4003fc8	New Lead	0	0.1	f	f
3609e71a-c8aa-481b-a393-acf12dc0d5a2	c438b8f4-2e1c-45e5-9a77-94f2b4003fc8	Contacted	1	0.2	f	f
faa6f149-e34a-4c25-a2f2-d513850b34f3	c438b8f4-2e1c-45e5-9a77-94f2b4003fc8	Qualified	2	0.4	f	f
7ba3df54-010c-4598-a25f-e0ebe461ee03	c438b8f4-2e1c-45e5-9a77-94f2b4003fc8	Proposal	3	0.65	f	f
23a76d73-0370-449b-a955-bdd3348637c9	c438b8f4-2e1c-45e5-9a77-94f2b4003fc8	Won	4	1	t	f
99c18beb-6dc2-4b6c-90e0-59a2f2736c8c	c438b8f4-2e1c-45e5-9a77-94f2b4003fc8	Lost	5	0	f	t
f1abe6ed-f5b6-4f3e-9133-5bba3c865772	cc3959be-2e34-43a7-b0fa-c43a25b4b448	New Lead	0	0.1	f	f
85b234e8-2d04-4109-92a1-4b66a9f22367	cc3959be-2e34-43a7-b0fa-c43a25b4b448	Contacted	1	0.2	f	f
9a8b399b-dc88-4f9d-9930-e55efa83445b	cc3959be-2e34-43a7-b0fa-c43a25b4b448	Qualified	2	0.4	f	f
00ffd529-634f-4834-b60a-c78d2847cec2	cc3959be-2e34-43a7-b0fa-c43a25b4b448	Proposal	3	0.65	f	f
be0b781f-dcb5-4186-9e73-b267f5105ab3	cc3959be-2e34-43a7-b0fa-c43a25b4b448	Won	4	1	t	f
a4a65948-6536-4759-bed7-b977b28cb8aa	cc3959be-2e34-43a7-b0fa-c43a25b4b448	Lost	5	0	f	t
16c77eb3-9aaa-428b-9d63-9a295790909f	5cbb266e-92c5-47ab-ba71-9f449eddf23c	New Lead	0	0.1	f	f
a92cdb22-86aa-47d5-a000-8f21a115e485	5cbb266e-92c5-47ab-ba71-9f449eddf23c	Contacted	1	0.2	f	f
7b5673a1-4a02-4d4e-a25a-8c3690ad49db	5cbb266e-92c5-47ab-ba71-9f449eddf23c	Qualified	2	0.4	f	f
7fab3bbe-9542-4004-96fc-d46b65a9c604	5cbb266e-92c5-47ab-ba71-9f449eddf23c	Proposal	3	0.65	f	f
e4082381-dd9a-4002-995c-176e48308365	5cbb266e-92c5-47ab-ba71-9f449eddf23c	Won	4	1	t	f
ab21f967-a6ae-4ef1-b7f8-7c12d328370a	5cbb266e-92c5-47ab-ba71-9f449eddf23c	Lost	5	0	f	t
5e07094b-1012-4990-ae91-2e2c9b101495	378f2f86-d0d4-4d26-b942-fb94aff6347a	Enquiry	0	0.1	f	f
c815676b-1184-47a8-9056-a97dbe8ad99d	378f2f86-d0d4-4d26-b942-fb94aff6347a	Discovery	1	0.25	f	f
b1a671f5-8247-469f-9f5b-613459a90bc2	378f2f86-d0d4-4d26-b942-fb94aff6347a	Scoping	2	0.45	f	f
fab9e0f3-497c-4775-be26-0a3be87d00b9	378f2f86-d0d4-4d26-b942-fb94aff6347a	Proposal Sent	3	0.7	f	f
c01f9236-067c-49c4-bbd6-a80478258c43	378f2f86-d0d4-4d26-b942-fb94aff6347a	Won	4	1	t	f
59a991a7-7d7a-4a9f-b958-e7f10d319565	378f2f86-d0d4-4d26-b942-fb94aff6347a	Lost	5	0	f	t
\.


--
-- Data for Name: Tag; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Tag" (id, "organizationId", name, color, "createdAt") FROM stdin;
\.


--
-- Data for Name: Tagging; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Tagging" ("tagId", "entityType", "entityId") FROM stdin;
\.


--
-- Data for Name: Task; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Task" (id, "organizationId", title, notes, "dueAt", "ownerId", status, source, "entityType", "entityId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Team; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Team" (id, "organizationId", name, "createdAt") FROM stdin;
09083a9b-0831-40c9-94a9-f94311eba9e0	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	Outbound	2026-08-06 05:46:39.575
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, "organizationId", email, "passwordHash", name, role, "teamId", "createdAt", "updatedAt") FROM stdin;
f681df60-14aa-4720-8ca7-6defa3d97a82	c7904668-4dc6-4a89-b778-e21b92b765fb	test_1785996084171@example.com	$2a$10$yRxnrAJQcC4NbqevHZP/8.e1A7asESZ3ia0iKioPpllPqihX9yeV.	Test User	ADMIN	\N	2026-08-06 06:01:24.641	2026-08-06 06:01:24.641
c4e1c60b-0af3-40ca-ace1-14a67b7412f7	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	alex@continuum.test	$2a$10$ae0w.cm8KLyPefrUKHbGHuqg2SMI.kYwiEHRsVJLrLzI2c3c3Sg5C	Alex Rivera	ADMIN	09083a9b-0831-40c9-94a9-f94311eba9e0	2026-08-06 05:46:39.581	2026-08-06 05:46:39.581
fd05f565-a0be-42fb-a06b-c7d282b410d6	d9f4cdcc-7391-4ec2-9c51-e3511ccfd0ed	sam@continuum.test	$2a$10$B6y.0MRpLdZuyuqmc0Fsd.4iEOAcIg0MZUAHpCu8n2fraPqLLHNh2	Sam Okafor	MEMBER	09083a9b-0831-40c9-94a9-f94311eba9e0	2026-08-06 05:46:39.65	2026-08-06 05:46:39.65
09ec6c66-b4a7-49df-8394-1ca2894f15cd	033c85aa-d15a-47b9-be4e-229e3f590e49	nina@harbor.test	$2a$10$jks27hWGdcixRYvZeBBu8uBvKWd3yXosVENctaEwFCXQGl/nTnJFS	Nina Alvarez	ADMIN	\N	2026-08-06 05:46:39.808	2026-08-06 05:46:39.808
d48064d5-6513-4837-9bfc-b478bd2f46fe	0231b15a-38c0-4d75-87de-37634e13b507	harness+1785995244714@continuum.test	$2a$10$4U1prgBPPzyBJxY/SoLKZ.aJynSsjgzpASpAw115zImrfESgwkF.6	Harness	ADMIN	\N	2026-08-06 05:47:24.789	2026-08-06 05:47:24.789
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
72d7b42b-10d2-41ef-ae25-d9fb9a52155f	220d2c7c1973994a035d88542e30e3172be2b1c010b7ccd4a7956d7d33a0923c	2026-08-03 18:57:56.941708+00	20260803185750_init	\N	\N	2026-08-03 18:57:50.022571+00	1
a758fec0-8a7a-45f6-b307-584db8e16715	2cdc19e82b3da41ed64d345820162e8dbc7269c260a36b9a71a48187b4487d85	2026-08-04 06:24:52.688124+00	20260804062452_analytics_guardrails_envelope_encryption	\N	\N	2026-08-04 06:24:52.556046+00	1
478ccf35-8932-4e09-a383-849dcfe032c4	b6857abf094f306ccc7810a4b6a732cf53d36d54610a91f7d8d877ca0721fed0	\N	20260804140000_qc_fixes_dedupe_transient_body	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260804140000_qc_fixes_dedupe_transient_body\n\nDatabase error code: 42601\n\nDatabase error:\nERROR: syntax error at or near "﻿"\n\nPosition:\n[1m  0[0m\n[1m  1[1;31m ﻿-- AlterTable[0m\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42601), message: "syntax error at or near \\"\\u{feff}\\"", detail: None, hint: None, position: Some(Original(1)), where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("scan.l"), line: Some(1244), routine: Some("scanner_yyerror") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260804140000_qc_fixes_dedupe_transient_body"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:113\n   1: schema_commands::commands::apply_migrations::Applying migration\n           with migration_name="20260804140000_qc_fixes_dedupe_transient_body"\n             at schema-engine\\commands\\src\\commands\\apply_migrations.rs:95\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:260	2026-08-05 11:52:54.468828+00	2026-08-05 11:51:57.401722+00	0
41d07463-1fd3-47df-a613-9aac9c93ab6b	d1db17b28141733a2368ed3401dce6805921aac289306d93d55ceb30e4acf6bd	2026-08-05 11:52:58.687518+00	20260804140000_qc_fixes_dedupe_transient_body	\N	\N	2026-08-05 11:52:58.632122+00	1
\.


--
-- Name: ActivityLink ActivityLink_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLink"
    ADD CONSTRAINT "ActivityLink_pkey" PRIMARY KEY (id);


--
-- Name: ActivityParticipant ActivityParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityParticipant"
    ADD CONSTRAINT "ActivityParticipant_pkey" PRIMARY KEY ("activityId", "contactId");


--
-- Name: Activity Activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_pkey" PRIMARY KEY (id);


--
-- Name: AgentAction AgentAction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AgentAction"
    ADD CONSTRAINT "AgentAction_pkey" PRIMARY KEY (id);


--
-- Name: AgentCorrection AgentCorrection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AgentCorrection"
    ADD CONSTRAINT "AgentCorrection_pkey" PRIMARY KEY (id);


--
-- Name: AnalyticsEvent AnalyticsEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnalyticsEvent"
    ADD CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY (id);


--
-- Name: ApiToken ApiToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiToken"
    ADD CONSTRAINT "ApiToken_pkey" PRIMARY KEY (id);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: CaptureExclusion CaptureExclusion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaptureExclusion"
    ADD CONSTRAINT "CaptureExclusion_pkey" PRIMARY KEY (id);


--
-- Name: Company Company_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_pkey" PRIMARY KEY (id);


--
-- Name: Contact Contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contact"
    ADD CONSTRAINT "Contact_pkey" PRIMARY KEY (id);


--
-- Name: CustomFieldDef CustomFieldDef_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomFieldDef"
    ADD CONSTRAINT "CustomFieldDef_pkey" PRIMARY KEY (id);


--
-- Name: CustomFieldValue CustomFieldValue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomFieldValue"
    ADD CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY (id);


--
-- Name: DealContact DealContact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DealContact"
    ADD CONSTRAINT "DealContact_pkey" PRIMARY KEY ("dealId", "contactId");


--
-- Name: Deal Deal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Deal"
    ADD CONSTRAINT "Deal_pkey" PRIMARY KEY (id);


--
-- Name: ExportJob ExportJob_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExportJob"
    ADD CONSTRAINT "ExportJob_pkey" PRIMARY KEY (id);


--
-- Name: FieldPermission FieldPermission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FieldPermission"
    ADD CONSTRAINT "FieldPermission_pkey" PRIMARY KEY (id);


--
-- Name: IntegrationConnection IntegrationConnection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IntegrationConnection"
    ADD CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY (id);


--
-- Name: Milestone Milestone_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Milestone"
    ADD CONSTRAINT "Milestone_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Organization Organization_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Organization"
    ADD CONSTRAINT "Organization_pkey" PRIMARY KEY (id);


--
-- Name: Pipeline Pipeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Pipeline"
    ADD CONSTRAINT "Pipeline_pkey" PRIMARY KEY (id);


--
-- Name: ProcessedMessage ProcessedMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProcessedMessage"
    ADD CONSTRAINT "ProcessedMessage_pkey" PRIMARY KEY (id);


--
-- Name: ProjectContact ProjectContact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectContact"
    ADD CONSTRAINT "ProjectContact_pkey" PRIMARY KEY ("projectId", "contactId");


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: Proposal Proposal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Proposal"
    ADD CONSTRAINT "Proposal_pkey" PRIMARY KEY (id);


--
-- Name: Stage Stage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Stage"
    ADD CONSTRAINT "Stage_pkey" PRIMARY KEY (id);


--
-- Name: Tag Tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_pkey" PRIMARY KEY (id);


--
-- Name: Tagging Tagging_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tagging"
    ADD CONSTRAINT "Tagging_pkey" PRIMARY KEY ("tagId", "entityType", "entityId");


--
-- Name: Task Task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_pkey" PRIMARY KEY (id);


--
-- Name: Team Team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Team"
    ADD CONSTRAINT "Team_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ActivityLink_activityId_entityType_entityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ActivityLink_activityId_entityType_entityId_key" ON public."ActivityLink" USING btree ("activityId", "entityType", "entityId");


--
-- Name: ActivityLink_activityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivityLink_activityId_idx" ON public."ActivityLink" USING btree ("activityId");


--
-- Name: ActivityLink_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivityLink_entityType_entityId_idx" ON public."ActivityLink" USING btree ("entityType", "entityId");


--
-- Name: ActivityParticipant_contactId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivityParticipant_contactId_idx" ON public."ActivityParticipant" USING btree ("contactId");


--
-- Name: Activity_connectionId_externalRef_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Activity_connectionId_externalRef_key" ON public."Activity" USING btree ("connectionId", "externalRef");


--
-- Name: Activity_externalCallId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_externalCallId_idx" ON public."Activity" USING btree ("externalCallId");


--
-- Name: Activity_organizationId_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_organizationId_occurredAt_idx" ON public."Activity" USING btree ("organizationId", "occurredAt");


--
-- Name: Activity_organizationId_summaryStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_organizationId_summaryStatus_idx" ON public."Activity" USING btree ("organizationId", "summaryStatus");


--
-- Name: Activity_organizationId_threadRef_occurredAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_organizationId_threadRef_occurredAt_idx" ON public."Activity" USING btree ("organizationId", "threadRef", "occurredAt");


--
-- Name: Activity_summaryStatus_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_summaryStatus_createdAt_idx" ON public."Activity" USING btree ("summaryStatus", "createdAt");


--
-- Name: Activity_threadRef_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Activity_threadRef_idx" ON public."Activity" USING btree ("threadRef");


--
-- Name: AgentAction_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AgentAction_organizationId_createdAt_idx" ON public."AgentAction" USING btree ("organizationId", "createdAt");


--
-- Name: AgentAction_organizationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AgentAction_organizationId_status_idx" ON public."AgentAction" USING btree ("organizationId", status);


--
-- Name: AgentAction_targetEntityType_targetEntityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AgentAction_targetEntityType_targetEntityId_idx" ON public."AgentAction" USING btree ("targetEntityType", "targetEntityId");


--
-- Name: AgentCorrection_organizationId_companyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AgentCorrection_organizationId_companyId_idx" ON public."AgentCorrection" USING btree ("organizationId", "companyId");


--
-- Name: AnalyticsEvent_name_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON public."AnalyticsEvent" USING btree (name, "createdAt");


--
-- Name: AnalyticsEvent_organizationId_name_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AnalyticsEvent_organizationId_name_createdAt_idx" ON public."AnalyticsEvent" USING btree ("organizationId", name, "createdAt");


--
-- Name: ApiToken_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ApiToken_organizationId_idx" ON public."ApiToken" USING btree ("organizationId");


--
-- Name: ApiToken_tokenHash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON public."ApiToken" USING btree ("tokenHash");


--
-- Name: AuditLog_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_entityType_entityId_idx" ON public."AuditLog" USING btree ("entityType", "entityId");


--
-- Name: AuditLog_organizationId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON public."AuditLog" USING btree ("organizationId", "createdAt");


--
-- Name: CaptureExclusion_organizationId_connectionId_kind_value_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CaptureExclusion_organizationId_connectionId_kind_value_key" ON public."CaptureExclusion" USING btree ("organizationId", "connectionId", kind, value);


--
-- Name: CaptureExclusion_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CaptureExclusion_organizationId_idx" ON public."CaptureExclusion" USING btree ("organizationId");


--
-- Name: Company_organizationId_domain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Company_organizationId_domain_key" ON public."Company" USING btree ("organizationId", domain);


--
-- Name: Company_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Company_organizationId_idx" ON public."Company" USING btree ("organizationId");


--
-- Name: Company_organizationId_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Company_organizationId_name_idx" ON public."Company" USING btree ("organizationId", name);


--
-- Name: Contact_companyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Contact_companyId_idx" ON public."Contact" USING btree ("companyId");


--
-- Name: Contact_organizationId_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Contact_organizationId_email_key" ON public."Contact" USING btree ("organizationId", email);


--
-- Name: Contact_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Contact_organizationId_idx" ON public."Contact" USING btree ("organizationId");


--
-- Name: CustomFieldDef_organizationId_entityType_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CustomFieldDef_organizationId_entityType_key_key" ON public."CustomFieldDef" USING btree ("organizationId", "entityType", key);


--
-- Name: CustomFieldDef_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CustomFieldDef_organizationId_idx" ON public."CustomFieldDef" USING btree ("organizationId");


--
-- Name: CustomFieldValue_defId_entityId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CustomFieldValue_defId_entityId_key" ON public."CustomFieldValue" USING btree ("defId", "entityId");


--
-- Name: CustomFieldValue_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CustomFieldValue_entityId_idx" ON public."CustomFieldValue" USING btree ("entityId");


--
-- Name: DealContact_contactId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DealContact_contactId_idx" ON public."DealContact" USING btree ("contactId");


--
-- Name: Deal_companyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Deal_companyId_idx" ON public."Deal" USING btree ("companyId");


--
-- Name: Deal_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Deal_organizationId_idx" ON public."Deal" USING btree ("organizationId");


--
-- Name: Deal_organizationId_pipelineId_status_updatedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Deal_organizationId_pipelineId_status_updatedAt_idx" ON public."Deal" USING btree ("organizationId", "pipelineId", status, "updatedAt");


--
-- Name: Deal_organizationId_stallingSince_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Deal_organizationId_stallingSince_idx" ON public."Deal" USING btree ("organizationId", "stallingSince");


--
-- Name: Deal_organizationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Deal_organizationId_status_idx" ON public."Deal" USING btree ("organizationId", status);


--
-- Name: Deal_organizationId_status_lastActivityAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Deal_organizationId_status_lastActivityAt_idx" ON public."Deal" USING btree ("organizationId", status, "lastActivityAt");


--
-- Name: Deal_ownerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Deal_ownerId_idx" ON public."Deal" USING btree ("ownerId");


--
-- Name: Deal_stageId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Deal_stageId_idx" ON public."Deal" USING btree ("stageId");


--
-- Name: ExportJob_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExportJob_organizationId_idx" ON public."ExportJob" USING btree ("organizationId");


--
-- Name: FieldPermission_organizationId_entityType_field_role_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FieldPermission_organizationId_entityType_field_role_key" ON public."FieldPermission" USING btree ("organizationId", "entityType", field, role);


--
-- Name: IntegrationConnection_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IntegrationConnection_organizationId_idx" ON public."IntegrationConnection" USING btree ("organizationId");


--
-- Name: IntegrationConnection_status_nextPollAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IntegrationConnection_status_nextPollAt_idx" ON public."IntegrationConnection" USING btree (status, "nextPollAt");


--
-- Name: Milestone_projectId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Milestone_projectId_idx" ON public."Milestone" USING btree ("projectId");


--
-- Name: Notification_userId_dedupeKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON public."Notification" USING btree ("userId", "dedupeKey");


--
-- Name: Notification_userId_readAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_userId_readAt_idx" ON public."Notification" USING btree ("userId", "readAt");


--
-- Name: Pipeline_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Pipeline_organizationId_idx" ON public."Pipeline" USING btree ("organizationId");


--
-- Name: ProcessedMessage_connectionId_externalRef_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProcessedMessage_connectionId_externalRef_key" ON public."ProcessedMessage" USING btree ("connectionId", "externalRef");


--
-- Name: ProcessedMessage_connectionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProcessedMessage_connectionId_idx" ON public."ProcessedMessage" USING btree ("connectionId");


--
-- Name: ProjectContact_contactId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ProjectContact_contactId_idx" ON public."ProjectContact" USING btree ("contactId");


--
-- Name: Project_companyId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_companyId_idx" ON public."Project" USING btree ("companyId");


--
-- Name: Project_organizationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_organizationId_status_idx" ON public."Project" USING btree ("organizationId", status);


--
-- Name: Project_originatingDealId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Project_originatingDealId_key" ON public."Project" USING btree ("originatingDealId");


--
-- Name: Project_ownerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Project_ownerId_idx" ON public."Project" USING btree ("ownerId");


--
-- Name: Proposal_dealId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Proposal_dealId_idx" ON public."Proposal" USING btree ("dealId");


--
-- Name: Proposal_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Proposal_organizationId_idx" ON public."Proposal" USING btree ("organizationId");


--
-- Name: Stage_pipelineId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Stage_pipelineId_idx" ON public."Stage" USING btree ("pipelineId");


--
-- Name: Stage_pipelineId_order_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Stage_pipelineId_order_key" ON public."Stage" USING btree ("pipelineId", "order");


--
-- Name: Tag_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tag_organizationId_idx" ON public."Tag" USING btree ("organizationId");


--
-- Name: Tag_organizationId_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tag_organizationId_name_key" ON public."Tag" USING btree ("organizationId", name);


--
-- Name: Tagging_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Tagging_entityType_entityId_idx" ON public."Tagging" USING btree ("entityType", "entityId");


--
-- Name: Task_organizationId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_organizationId_status_idx" ON public."Task" USING btree ("organizationId", status);


--
-- Name: Task_ownerId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Task_ownerId_idx" ON public."Task" USING btree ("ownerId");


--
-- Name: Team_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Team_organizationId_idx" ON public."Team" USING btree ("organizationId");


--
-- Name: User_organizationId_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_organizationId_email_key" ON public."User" USING btree ("organizationId", email);


--
-- Name: User_organizationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_organizationId_idx" ON public."User" USING btree ("organizationId");


--
-- Name: User_teamId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_teamId_idx" ON public."User" USING btree ("teamId");


--
-- Name: ActivityLink ActivityLink_activityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLink"
    ADD CONSTRAINT "ActivityLink_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public."Activity"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActivityParticipant ActivityParticipant_activityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityParticipant"
    ADD CONSTRAINT "ActivityParticipant_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public."Activity"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActivityParticipant ActivityParticipant_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityParticipant"
    ADD CONSTRAINT "ActivityParticipant_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Activity Activity_connectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES public."IntegrationConnection"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Activity Activity_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Activity"
    ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AgentAction AgentAction_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AgentAction"
    ADD CONSTRAINT "AgentAction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AgentAction AgentAction_reviewedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AgentAction"
    ADD CONSTRAINT "AgentAction_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AgentAction AgentAction_sourceActivityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AgentAction"
    ADD CONSTRAINT "AgentAction_sourceActivityId_fkey" FOREIGN KEY ("sourceActivityId") REFERENCES public."Activity"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AgentCorrection AgentCorrection_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AgentCorrection"
    ADD CONSTRAINT "AgentCorrection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AgentCorrection AgentCorrection_correctedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AgentCorrection"
    ADD CONSTRAINT "AgentCorrection_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AgentCorrection AgentCorrection_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AgentCorrection"
    ADD CONSTRAINT "AgentCorrection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AnalyticsEvent AnalyticsEvent_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AnalyticsEvent"
    ADD CONSTRAINT "AnalyticsEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApiToken ApiToken_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ApiToken"
    ADD CONSTRAINT "ApiToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: AuditLog AuditLog_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CaptureExclusion CaptureExclusion_connectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaptureExclusion"
    ADD CONSTRAINT "CaptureExclusion_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES public."IntegrationConnection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CaptureExclusion CaptureExclusion_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CaptureExclusion"
    ADD CONSTRAINT "CaptureExclusion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Company Company_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Contact Contact_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contact"
    ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Contact Contact_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Contact"
    ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CustomFieldDef CustomFieldDef_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomFieldDef"
    ADD CONSTRAINT "CustomFieldDef_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CustomFieldValue CustomFieldValue_defId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CustomFieldValue"
    ADD CONSTRAINT "CustomFieldValue_defId_fkey" FOREIGN KEY ("defId") REFERENCES public."CustomFieldDef"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealContact DealContact_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DealContact"
    ADD CONSTRAINT "DealContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealContact DealContact_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DealContact"
    ADD CONSTRAINT "DealContact_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."Deal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Deal Deal_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Deal"
    ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Deal Deal_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Deal"
    ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Deal Deal_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Deal"
    ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Deal Deal_pipelineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Deal"
    ADD CONSTRAINT "Deal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES public."Pipeline"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Deal Deal_stageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Deal"
    ADD CONSTRAINT "Deal_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES public."Stage"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ExportJob ExportJob_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExportJob"
    ADD CONSTRAINT "ExportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExportJob ExportJob_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExportJob"
    ADD CONSTRAINT "ExportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FieldPermission FieldPermission_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FieldPermission"
    ADD CONSTRAINT "FieldPermission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IntegrationConnection IntegrationConnection_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IntegrationConnection"
    ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IntegrationConnection IntegrationConnection_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."IntegrationConnection"
    ADD CONSTRAINT "IntegrationConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Milestone Milestone_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Milestone"
    ADD CONSTRAINT "Milestone_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Milestone Milestone_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Milestone"
    ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Pipeline Pipeline_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Pipeline"
    ADD CONSTRAINT "Pipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProcessedMessage ProcessedMessage_connectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProcessedMessage"
    ADD CONSTRAINT "ProcessedMessage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES public."IntegrationConnection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectContact ProjectContact_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectContact"
    ADD CONSTRAINT "ProjectContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public."Contact"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProjectContact ProjectContact_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProjectContact"
    ADD CONSTRAINT "ProjectContact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Project Project_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Project Project_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Project Project_originatingDealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_originatingDealId_fkey" FOREIGN KEY ("originatingDealId") REFERENCES public."Deal"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Project Project_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Proposal Proposal_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Proposal"
    ADD CONSTRAINT "Proposal_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."Deal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Proposal Proposal_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Proposal"
    ADD CONSTRAINT "Proposal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Stage Stage_pipelineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Stage"
    ADD CONSTRAINT "Stage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES public."Pipeline"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Tag Tag_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tag"
    ADD CONSTRAINT "Tag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Tagging Tagging_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tagging"
    ADD CONSTRAINT "Tagging_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public."Tag"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Task Task_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Task Task_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Task"
    ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Team Team_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Team"
    ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_organizationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES public."Organization"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_teamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES public."Team"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict CRwhEgkMzVPGTB0uxlLHAqXW8IWFfM34c5gGjY1C73GPNM5e1q8swg5pgok11BR

