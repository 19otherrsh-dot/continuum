import { Prisma } from '@prisma/client';
import type { ActivityDirection } from '@continuum/shared';
import { STORED_BODY_EXCERPT_CHARS, excerpt } from '@continuum/shared';
import { proposeActions } from '../ai/proposer.js';
import { summarizeActivity } from '../ai/summarizer.js';
import { track, trackFirstCapture } from '../analytics/events.js';
import { prisma } from '../db/client.js';
import { orgId } from '../db/context.js';
import { parseAddress } from '../lib/email.js';
import type { CapturedMessage } from '../providers/types.js';
import { touchDealActivity } from '../modules/deals/service.js';
import { recordProposals } from '../modules/agent-actions/service.js';
import { classifyNoise, isExcluded, type ExclusionRule } from './noise-filter.js';
import { contactFieldsFromAddress, matchMessage, type MatchResult } from './matching-engine.js';

export interface IngestOutcome {
  created: number;
  updated: number;
  duplicates: number;
  filtered: number;
  excluded: number;
}

/**
 * Turns a batch of provider messages into CRM records.
 *
 * Stage order is load-bearing and should not be rearranged:
 *
 *   noise filter -> exclusions -> dedupe -> matching -> write -> summarize -> propose
 *
 * Filtering runs before matching so a newsletter never mints a contact
 * proposal. Dedupe runs before matching so a retried delivery costs one index
 * lookup rather than a full resolution pass. And the Activity write happens
 * before summarization, unconditionally — see `persistActivity`.
 */
export async function ingestMessages(
  connectionId: string,
  messages: CapturedMessage[],
): Promise<IngestOutcome> {
  const outcome: IngestOutcome = {
    created: 0,
    updated: 0,
    duplicates: 0,
    filtered: 0,
    excluded: 0,
  };
  if (messages.length === 0) return outcome;

  const exclusionRows = await prisma.captureExclusion.findMany({
    where: { OR: [{ connectionId }, { connectionId: null }] },
  });
  const exclusions: ExclusionRule[] = exclusionRows.map((row) => ({
    kind: row.kind,
    value: row.value,
  }));

  for (const message of messages) {
    // 1. Bulk mail and machine senders never reach the matching engine.
    const noise = classifyNoise(message);
    if (noise.isNoise) {
      await markProcessed(connectionId, message.externalRef);
      outcome.filtered += 1;
      continue;
    }

    // 2. User-configured exclusions. Dropped before persistence and before any
    //    AI call, so excluded content is never processed even transiently.
    if (isExcluded(message, exclusions)) {
      await markProcessed(connectionId, message.externalRef);
      outcome.excluded += 1;
      continue;
    }

    const result = await ingestOne(connectionId, message);
    outcome[result] += 1;
  }

  return outcome;
}

async function ingestOne(
  connectionId: string,
  message: CapturedMessage,
): Promise<'created' | 'updated' | 'duplicates'> {
  // A meeting we have already seen is a *reschedule*, not a duplicate: the
  // provider returns the same externalRef with a new time, and the existing
  // Activity must move rather than a second one appearing (Epic A edge case).
  const existing = await prisma.activity.findFirst({
    where: { connectionId, externalRef: message.externalRef },
  });

  if (existing) {
    if (message.kind === 'MEETING') {
      const changed =
        existing.occurredAt.getTime() !== message.occurredAt.getTime() ||
        existing.subject !== message.subject;
      if (changed) {
        await prisma.activity.update({
          where: { id: existing.id },
          data: {
            occurredAt: message.occurredAt,
            subject: message.subject,
            body: message.body,
            durationSeconds: durationOf(message),
          },
        });
        return 'updated';
      }
    }
    return 'duplicates';
  }

  // 3. Idempotency ledger. Claiming *before* the write is what wins the race
  //    when the same message arrives twice concurrently — the unique
  //    constraint decides, not a read-then-write check.
  const claimed = await markProcessed(connectionId, message.externalRef);
  if (!claimed) return 'duplicates';

  /**
   * The claim has to be released if the write fails, or the message is lost
   * for good: the retry would find the ledger row, treat it as a duplicate,
   * and skip a message that was never persisted. That is exactly the silent
   * drop FR-AC-07 forbids.
   *
   * Releasing costs a redelivery in the pathological case where the release
   * itself fails — which is the right way round. A duplicate is visible and
   * fixable; a silent loss is neither.
   */
  let persisted: Awaited<ReturnType<typeof persistActivity>>;
  try {
    persisted = await persistActivity(connectionId, message);
  } catch (error) {
    await releaseClaim(connectionId, message.externalRef);
    throw error;
  }

  if (!persisted) {
    await releaseClaim(connectionId, message.externalRef);
    return 'duplicates';
  }

  /**
   * Deterministic proposals run here, on the fast path.
   *
   * "This address was on the thread, its domain belongs to a company we know,
   * and no contact exists for it" is a fact that needs no model call — so it
   * should not wait behind a summarization queue, and it must not depend on
   * the model being reachable at all (FR-AC-04).
   *
   * It also has to happen now because the evidence is transient: the
   * unrecognised addresses live in the incoming message, not on the stored
   * Activity, which only links contacts that already exist.
   */
  await recordContactProposals(persisted.activityId, persisted.match);

  // Summarization and *model-derived* proposals do not run here. They are
  // drained by the enrichment worker so a slow model cannot stall the poll.
  return 'created';
}

