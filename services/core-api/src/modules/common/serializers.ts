import type {
  ActivityDTO,
  AgentActionDTO,
  CompanyDTO,
  ContactDTO,
  DealDTO,
  IntegrationConnectionDTO,
  MilestoneDTO,
  NotificationDTO,
  PipelineDTO,
  ProjectDTO,
  TaskDTO,
  UserDTO,
} from '@continuum/shared';
import { displayName } from '../../lib/email.js';

type Row = Record<string, any>;

const iso = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;
const isoRequired = (value: Date): string => value.toISOString();

export function serializeUser(row: Row): UserDTO {
  return {
    id: row.id,
    organizationId: row.organizationId,
    email: row.email,
    name: row.name,
    role: row.role,
    teamId: row.teamId ?? null,
    createdAt: isoRequired(row.createdAt),
  };
}

export function serializeCompany(
  row: Row,
  tags: string[] = [],
  customFields: Record<string, unknown> = {},
): CompanyDTO {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain ?? null,
    website: row.website ?? null,
    source: row.source,
    tags,
    customFields,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

export function serializeContact(
  row: Row,
  tags: string[] = [],
  customFields: Record<string, unknown> = {},
): ContactDTO {
  return {
    id: row.id,
    firstName: row.firstName ?? null,
    lastName: row.lastName ?? null,
    fullName: displayName(row.firstName, row.lastName, row.email),
    email: row.email,
    phone: row.phone ?? null,
    title: row.title ?? null,
    companyId: row.companyId ?? null,
    company: row.company
      ? { id: row.company.id, name: row.company.name, domain: row.company.domain ?? null }
      : null,
    source: row.source,
    excluded: row.excluded ?? false,
    tags,
    customFields,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

export function serializePipeline(row: Row): PipelineDTO {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.isDefault,
    stages: (row.stages ?? [])
      .slice()
      .sort((a: Row, b: Row) => a.order - b.order)
      .map((stage: Row) => ({
        id: stage.id,
        pipelineId: stage.pipelineId,
        name: stage.name,
        order: stage.order,
        winProbability: stage.winProbability,
        isWonStage: stage.isWonStage,
        isLostStage: stage.isLostStage,
      })),
  };
}

export function serializeDeal(
  row: Row,
  tags: string[] = [],
  customFields: Record<string, unknown> = {},
): DealDTO {
  return {
    id: row.id,
    name: row.name,
    pipelineId: row.pipelineId,
    stageId: row.stageId,
    stageSource: row.stageSource,
    status: row.status,
    valueCents: row.valueCents ?? null,
    currency: row.currency,
    ownerId: row.ownerId ?? null,
    companyId: row.companyId ?? null,
    company: row.company
      ? { id: row.company.id, name: row.company.name, domain: row.company.domain ?? null }
      : null,
    contacts: (row.contacts ?? []).map((dc: Row) => ({
      contactId: dc.contactId,
      role: dc.role ?? null,
      contact: {
        id: dc.contact.id,
        fullName: displayName(dc.contact.firstName, dc.contact.lastName, dc.contact.email),
        email: dc.contact.email,
        title: dc.contact.title ?? null,
      },
    })),
    expectedCloseDate: iso(row.expectedCloseDate),
    stallingSince: iso(row.stallingSince),
    lastActivityAt: iso(row.lastActivityAt),
    convertedProjectId: row.project?.id ?? null,
    needsReview: row.needsReview ?? false,
    reviewReason: row.reviewReason ?? null,
    source: row.source,
    tags,
    customFields,
    createdAt: isoRequired(row.createdAt),
    updatedAt: isoRequired(row.updatedAt),
  };
}

export function serializeActivity(row: Row): ActivityDTO {
  return {
    id: row.id,
    type: row.type,
    direction: row.direction,
    subject: row.subject ?? null,
    body: row.body ?? null,
    occurredAt: isoRequired(row.occurredAt),
    durationSeconds: row.durationSeconds ?? null,
    callOutcome: row.callOutcome ?? null,
    recordingUrl: row.recordingUrl ?? null,
    transcript: row.transcript ?? null,
    aiSummary: row.aiSummary ?? null,
    sentiment: row.sentiment ?? null,
    nextStep: row.nextStep ?? null,
    summaryStatus: row.summaryStatus,
    source: row.source,
    participants: (row.participants ?? []).map((p: Row) => ({
      contactId: p.contactId,
      fullName: displayName(p.contact?.firstName, p.contact?.lastName, p.contact?.email ?? ''),
      email: p.contact?.email ?? '',
    })),
    createdAt: isoRequired(row.createdAt),
  };
}

export function serializeAgentAction(row: Row): AgentActionDTO {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    targetEntityType: row.targetEntityType,
    targetEntityId: row.targetEntityId ?? null,
    proposedPayload: (row.proposedPayload ?? {}) as Record<string, unknown>,
    appliedPayload: (row.appliedPayload ?? null) as Record<string, unknown> | null,
    confidenceScore: row.confidenceScore,
    tier: row.tier,
    rationale: row.rationale ?? null,
    sourceActivityId: row.sourceActivityId ?? null,
    sourceActivity: row.sourceActivity
      ? {
          id: row.sourceActivity.id,
          type: row.sourceActivity.type,
          subject: row.sourceActivity.subject ?? null,
          occurredAt: isoRequired(row.sourceActivity.occurredAt),
        }
      : null,
    reviewedByUserId: row.reviewedByUserId ?? null,
    reviewedByName: row.reviewedBy?.name ?? null,
    reviewedAt: iso(row.reviewedAt),
    failureReason: row.failureReason ?? null,
    createdAt: isoRequired(row.createdAt),
  };
}

export function serializeMilestone(row: Row): MilestoneDTO {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    ownerId: row.ownerId ?? null,
    dueDate: iso(row.dueDate),
    completedAt: iso(row.completedAt),
    order: row.order,
  };
}

export function serializeProject(
  row: Row,
  customFields: Record<string, unknown> = {},
): ProjectDTO {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    companyId: row.companyId ?? null,
    company: row.company
      ? { id: row.company.id, name: row.company.name, domain: row.company.domain ?? null }
      : null,
    ownerId: row.ownerId ?? null,
    originatingDealId: row.originatingDealId ?? null,
    startedAt: iso(row.startedAt),
    completedAt: iso(row.completedAt),
    milestones: (row.milestones ?? []).map(serializeMilestone),
    contacts: (row.contacts ?? []).map((pc: Row) => ({
      contactId: pc.contactId,
      role: pc.role ?? null,
      contact: {
        id: pc.contact.id,
        fullName: displayName(pc.contact.firstName, pc.contact.lastName, pc.contact.email),
        email: pc.contact.email,
        title: pc.contact.title ?? null,
      },
    })),
    customFields,
    createdAt: isoRequired(row.createdAt),
  };
}

export function serializeTask(row: Row): TaskDTO {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? null,
    dueAt: iso(row.dueAt),
    ownerId: row.ownerId ?? null,
    status: row.status,
    source: row.source,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
    createdAt: isoRequired(row.createdAt),
  };
}

export function serializeConnection(row: Row): IntegrationConnectionDTO {
  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    accountEmail: row.accountEmail ?? null,
    lastSyncedAt: iso(row.lastSyncedAt),
    lastError: row.lastError ?? null,
    backoffSeconds: row.backoffSeconds,
    createdAt: isoRequired(row.createdAt),
  };
}

export function serializeNotification(row: Row): NotificationDTO {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? null,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
    readAt: iso(row.readAt),
    createdAt: isoRequired(row.createdAt),
  };
}
