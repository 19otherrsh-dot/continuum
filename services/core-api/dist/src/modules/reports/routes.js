import { prisma } from '../../db/client.js';
import { ownerScopeFilter } from '../common/scope.js';
export const reportRoutes = async (app) => {
    app.addHook('preHandler', app.requireAuth);
    /**
     * The default dashboard — no configuration required to see something
     * useful (FR-REPORT-01).
     */
    app.get('/reports/dashboard', async (request) => {
        const scope = await ownerScopeFilter();
        const org = await prisma.organization.findUniqueOrThrow({
            where: { id: request.ctx.organizationId },
        });
        const { days } = request.query;
        const windowDays = Number.parseInt(days ?? '30', 10) || 30;
        const windowStart = new Date(Date.now() - windowDays * 86_400_000);
        const staleCutoff = new Date(Date.now() - org.stallingThresholdDays * 86_400_000);
        const [stages, openDeals, won, lost, stalling, pendingActions, activities] = await Promise.all([
            prisma.stage.findMany({
                where: { pipeline: { organizationId: org.id, isDefault: true } },
                orderBy: { order: 'asc' },
            }),
            prisma.deal.findMany({
                where: { ...scope, status: 'OPEN' },
                select: { id: true, stageId: true, valueCents: true, lastActivityAt: true },
            }),
            prisma.deal.findMany({
                where: { ...scope, status: 'WON', closedAt: { gte: windowStart } },
                select: { valueCents: true },
            }),
            prisma.deal.count({
                where: { ...scope, status: 'LOST', closedAt: { gte: windowStart } },
            }),
            prisma.deal.count({ where: { ...scope, status: 'OPEN', stallingSince: { not: null } } }),
            prisma.agentAction.count({ where: { status: 'PENDING' } }),
            prisma.activity.findMany({
                where: { occurredAt: { gte: windowStart } },
                select: { source: true },
            }),
        ]);
        const byStage = new Map();
        for (const deal of openDeals) {
            const bucket = byStage.get(deal.stageId) ?? { count: 0, valueCents: 0 };
            bucket.count += 1;
            bucket.valueCents += deal.valueCents ?? 0;
            byStage.set(deal.stageId, bucket);
        }
        /**
         * Capture coverage — the share of open deals with recent captured
         * activity.
         *
         * This is the metric that tells a manager whether the automatic capture
         * they are relying on is actually working on their team's deals, so it is
         * a first-class number on the default dashboard rather than something
         * buried in an admin view (FR-REPORT-04).
         */
        const withRecentActivity = openDeals.filter((deal) => deal.lastActivityAt !== null && deal.lastActivityAt >= staleCutoff).length;
        const autoCaptured = activities.filter((a) => a.source === 'AGENT_INFERRED').length;
        return {
            pipelineValueByStage: stages.map((stage) => ({
                stageId: stage.id,
                stageName: stage.name,
                count: byStage.get(stage.id)?.count ?? 0,
                valueCents: byStage.get(stage.id)?.valueCents ?? 0,
            })),
            wonCount: won.length,
            lostCount: lost,
            wonValueCents: won.reduce((sum, deal) => sum + (deal.valueCents ?? 0), 0),
            captureCoverage: {
                totalOpenDeals: openDeals.length,
                withRecentActivity,
                percentage: openDeals.length === 0
                    ? 100
                    : Math.round((withRecentActivity / openDeals.length) * 100),
            },
            stallingDeals: stalling,
            pendingAgentActions: pendingActions,
            activitiesLast30Days: activities.length,
            autoCapturedShare: activities.length === 0 ? 0 : Math.round((autoCaptured / activities.length) * 100),
        };
    });
    /** Delivery reporting for agency workspaces (FR-PROJ-04, FR-REPORT-03). */
    app.get('/reports/projects', async () => {
        const projects = await prisma.project.findMany({
            include: { owner: { select: { id: true, name: true } } },
        });
        const completed = projects.filter((p) => p.completedAt && p.startedAt);
        const averageDaysToDelivery = completed.length === 0
            ? null
            : Math.round(completed.reduce((sum, p) => sum + (p.completedAt.getTime() - p.startedAt.getTime()) / 86_400_000, 0) / completed.length);
        const load = new Map();
        for (const project of projects) {
            if (project.status !== 'ACTIVE')
                continue;
            const key = project.ownerId ?? 'unassigned';
            const entry = load.get(key) ?? {
                ownerName: project.owner?.name ?? 'Unassigned',
                activeProjects: 0,
            };
            entry.activeProjects += 1;
            load.set(key, entry);
        }
        return {
            activeProjects: projects.filter((p) => p.status === 'ACTIVE').length,
            averageDaysToDelivery,
            loadByOwner: [...load.entries()].map(([ownerId, value]) => ({
                ownerId: ownerId === 'unassigned' ? null : ownerId,
                ownerName: value.ownerName,
                activeProjects: value.activeProjects,
            })),
        };
    });
    /**
     * Team health — the manager's answer to "is the record trustworthy?"
     * without having to ask anyone whether they updated the CRM.
     */
    app.get('/reports/team-health', async (request) => {
        const org = await prisma.organization.findUniqueOrThrow({
            where: { id: request.ctx.organizationId },
        });
        const staleCutoff = new Date(Date.now() - org.stallingThresholdDays * 86_400_000);
        const users = await prisma.user.findMany({ select: { id: true, name: true } });
        const rows = await Promise.all(users.map(async (user) => {
            const [openDeals, covered, stalling] = await Promise.all([
                prisma.deal.count({ where: { ownerId: user.id, status: 'OPEN' } }),
                prisma.deal.count({
                    where: { ownerId: user.id, status: 'OPEN', lastActivityAt: { gte: staleCutoff } },
                }),
                prisma.deal.count({
                    where: { ownerId: user.id, status: 'OPEN', stallingSince: { not: null } },
                }),
            ]);
            return {
                userId: user.id,
                name: user.name,
                openDeals,
                dealsWithRecentActivity: covered,
                captureCoverage: openDeals === 0 ? 100 : Math.round((covered / openDeals) * 100),
                stallingDeals: stalling,
            };
        }));
        return { data: rows, thresholdDays: org.stallingThresholdDays };
    });
    /** Weighted forecast by expected close month. Stage probabilities are configurable. */
    app.get('/reports/forecast', async () => {
        const scope = await ownerScopeFilter();
        const deals = await prisma.deal.findMany({
            where: { ...scope, status: 'OPEN' },
            include: { stage: true },
        });
        const buckets = new Map();
        for (const deal of deals) {
            const month = deal.expectedCloseDate
                ? deal.expectedCloseDate.toISOString().slice(0, 7)
                : 'unscheduled';
            const bucket = buckets.get(month) ?? { weightedCents: 0, rawCents: 0, count: 0 };
            const value = deal.valueCents ?? 0;
            bucket.rawCents += value;
            bucket.weightedCents += Math.round(value * deal.stage.winProbability);
            bucket.count += 1;
            buckets.set(month, bucket);
        }
        return {
            data: [...buckets.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, value]) => ({ month, ...value })),
        };
    });
    /** The audit trail, readable per record (FR-DATA-07). */
    app.get('/reports/audit', async (request) => {
        const { entityType, entityId, limit } = request.query;
        const rows = await prisma.auditLog.findMany({
            where: {
                ...(entityType ? { entityType: entityType } : {}),
                ...(entityId ? { entityId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(Number.parseInt(limit ?? '100', 10) || 100, 500),
        });
        return { data: rows };
    });
};