/** Returns false when this message has already been claimed by a previous run. */
async function markProcessed(connectionId: string, externalRef: string): Promise<boolean> {
  try {
    await prisma.processedMessage.create({ data: { connectionId, externalRef } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return false;
    }
    throw error;
  }
}

/**
 * Hands a claimed message back so a later poll can retry it. Swallows its own
 * failures deliberately — the caller is already unwinding an error, and
 * throwing here would mask the original cause.
 */
async function releaseClaim(connectionId: string, externalRef: string): Promise<void> {
  try {
    await prisma.processedMessage.deleteMany({ where: { connectionId, externalRef } });
  } catch {
    /* best effort */
  }
}

/**
 * Writes the Activity and its links.
 *
 * This is the commitment that makes capture reliable: participants, timestamp,
 * subject and body are persisted here with `summaryStatus = PENDING` and a null
 * summary. If the model is down, slow, or wrong, the record still exists and
 * the timeline is still correct (FR-AC-03 edge case).
 */
async function persistActivity(
  connectionId: string,
  message: CapturedMessage,
): Promise<{ activityId: string; match: MatchResult } | null> {
  const match = await matchMessage(message);

  const from = parseAddress(message.from);
  const direction: ActivityDirection =
    from?.email === message.mailbox.toLowerCase() ? 'OUTBOUND' : 'INBOUND';

  const activity = await prisma.activity.create({
    data: {
      organizationId: orgId(),
      type: message.kind === 'MEETING' ? 'MEETING' : 'EMAIL',
      direction,
      subject: message.subject,
      // Stored as an excerpt, not the full body (§30). Enough to audit the
      // summary against; the complete message stays in the user's mailbox.
      body: excerpt(message.body, STORED_BODY_EXCERPT_CHARS),
      // Held only until the enrichment worker consumes it, then nulled. This
      // is what lets summarization run off the poll loop without the model
      // seeing a truncated thread.
      rawBodyTransient: message.body,
      occurredAt: message.occurredAt,
      // Captured automatically — provenance is visible on the timeline.
      source: 'AGENT_INFERRED',
      externalRef: message.externalRef,
      threadRef: message.threadRef,
      connectionId,
      durationSeconds: durationOf(message),
      summaryStatus: 'PENDING',
      participants: {
        create: match.knownContactIds.map((contactId) => ({ contactId })),
      },
      links: {
        create: match.links.map((link) => ({
          entityType: link.entityType,
          entityId: link.entityId,
          isPrimary: link.isPrimary,
        })),
      },
    },
  });

  if (match.dealId) {
    await touchDealActivity(match.dealId, message.occurredAt);
  }

  await track('activity_captured', {
    activityId: activity.id,
    activityType: activity.type,
    direction,
    source: 'AGENT_INFERRED',
    linkedToDeal: match.dealId !== null,
  });
  // Time-to-value: median under five minutes from connecting a mailbox (§39).
  await trackFirstCapture(connectionId);

  return { activityId: activity.id, match };
}

/**
 * New-contact proposals (FR-AC-04), derived by rule rather than asked of the
 * model.
 *
 * Kept on the ingestion path for two reasons: it costs nothing, and the
 * evidence is gone by the time the enrichment worker runs — unrecognised
 * addresses exist only in the incoming message, since the stored Activity
 * links contacts that already exist.
 */
async function recordContactProposals(activityId: string, match: MatchResult): Promise<void> {
  if (match.unknownAddresses.length === 0 || !match.primaryCompanyId) return;

  await recordProposals({
    activityId,
    dealId: match.dealId,
    companyId: match.primaryCompanyId,
    actions: match.unknownAddresses.map((address) => {
      const { firstName, lastName } = contactFieldsFromAddress(address);
      return {
        type: 'CREATE_CONTACT' as const,
        payload: {
          email: address.email,
          firstName,
          lastName,
          title: null,
          ...(match.dealId ? { dealId: match.dealId } : {}),
        },
        confidence: 0.85,
        rationale: `${address.email} took part in this thread and their domain belongs to a company already in the CRM, but there is no contact for them yet.`,
      };
    }),
  });
}

function durationOf(message: CapturedMessage): number | null {
  if (message.meetingStart && message.meetingEnd) {
    return Math.round((message.meetingEnd.getTime() - message.meetingStart.getTime()) / 1000);
  }
  return null;
}

/**
 * The AI half. Deliberately separate from the write path and individually
 * fault-tolerant: a summarization failure must not prevent proposals, and
 * neither may unwind the Activity.
 */
export async function enrichActivity(
  activityId: string,
  match?: MatchResult,
  /**
   * The complete message text, held in memory only. Persisted storage keeps an
   * excerpt (§30), but the model reads the whole thing — data minimization
   * should shrink what we retain, not what we understand.
   */
  fullText?: string,
): Promise<void> {
  const activity = await prisma.activity.findFirst({
    where: { id: activityId },
    include: {
      participants: { include: { contact: true } },
      links: true,
    },
  });
  if (!activity) return;

  const participants = activity.participants.map((p) => p.contact.email);
  // Prefer the transient full text; fall back to the stored excerpt if it has
  // already been purged (e.g. a manual re-run).
  const sourceText = fullText ?? activity.rawBodyTransient ?? activity.body ?? '';

  try {
    const summary = await summarizeActivity({
      type: activity.type,
      subject: activity.subject,
      body: sourceText,
      transcript: activity.transcript,
      participants,
      occurredAt: activity.occurredAt,
    });

    await prisma.activity.update({
      where: { id: activityId },
      data: {
        aiSummary: summary.summary,
        sentiment: summary.sentiment,
        nextStep: summary.nextStep,
        summaryStatus: 'DONE',
        summaryError: null,
        // The full text has served its purpose. Only the excerpt is retained.
        rawBodyTransient: null,
      },
    });
  } catch (error) {
    // The Activity keeps its participants, timestamp and excerpt; only the
    // summary is missing, and the UI says so plainly.
    await prisma.activity.update({
      where: { id: activityId },
      data: {
        summaryStatus: 'FAILED',
        summaryError: error instanceof Error ? error.message : String(error),
        // Purged even on failure — retaining a full copy indefinitely because
        // a model call failed would quietly defeat the retention policy.
        rawBodyTransient: null,
      },
    });
  }

  try {
    await generateProposals(activityId, match, sourceText);
  } catch {
    // A proposal failure is silent by design. The alternative — surfacing an
    // error about a suggestion the user never asked for — is worse than the
    // agent simply having nothing to say.
  }
}

async function generateProposals(
  activityId: string,
  match?: MatchResult,
  fullText?: string,
): Promise<void> {
  const activity = await prisma.activity.findFirst({
    where: { id: activityId },
    include: { participants: { include: { contact: true } }, links: true },
  });
  if (!activity) return;

  const dealLink = activity.links.find((l) => l.entityType === 'DEAL');
  const companyLink = activity.links.find((l) => l.entityType === 'COMPANY');

  let dealContext = null;
  if (dealLink) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealLink.entityId },
      include: { stage: true, pipeline: { include: { stages: { orderBy: { order: 'asc' } } } } },
    });
    if (deal) {
      dealContext = {
        id: deal.id,
        name: deal.name,
        currentStageName: deal.stage.name,
        availableStages: deal.pipeline.stages.map((s) => s.name),
      };
    }
  }

  const unknownParticipants = match?.unknownAddresses ?? [];

  const priorCorrections = companyLink
    ? await prisma.agentCorrection.findMany({
        where: { companyId: companyLink.entityId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    : [];

  const actions = await proposeActions({
    activityType: activity.type,
    subject: activity.subject,
    body: activity.transcript?.trim() || fullText || activity.body || '',
    participants: activity.participants.map((p) => p.contact.email),
    deal: dealContext,
    // The model is told who is unrecognised for context, but contact creation
    // is already handled deterministically above.
    unknownParticipants: unknownParticipants.map((a) => ({ email: a.email, name: a.name })),
    priorCorrections: priorCorrections.map((c) => ({
      field: c.fieldPath,
      from: c.originalValue,
      to: c.correctedValue,
    })),
  });

  await recordProposals({
    activityId,
    dealId: dealLink?.entityId ?? null,
    companyId: companyLink?.entityId ?? null,
    actions,
    sourceKind: activity.type,
  });
}
