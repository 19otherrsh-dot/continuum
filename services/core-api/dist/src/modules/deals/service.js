import { track } from '../../analytics/events.js';
import { prisma } from '../../db/client.js';
import { recordAudit } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';
export const dealInclude = {
    company: { select: { id: true, name: true, domain: true } },
    contacts: { include: { contact: true } },
    project: { select: { id: true } },
    stage: true,
};
/**
 * Moves a deal to a stage and keeps the derived status in sync.
 *
 * `stageSource` is written on every move, so the record always carries whether
 * a person or a confirmed agent proposal put it there. Landing on a won stage
 * flips status to WON in the same action, which is what makes the deal
 * immediately eligible for project conversion (Epic C edge case).
 */
export async function moveDealToStage(dealId, stageId, source) {
    const [deal, stage] = await Promise.all([
        prisma.deal.findFirst({ where: { id: dealId } }),
        prisma.stage.findUnique({ where: { id: stageId } }),
    ]);
    if (!deal)
        throw notFound('Deal');
    if (!stage)
        throw notFound('Stage');
    const status = stage.isWonStage ? 'WON' : stage.isLostStage ? 'LOST' : 'OPEN';
    const closedAt = status === 'OPEN' ? null : (deal.closedAt ?? new Date());
    // Reopening a deal that already produced a project is not automatically
    // reverted — the Project keeps running and the mismatch is flagged for a
    // human to resolve (Epic D edge case).
    let needsReview = deal.needsReview;
    let reviewReason = deal.reviewReason;
    if (deal.status === 'WON' && status !== 'WON') {
        const project = await prisma.project.findFirst({ where: { originatingDealId: dealId } });
        if (project) {
            needsReview = true;
            reviewReason = `Deal was reopened after being converted to project "${project.name}". Confirm whether that project should continue.`;
        }
    }
    const priorStage = await prisma.stage.findUnique({ where: { id: deal.stageId } });
    await prisma.deal.update({
        where: { id: dealId },
        data: { stageId, stageSource: source, status, closedAt, needsReview, reviewReason },
    });
    // How much pipeline movement is agent-assisted vs fully manual (§38).
    await track('deal_stage_changed', {
        dealId,
        source: source === 'HUMAN' ? 'human' : 'agent',
        toStatus: status,
    });
    await recordAudit([
        {
            entityType: 'DEAL',
            entityId: dealId,
            field: 'stageId',
            priorValue: priorStage?.name ?? deal.stageId,
            newValue: stage.name,
        },
        {
            entityType: 'DEAL',
            entityId: dealId,
            field: 'stageSource',
            priorValue: deal.stageSource,
            newValue: source,
        },
    ]);
}
/** Attaches a contact to a deal, optionally with a stakeholder role (FR-DATA-05). */
export async function linkContactToDeal(dealId, contactId, role) {
    await prisma.dealContact.upsert({
        where: { dealId_contactId: { dealId, contactId } },
        create: { dealId, contactId, role },
        update: { role },
    });
}
/**
 * Refreshes the denormalised activity recency used by the stalling sweep and
 * the capture-coverage metric. Clearing `stallingSince` here is what makes a
 * deal recover the moment real activity lands on it.
 */
export async function touchDealActivity(dealId, occurredAt) {
    const deal = await prisma.deal.findFirst({
        where: { id: dealId },
        select: { lastActivityAt: true },
    });
    if (!deal)
        return;
    if (deal.lastActivityAt && deal.lastActivityAt >= occurredAt)
        return;
    const wasStalling = await prisma.deal.findFirst({
        where: { id: dealId },
        select: { stallingSince: true },
    });
    await prisma.deal.update({
        where: { id: dealId },
        data: { lastActivityAt: occurredAt, stallingSince: null },
    });
    // Whether flagging a quiet deal actually prompted real follow-up (§38).
    if (wasStalling?.stallingSince) {
        await track('stalling_deal_resolved', {
            dealId,
            daysStalled: Math.round((Date.now() - wasStalling.stallingSince.getTime()) / 86_400_000),
        });
    }
}
