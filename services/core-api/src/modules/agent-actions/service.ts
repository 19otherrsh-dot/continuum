import type { AgentActionType, EntityType } from '@continuum/shared';
import { evaluateAutonomy } from '../../ai/autonomy.js';
import { adjustConfidence, gate, trajectoryFrom } from '../../ai/confidence.js';
import { clampStageChange, describeGuardrail, filterEnrichment } from '../../ai/guardrails.js';
import type { ProposedAction } from '../../ai/schemas.js';
import { track } from '../../analytics/events.js';
import { prisma } from '../../db/client.js';
import { orgId, requireContext } from '../../db/context.js';
import { recordAudit } from '../../lib/audit.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { notify } from '../notifications/service.js';
import { ensureCompanyForDomain } from '../../ingestion/matching-engine.js';
import { linkContactToDeal, moveDealToStage } from '../deals/service.js';

export const agentActionInclude = {
  sourceActivity: { select: { id: true, type: true, subject: true, occurredAt: true } },
  reviewedBy: { select: { id: true, name: true } },
} as const;

interface RecordProposalsInput {
  /** Null for proposals that did not originate from a captured activity (e.g. via MCP). */
  activityId: string | null;
  dealId: string | null;
  companyId: string | null;
  actions: ProposedAction[];
  /** Source medium, used to weight reliability — a transcript is noisier than email (§25.2). */
  sourceKind?: 'EMAIL' | 'CALL' | 'MEETING' | 'NOTE';
  /** Marks the origin in the rationale, so the log says where a proposal came from. */
  originLabel?: string;
}

export interface RecordedProposal {
  id: string;
  type: AgentActionType;
  tier: string;
  confidence: number;
  payload: Record<string, unknown>;
  guardrailNote: string | null;
}

/**
 * Persists model proposals as pending Agent Actions.
 *
 * Nothing here touches the target record. The whole point of the object is
 * that the AI's intent and the record's state are separate until a human joins
 * them (FR-AGENT-01).
 *
 * **This is the only way a proposal gets created.** The MCP interface routes
 * through here too rather than writing rows itself, so guardrails, confidence
 * adjustment, threshold gating and the autonomy policy cannot be bypassed by
 * pointing a different agent at the API — which would make the trust guarantee
 * worthless.
 */
