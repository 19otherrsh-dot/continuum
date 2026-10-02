import { CONNECTION_BASE_POLL_SECONDS, CONNECTION_MAX_BACKOFF_SECONDS, INITIAL_BACKFILL_DAYS, } from '@continuum/shared';
import { track } from '../analytics/events.js';
import { prisma } from '../db/client.js';
import { runUnscoped, runWithContext } from '../db/context.js';
import { decrypt, encrypt } from '../lib/crypto.js';
import { getEmailProvider } from '../providers/index.js';
import { ProviderAuthError, ProviderTransientError, } from '../providers/types.js';
import { notify } from '../modules/notifications/service.js';
import { ingestMessages } from './pipeline.js';
/**
 * Polls every connection that is due.
 *
 * The isolation property is the one that matters: state — cursor, backoff,
 * failure count, next poll time — lives on the connection row, so one
 * workspace's rate limit or outage cannot stall anyone else's capture
 * (FR-AC-07). A failure here reschedules that single connection and moves on.
 */
export async function runIngestionTick(logger) {
    // Cross-tenant by nature: the scheduler serves every workspace.
    const due = await runUnscoped(() => prisma.integrationConnection.findMany({
        where: {
            status: { in: ['CONNECTED', 'ERROR'] },
            provider: { in: ['GOOGLE', 'MICROSOFT'] },
            nextPollAt: { lte: new Date() },
        },
        take: 50,
        orderBy: { nextPollAt: 'asc' },
    }));
    const outcomes = [];
    for (const connection of due) {
        try {
            const outcome = await runWithContext({
                organizationId: connection.organizationId,
                userId: connection.userId,
                userName: 'Capture',
                role: null,
                actorType: 'AGENT',
            }, () => pollConnection(connection.id));
            if (outcome)
                outcomes.push(outcome);
        }
        catch (error) {
            logger?.error({ err: error, connectionId: connection.id }, 'Connection poll failed');
        }
    }
    return { polled: due.length, outcomes };
}
async function pollConnection(connectionId) {
    const connection = await prisma.integrationConnection.findFirst({
        where: { id: connectionId },
    });
    if (!connection)
        return null;
    const provider = getEmailProvider(connection.provider);
    let credentials;
    try {
        credentials = {
            accessToken: connection.accessToken ? decrypt(connection.accessToken) : null,
            refreshToken: connection.refreshToken ? decrypt(connection.refreshToken) : null,
            expiresAt: connection.expiresAt,
            accountEmail: connection.accountEmail,
        };
    }
    catch (error) {
        /**
         * Undecryptable credentials mean a rotated or lost encryption key. That
         * never heals by retrying, so treating it as a transient error would back
         * the connection off forever while telling the user nothing. It needs the
         * same terminal, actionable state as a revoked token.
         */
        await handleFailure(connectionId, connection.failureCount, connection.accountEmail, new ProviderAuthError('Stored credentials could not be decrypted — the account must be reconnected.'));
        void error;
        return null;
    }
    try {
        // Refresh proactively rather than waiting for a 401, so a routine poll
        // does not surface as an error to the user.
        if (credentials.expiresAt && credentials.expiresAt.getTime() < Date.now() + 60_000) {
            credentials = await provider.refresh(credentials);
            await persistCredentials(connectionId, credentials);
        }
        // First contact pulls recent history, so the user lands on a populated
        // pipeline rather than an empty state (Journey 1).
        const isBackfill = connection.backfillCompletedAt === null;
        const since = new Date(Date.now() - INITIAL_BACKFILL_DAYS * 86_400_000);
        const result = isBackfill
            ? await provider.backfill(credentials, since)
            : await provider.fetchIncremental(credentials, connection.syncCursor);
        const outcome = await ingestMessages(connectionId, result.messages);
        await prisma.integrationConnection.update({
            where: { id: connectionId },
            data: {
                syncCursor: result.cursor,
                lastSyncedAt: new Date(),
                status: 'CONNECTED',
                lastError: null,
                failureCount: 0,
                backoffSeconds: CONNECTION_BASE_POLL_SECONDS,
                nextPollAt: new Date(Date.now() + CONNECTION_BASE_POLL_SECONDS * 1000),
                ...(isBackfill ? { backfillCompletedAt: new Date() } : {}),
            },
        });
        return outcome;
    }
    catch (error) {
        await handleFailure(connectionId, connection.failureCount, connection.accountEmail, error);
        return null;
    }
}
async function persistCredentials(connectionId, credentials) {
    await prisma.integrationConnection.update({
        where: { id: connectionId },
        data: {
            accessToken: credentials.accessToken ? encrypt(credentials.accessToken) : null,
            refreshToken: credentials.refreshToken ? encrypt(credentials.refreshToken) : null,
            expiresAt: credentials.expiresAt,
            accountEmail: credentials.accountEmail,
        },
    });
}
/**
 * Failure handling.
 *
 * A revoked or expired credential is not a transient error and must not be
 * retried into oblivion — the connection stops polling, is marked
 * REAUTH_REQUIRED, and the user gets a specific, actionable prompt rather than
 * a generic sync failure (Epic A edge case).
 *
 * Everything else backs off exponentially and keeps trying. Nothing is dropped:
 * the provider cursor is untouched, so whatever was missed arrives on the next
 * successful poll.
 */
