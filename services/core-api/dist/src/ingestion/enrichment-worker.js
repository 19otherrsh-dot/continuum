import { prisma } from '../db/client.js';
import { runUnscoped, runWithContext } from '../db/context.js';
import { enrichActivity } from './pipeline.js';
/**
 * Summarization worker.
 *
 * Enrichment used to run inline inside the connection poll, one message at a
 * time. With the deterministic local summarizer that is instant, which is
 * precisely why it looked fine — but against a real model at a few seconds a
 * call, a 200-message backfill became 200 sequential round-trips holding the
 * poll open for ten minutes or more, and blowing FR-AC-02's five-minute
 * target.
 *
 * Ingestion now does nothing but write records, and this worker drains the
 * PENDING queue separately with bounded concurrency. The Activity is on disk
 * either way; only the summary is deferred, which is the same trade the
 * "never block the write on the AI step" rule already makes.
 */
/**
 * Deliberately small. The ceiling here is the model provider's rate limit, not
 * our CPU, and a burst that trips a 429 costs more than it gains.
 */
const CONCURRENCY = 4;
/** Claimed per pass, so one workspace's backlog cannot starve the others. */
const BATCH_SIZE = 20;
/**
 * An activity stuck in PENDING for longer than this is assumed to belong to a
 * worker that died mid-call, and is eligible to be retried.
 */
const STALE_CLAIM_MS = 10 * 60_000;
export async function runEnrichmentTick(logger) {
    const outcome = { claimed: 0, succeeded: 0, failed: 0 };
    // Cross-tenant by nature — the worker serves every workspace. Oldest first,
    // so a busy workspace cannot indefinitely postpone a quiet one's summaries.
    // No staleness guard: the Activity row is committed before ingestion
    // returns, so anything visible as PENDING is safe to pick up immediately.
    // Delaying eligibility would also break the synchronous sync-now path, which
    // ingests and drains in one request.
    const pending = await runUnscoped(() => prisma.activity.findMany({
        where: { summaryStatus: 'PENDING' },
        select: { id: true, organizationId: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
    }));
    if (pending.length === 0)
        return outcome;
    outcome.claimed = pending.length;
    // Simple worker pool: N consumers pulling from a shared cursor.
    const queue = [...pending];
    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
        for (;;) {
            const item = queue.shift();
            if (!item)
                return;
            try {
                await runWithContext({
                    organizationId: item.organizationId,
                    userId: null,
                    userName: 'Capture',
                    role: null,
                    actorType: 'AGENT',
                }, () => enrichActivity(item.id));
                outcome.succeeded += 1;
            }
            catch (error) {
                // enrichActivity already records its own failure state; reaching here
                // means something outside it broke, so the activity stays PENDING and
                // is retried on a later pass.
                outcome.failed += 1;
                logger?.error({ err: error, activityId: item.id }, 'Enrichment failed');
            }
        }
    });
    await Promise.all(workers);
    return outcome;
}
/**
 * Recovers activities abandoned by a worker that died mid-summarization.
 *
 * They are already PENDING, so this only exists to surface how many are stuck
 * — the ordinary tick will pick them up. Reported rather than silently retried
 * so a persistent backlog is visible.
 */
export async function countStalledEnrichment() {
    return runUnscoped(() => prisma.activity.count({
        where: {
            summaryStatus: 'PENDING',
            createdAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) },
        },
    }));
}