export async function recordProposals(
  input: RecordProposalsInput,
): Promise<RecordedProposal[]> {
  const recorded: RecordedProposal[] = [];
  if (input.actions.length === 0) return recorded;

  const { organizationId } = requireContext();
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const thresholds = { high: org.agentHighThreshold, medium: org.agentMediumThreshold };

  const priorCorrections = input.companyId
    ? await prisma.agentCorrection.count({ where: { companyId: input.companyId } })
    : 0;
  const priorConfirmations = input.companyId
    ? await prisma.agentAction.count({
        where: { status: 'CONFIRMED', targetEntityId: input.dealId ?? undefined },
      })
    : 0;

  // Trajectory context: is this deal actually moving, or has it gone quiet?
  // A forward proposal on a stalled deal is far weaker evidence than the same
  // sentence on one with recent positive signal (§25.2).
  let recentSentiments: (('POSITIVE' | 'NEUTRAL' | 'NEGATIVE') | null)[] = [];
  let isStalling = false;
  let stageContext: Awaited<ReturnType<typeof loadStageContext>> = null;

  if (input.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: input.dealId },
      select: { stallingSince: true },
    });
    isStalling = Boolean(deal?.stallingSince);

    const recent = await prisma.activity.findMany({
      where: { links: { some: { entityType: 'DEAL', entityId: input.dealId } } },
      orderBy: { occurredAt: 'desc' },
      take: 5,
      select: { sentiment: true },
    });
    recentSentiments = recent.map((a) => a.sentiment);
    stageContext = await loadStageContext(input.dealId);
  }

  for (const action of input.actions) {
    const target = resolveTarget(action, input.dealId);
    if (!target) continue;

    let payload = action.payload;
    let guardrailNote: string | null = null;

    /**
     * Guardrails run *before* gating and are not overridable by confidence.
     * A high score says the model read the message correctly; a guardrail says
     * that even a correct reading does not justify this shape of change
     * (§25.4).
     */
    if (action.type === 'CHANGE_DEAL_STAGE' && stageContext) {
      const outcome = clampStageChange(payload, stageContext);
      if (!outcome.allowed) continue;
      payload = outcome.payload;
      guardrailNote = outcome.note ?? null;
    }

    const advancing = action.type === 'CHANGE_DEAL_STAGE' || action.type === 'UPDATE_DEAL';
    const confidence = adjustConfidence(action.confidence, {
      priorCorrections,
      priorConfirmations,
      sparseContent: false,
      sourceKind: input.sourceKind,
      trajectory: trajectoryFrom({ recentSentiments, isStalling, advancing }),
    });

    const decision = gate(confidence, thresholds);
    if (!decision.persist) {
      // Below threshold: no row at all. Silence beats a low-confidence guess.
      continue;
    }

    // Two proposals racing for the same record would put contradictory
    // suggestions in front of the user, so the second is suppressed while the
    // first is still pending (Epic F edge case).
    const alreadyPending = await prisma.agentAction.findFirst({
      where: {
        status: 'PENDING',
        type: action.type as AgentActionType,
        targetEntityType: target.entityType,
        targetEntityId: target.entityId,
      },
    });
    if (alreadyPending) continue;

    /**
     * The autonomy gate. At V1 this always returns false — every suggestion
     * waits for a person, regardless of confidence tier (§25.5, FR-AGENT-01).
     * It is consulted rather than assumed so that enabling a later phase is a
     * single deliberate change in one file, not something reachable by tuning
     * a threshold somewhere else.
     */
    const autonomy = evaluateAutonomy({
      type: action.type as AgentActionType,
      confidence,
      workspaceOptedIn: org.autoApplyOptIn,
    });

    const rationale = [
      input.originLabel,
      action.rationale,
      guardrailNote,
      describeGuardrail(action.type as AgentActionType),
    ]
      .filter(Boolean)
      .join(' ');

    const created = await prisma.agentAction.create({
      data: {
        organizationId: orgId(),
        type: action.type as AgentActionType,
        status: autonomy.autoApply ? 'AUTO_APPLIED' : 'PENDING',
        targetEntityType: target.entityType,
        targetEntityId: target.entityId,
        proposedPayload: payload as object,
        confidenceScore: confidence,
        tier: decision.tier,
        rationale,
        sourceActivityId: input.activityId,
      },
    });

    await track('agent_action_created', {
      actionId: created.id,
      actionType: action.type,
      confidenceTier: decision.tier,
      autoApplied: autonomy.autoApply,
      guardrailApplied: guardrailNote !== null,
      sourceKind: input.sourceKind ?? null,
    });

    recorded.push({
      id: created.id,
      type: action.type as AgentActionType,
      tier: decision.tier,
      confidence,
      payload,
      guardrailNote,
    });

    // Only high-confidence proposals interrupt anyone. Medium-tier ones wait
    // in the log until the user goes looking.
    if (decision.prominent && !autonomy.autoApply) {
      await notify({
        type: 'AGENT_ACTION_PENDING',
        title: describeAction(action),
        body: rationale || null,
        entityType: target.entityType,
        entityId: target.entityId,
        dedupeKey: `agent-action:${created.id}`,
      });
    }
  }

  return recorded;
}

/** Ordered stages for a deal's pipeline, for the single-hop guardrail. */
async function loadStageContext(dealId: string) {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId },
    include: { stage: true, pipeline: { include: { stages: { orderBy: { order: 'asc' } } } } },
  });
  if (!deal) return null;

  return {
    currentStageName: deal.stage.name,
    orderedStages: deal.pipeline.stages.map((s) => ({
      name: s.name,
      order: s.order,
      isWonStage: s.isWonStage,
      isLostStage: s.isLostStage,
    })),
  };
}