async function handleFailure(connectionId, failureCount, accountEmail, error) {
    if (error instanceof ProviderAuthError) {
        await prisma.integrationConnection.update({
            where: { id: connectionId },
            data: {
                status: 'REAUTH_REQUIRED',
                lastError: error.message,
                failureCount: failureCount + 1,
                // Far future: a revoked token will not heal on its own.
                nextPollAt: new Date(Date.now() + 365 * 86_400_000),
            },
        });
        await notify({
            type: 'CONNECTION_REAUTH',
            title: `Reconnect ${accountEmail ?? 'your mailbox'}`,
            body: 'Continuum lost access to this account, so new email and meetings are not being captured. Reconnecting takes a few seconds.',
            dedupeKey: `reauth:${connectionId}`,
        });
        return;
    }
    const nextFailureCount = failureCount + 1;
    const suggested = error instanceof ProviderTransientError && error.retryAfterSeconds
        ? error.retryAfterSeconds
        : CONNECTION_BASE_POLL_SECONDS * 2 ** Math.min(nextFailureCount, 6);
    const backoff = Math.min(suggested, CONNECTION_MAX_BACKOFF_SECONDS);
    await prisma.integrationConnection.update({
        where: { id: connectionId },
        data: {
            status: 'ERROR',
            lastError: error instanceof Error ? error.message : String(error),
            failureCount: nextFailureCount,
            backoffSeconds: backoff,
            nextPollAt: new Date(Date.now() + backoff * 1000),
        },
    });
}
/**
 * Flags deals with no captured activity inside the workspace's threshold
 * (FR-AC-06). Runs on its own cadence rather than inside the poll loop, since
 * it has to consider deals whose connections had nothing to report.
 */
export async function runStallingSweep() {
    const organizations = await runUnscoped(() => prisma.organization.findMany({ select: { id: true, stallingThresholdDays: true } }));
    let flagged = 0;
    for (const org of organizations) {
        await runWithContext({
            organizationId: org.id,
            userId: null,
            userName: 'Continuum',
            role: null,
            actorType: 'SYSTEM',
        }, async () => {
            const cutoff = new Date(Date.now() - org.stallingThresholdDays * 86_400_000);
            const stalling = await prisma.deal.findMany({
                where: {
                    status: 'OPEN',
                    stallingSince: null,
                    OR: [{ lastActivityAt: { lt: cutoff } }, { lastActivityAt: null, createdAt: { lt: cutoff } }],
                },
                select: { id: true, name: true, ownerId: true },
                take: 500,
            });
            for (const deal of stalling) {
                await prisma.deal.update({
                    where: { id: deal.id },
                    data: { stallingSince: new Date() },
                });
                await notify({
                    type: 'DEAL_STALLING',
                    title: `${deal.name} has gone quiet`,
                    body: `No captured activity in ${org.stallingThresholdDays} days.`,
                    entityType: 'DEAL',
                    entityId: deal.id,
                    dedupeKey: `stalling:${deal.id}`,
                });
                await track('stalling_deal_flagged', {
                    dealId: deal.id,
                    thresholdDays: org.stallingThresholdDays,
                });
                flagged += 1;
            }
        });
    }
    return flagged;
}
/**
 * Records capture coverage per workspace (§38) — the single most important
 * product-health number, and the one the §39 target of 80%+ is measured
 * against.
 *
 * Sampled weekly rather than continuously: the metric describes a trend, and
 * recording it on every sweep would bury that trend in noise.
 */
export async function recordCaptureCoverage() {
    const organizations = await runUnscoped(() => prisma.organization.findMany({ select: { id: true, stallingThresholdDays: true } }));
    let recorded = 0;
    for (const org of organizations) {
        await runWithContext({
            organizationId: org.id,
            userId: null,
            userName: 'Continuum',
            role: null,
            actorType: 'SYSTEM',
        }, async () => {
            const lastWeek = new Date(Date.now() - 7 * 86_400_000);
            const already = await prisma.analyticsEvent.findFirst({
                where: { name: 'capture_coverage', createdAt: { gte: lastWeek } },
            });
            if (already)
                return;
            // The §39 target is measured over a 7-day window regardless of the
            // workspace's own stalling threshold, so the number is comparable
            // across design partners.
            const [openDeals, covered] = await Promise.all([
                prisma.deal.count({ where: { status: 'OPEN' } }),
                prisma.deal.count({
                    where: { status: 'OPEN', lastActivityAt: { gte: lastWeek } },
                }),
            ]);
            await track('capture_coverage', {
                openDeals,
                dealsWithRecentActivity: covered,
                percentage: openDeals === 0 ? 100 : Math.round((covered / openDeals) * 100),
                windowDays: 7,
            });
            recorded += 1;
        });
    }
    return recorded;
}