function resolveTarget(
  action: ProposedAction,
  dealId: string | null,
): { entityType: EntityType; entityId: string | null } | null {
  switch (action.type) {
    case 'CHANGE_DEAL_STAGE':
    case 'UPDATE_DEAL':
    case 'LINK_CONTACT_TO_DEAL':
      return dealId ? { entityType: 'DEAL', entityId: dealId } : null;
    case 'CREATE_CONTACT':
      // No target row yet — the proposal is to create one.
      return { entityType: 'CONTACT', entityId: null };
    case 'UPDATE_CONTACT':
      return typeof action.payload.contactId === 'string'
        ? { entityType: 'CONTACT', entityId: action.payload.contactId }
        : null;
    case 'CREATE_TASK':
      return { entityType: 'TASK', entityId: null };
    default:
      return null;
  }
}

function describeAction(action: ProposedAction): string {
  switch (action.type) {
    case 'CREATE_CONTACT':
      return `Add ${String(action.payload.email ?? 'a new contact')} as a contact?`;
    case 'CHANGE_DEAL_STAGE':
      return `Move this deal to ${String(action.payload.stageName ?? 'a new stage')}?`;
    case 'CREATE_TASK':
      return `Create task: ${String(action.payload.title ?? 'follow up')}?`;
    case 'LINK_CONTACT_TO_DEAL':
      return 'Add this contact to the deal?';
    default:
      return 'Suggested update to this record';
  }
}

/**
 * Applies a confirmed proposal.
 *
 * `correctedPayload` is the important parameter. When the user fixes a
 * misparsed name before accepting, the corrected value — not the original
 * proposal — is what gets written, and the delta is retained as context for
 * future inference on that account (FR-AGENT-03, FR-AGENT-04).
 */
export async function confirmAgentAction(
  actionId: string,
  correctedPayload?: Record<string, unknown>,
) {
  const ctx = requireContext();
  const action = await prisma.agentAction.findFirst({ where: { id: actionId } });
  if (!action) throw notFound('Agent action');
  if (action.status !== 'PENDING') {
    throw conflict(`This proposal was already ${action.status.toLowerCase()}.`);
  }

  const proposed = (action.proposedPayload ?? {}) as Record<string, unknown>;
  const applied = { ...proposed, ...(correctedPayload ?? {}) };

  try {
    const companyId = await applyAction(action.type, action.targetEntityId, applied);

    await prisma.agentAction.update({
      where: { id: actionId },
      data: {
        status: 'CONFIRMED',
        appliedPayload: applied as object,
        reviewedByUserId: ctx.userId,
        reviewedAt: new Date(),
      },
    });

    if (correctedPayload) {
      await retainCorrections(action.type, proposed, applied, companyId);
    }

    // The core trust metric: acceptance rate by action type, and whether the
    // user had to correct us first (§38, §39 — 70%+ confirmed without
    // correction by month 3).
    const edited = JSON.stringify(proposed) !== JSON.stringify(applied);
    await track('agent_action_resolved', {
      actionId,
      actionType: action.type,
      outcome: edited ? 'edited' : 'confirmed',
      confidenceTier: action.tier,
      secondsToResolution: Math.round((Date.now() - action.createdAt.getTime()) / 1000),
    });

    await recordAudit({
      entityType: action.targetEntityType,
      entityId: action.targetEntityId ?? actionId,
      field: `agent:${action.type}`,
      priorValue: JSON.stringify(proposed),
      newValue: JSON.stringify(applied),
    });
  } catch (error) {
    // Most often the target was deleted between proposal and confirmation.
    // Fail visibly on the action rather than creating an orphaned update
    // (Epic F edge case).
    await prisma.agentAction.update({
      where: { id: actionId },
      data: {
        status: 'FAILED',
        failureReason: error instanceof Error ? error.message : String(error),
        reviewedByUserId: ctx.userId,
        reviewedAt: new Date(),
      },
    });
    throw error;
  }

  return prisma.agentAction.findFirstOrThrow({
    where: { id: actionId },
    include: agentActionInclude,
  });
}

async function applyAction(
  type: AgentActionType,
  targetEntityId: string | null,
  payload: Record<string, unknown>,
): Promise<string | null> {
  switch (type) {
    case 'CREATE_CONTACT': {
      const email = String(payload.email ?? '').toLowerCase();
      if (!email) throw badRequest('Proposal is missing an email address');

      const domain = email.split('@')[1] ?? '';
      const companyId = domain ? await ensureCompanyForDomain(domain) : null;

      const contact = await prisma.contact.upsert({
        where: { organizationId_email: { organizationId: orgId(), email } },
        create: {
          organizationId: orgId(),
          email,
          firstName: (payload.firstName as string | null) ?? null,
          lastName: (payload.lastName as string | null) ?? null,
          title: (payload.title as string | null) ?? null,
          companyId,
          // Confirmed by a human, but the value originated with the agent —
          // the timeline should keep saying so.
          source: 'AGENT_INFERRED',
        },
        update: {
          firstName: (payload.firstName as string | null) ?? undefined,
          lastName: (payload.lastName as string | null) ?? undefined,
          title: (payload.title as string | null) ?? undefined,
        },
      });

      if (typeof payload.dealId === 'string') {
        await linkContactToDeal(payload.dealId, contact.id, null);
      }
      return companyId;
    }

    case 'UPDATE_CONTACT': {
      if (!targetEntityId) throw badRequest('Proposal has no target contact');
      const contact = await prisma.contact.findFirst({ where: { id: targetEntityId } });
      if (!contact) throw notFound('Contact');

      /**
       * An agent update to an existing contact is enrichment, and the §25.4
       * enrichment guardrail applies: fill blanks only, never overwrite a
       * value a person entered. A contact whose `source` is HUMAN was typed by
       * someone, so every populated field on it is off limits — at any
       * confidence, and even though a human is confirming this proposal. They
       * are agreeing to the addition, not auditing every field for
       * overwrites.
       */
      const humanEntered = new Set<string>(
        contact.source === 'HUMAN'
          ? (['firstName', 'lastName', 'title', 'phone'] as const).filter(
              (field) => contact[field] !== null && contact[field] !== '',
            )
          : [],
      );

      const guarded = filterEnrichment(
        {
          firstName: payload.firstName,
          lastName: payload.lastName,
          title: payload.title,
          phone: payload.phone,
        },
        {
          firstName: contact.firstName,
          lastName: contact.lastName,
          title: contact.title,
          phone: contact.phone,
        },
        humanEntered,
      );

      if (!guarded.allowed) throw badRequest(guarded.reason);

      await prisma.contact.update({ where: { id: targetEntityId }, data: guarded.payload });
      return contact.companyId;
    }

    case 'CHANGE_DEAL_STAGE': {
      if (!targetEntityId) throw badRequest('Proposal has no target deal');
      const deal = await prisma.deal.findFirst({ where: { id: targetEntityId } });
      if (!deal) throw notFound('Deal');

      const stageName = String(payload.stageName ?? '');
      const stage = await prisma.stage.findFirst({
        where: { pipelineId: deal.pipelineId, name: stageName },
      });
      if (!stage) throw badRequest(`No stage named "${stageName}" in this pipeline`);

      // stageSource records that this came from the agent, even though a human
      // pressed the button.
      await moveDealToStage(targetEntityId, stage.id, 'AGENT_INFERRED');
      return deal.companyId;
    }

    case 'UPDATE_DEAL': {
      if (!targetEntityId) throw badRequest('Proposal has no target deal');
      const deal = await prisma.deal.findFirst({ where: { id: targetEntityId } });
      if (!deal) throw notFound('Deal');

      await prisma.deal.update({
        where: { id: targetEntityId },
        data: {
          name: (payload.name as string | undefined) ?? undefined,
          valueCents:
            typeof payload.valueCents === 'number' ? payload.valueCents : undefined,
          expectedCloseDate:
            typeof payload.expectedCloseDate === 'string'
              ? new Date(payload.expectedCloseDate)
              : undefined,
        },
      });
      return deal.companyId;
    }

    case 'LINK_CONTACT_TO_DEAL': {
      if (!targetEntityId) throw badRequest('Proposal has no target deal');
      const contactId = String(payload.contactId ?? '');
      if (!contactId) throw badRequest('Proposal is missing a contact');
      await linkContactToDeal(targetEntityId, contactId, (payload.role as string) ?? null);
      const deal = await prisma.deal.findFirst({ where: { id: targetEntityId } });
      return deal?.companyId ?? null;
    }

    case 'CREATE_TASK': {
      await prisma.task.create({
        data: {
          organizationId: orgId(),
          title: String(payload.title ?? 'Follow up'),
          notes: (payload.notes as string | null) ?? null,
          dueAt: typeof payload.dueAt === 'string' ? new Date(payload.dueAt) : null,
          ownerId: requireContext().userId,
          entityType: (payload.entityType as EntityType | undefined) ?? null,
          entityId: (payload.entityId as string | undefined) ?? null,
          // Persists regardless of status, so an agent-created task stays
          // identifiable after someone completes it.
          source: 'AGENT_INFERRED',
        },
      });
      return null;
    }

    default:
      throw badRequest(`Unsupported action type ${type}`);
  }
}

/**
 * Stores the difference between what the agent proposed and what the user
 * accepted. This is the account-specific signal that makes the agent better on
 * *this* customer over time (FR-AGENT-04).
 */
async function retainCorrections(
  actionType: AgentActionType,
  proposed: Record<string, unknown>,
  applied: Record<string, unknown>,
  companyId: string | null,
): Promise<void> {
  const ctx = requireContext();
  const rows: {
    organizationId: string;
    companyId: string | null;
    actionType: string;
    fieldPath: string;
    originalValue: string | null;
    correctedValue: string | null;
    correctedById: string | null;
  }[] = [];

  for (const [field, newValue] of Object.entries(applied)) {
    const oldValue = proposed[field];
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    rows.push({
      organizationId: ctx.organizationId,
      companyId,
      actionType,
      fieldPath: field,
      originalValue: oldValue === undefined ? null : String(oldValue),
      correctedValue: newValue === undefined ? null : String(newValue),
      correctedById: ctx.userId,
    });
  }

  if (rows.length > 0) {
    await prisma.agentCorrection.createMany({ data: rows });
  }
}

export async function rejectAgentAction(actionId: string, reason?: string | null) {
  const ctx = requireContext();
  const action = await prisma.agentAction.findFirst({ where: { id: actionId } });
  if (!action) throw notFound('Agent action');
  if (action.status !== 'PENDING') {
    throw conflict(`This proposal was already ${action.status.toLowerCase()}.`);
  }

  await track('agent_action_resolved', {
    actionId,
    actionType: action.type,
    outcome: 'rejected',
    confidenceTier: action.tier,
    secondsToResolution: Math.round((Date.now() - action.createdAt.getTime()) / 1000),
  });

  // Rejected rows are kept, not deleted. The log is a complete history of what
  // the system proposed, including what it got wrong (FR-AGENT-05).
  return prisma.agentAction.update({
    where: { id: actionId },
    data: {
      status: 'REJECTED',
      failureReason: reason ?? null,
      reviewedByUserId: ctx.userId,
      reviewedAt: new Date(),
    },
    include: agentActionInclude,
  });
}
