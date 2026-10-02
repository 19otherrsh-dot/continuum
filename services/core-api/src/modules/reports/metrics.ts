import type { FastifyPluginAsync } from 'fastify';
import { autonomyPolicySummary } from '../../ai/autonomy.js';
import { prisma } from '../../db/client.js';
import { requireRole } from '../../plugins/auth.js';

/**
 * The KPI framework (PRD §39), computed from the instrumentation in §38.
 *
 * Each row states its target alongside the measured value, so the number is
 * legible as pass/fail rather than as a bare figure someone has to remember
 * the goal for. These are the metrics Phase 1's exit criteria are evaluated
 * against (§37.1).
 */
export const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.requireAuth);

  app.get('/reports/success-metrics', { preHandler: requireRole('MANAGER') }, async (request) => {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 86_400_000);
    const ninetyDaysAgo = new Date(now - 90 * 86_400_000);

    // --- Goal 1: prove automatic capture works in practice -----------------
    const [openDeals, coveredDeals] = await Promise.all([
      prisma.deal.count({ where: { status: 'OPEN' } }),
      prisma.deal.count({ where: { status: 'OPEN', lastActivityAt: { gte: sevenDaysAgo } } }),
    ]);
    const captureCoverage = openDeals === 0 ? 100 : Math.round((coveredDeals / openDeals) * 100);

    // --- Goal 2: minimize time-to-value -----------------------------------
    const firstCaptures = await prisma.analyticsEvent.findMany({
      where: { name: 'first_activity_captured' },
      select: { properties: true },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });
    const durations = firstCaptures
      .map((event) => (event.properties as { secondsSinceConnection?: number }).secondsSinceConnection)
      .filter((value): value is number => typeof value === 'number')
      .sort((a, b) => a - b);
    const medianSeconds =
      durations.length === 0 ? null : durations[Math.floor(durations.length / 2)]!;

    // --- Goal 3: build trust in AI-inferred data ---------------------------
    const resolutions = await prisma.analyticsEvent.findMany({
      where: { name: 'agent_action_resolved', createdAt: { gte: ninetyDaysAgo } },
      select: { properties: true },
    });
    const outcomes = resolutions.map(
      (event) => (event.properties as { outcome?: string }).outcome ?? 'unknown',
    );
    const confirmedClean = outcomes.filter((o) => o === 'confirmed').length;
    const edited = outcomes.filter((o) => o === 'edited').length;
    const rejected = outcomes.filter((o) => o === 'rejected').length;
    const resolved = confirmedClean + edited + rejected;

    // Confirmed *without correction* is the trust metric — an edited proposal
    // was still wrong, even though the user salvaged it.
    const cleanConfirmRate = resolved === 0 ? null : Math.round((confirmedClean / resolved) * 100);

    // --- Goal 5: validate the dual-beachhead bet ---------------------------
    // Organization is intentionally NOT tenant-scoped by the client extension —
    // it *is* the tenant — so it must always be fetched by explicit id. A bare
    // findFirst() here returns an arbitrary workspace.
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: request.ctx!.organizationId },
    });
    const customFieldCount = await prisma.customFieldDef.count({ where: { archivedAt: null } });

    // --- Supporting counts -------------------------------------------------
    const [autoCaptured, manualActivities, pendingActions, conversions] = await Promise.all([
      prisma.activity.count({ where: { source: 'AGENT_INFERRED' } }),
      prisma.activity.count({ where: { source: 'HUMAN' } }),
      prisma.agentAction.count({ where: { status: 'PENDING' } }),
      prisma.project.count({ where: { originatingDealId: { not: null } } }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      goals: [
        {
          goal: 'Prove automatic capture works in practice',
          metric: 'Active deals with a captured interaction in the last 7 days',
          target: 80,
          unit: '%',
          value: captureCoverage,
          meetsTarget: captureCoverage >= 80,
          detail: `${coveredDeals} of ${openDeals} open deals`,
        },
        {
          goal: 'Minimize time-to-value',
          metric: 'Median signup → first auto-populated record',
          target: 300,
          unit: 'seconds',
          value: medianSeconds,
          meetsTarget: medianSeconds !== null && medianSeconds <= 300,
          detail:
            medianSeconds === null
              ? 'No mailbox connected yet'
              : `${Math.round(medianSeconds)}s across ${durations.length} connection(s)`,
        },
        {
          goal: 'Build trust in AI-inferred data',
          metric: 'Agent Actions confirmed without correction',
          target: 70,
          unit: '%',
          value: cleanConfirmRate,
          meetsTarget: cleanConfirmRate !== null && cleanConfirmRate >= 70,
          detail:
            resolved === 0
              ? 'No suggestions resolved yet'
              : `${confirmedClean} confirmed as-is, ${edited} corrected first, ${rejected} rejected`,
        },
        {
          goal: 'Validate the dual-beachhead bet',
          metric: 'Custom fields needed beyond the default schema',
          target: 0,
          unit: 'fields',
          value: customFieldCount,
          // Lower is better here: the default schema fitting the persona out of
          // the box is the thing being tested (§39, tenet 36).
          meetsTarget: customFieldCount <= 3,
          detail: `${org.motion.toLowerCase()} motion workspace`,
        },
      ],
      supporting: {
        autoCapturedActivities: autoCaptured,
        manualActivities,
        autoCapturedShare:
          autoCaptured + manualActivities === 0
            ? 0
            : Math.round((autoCaptured / (autoCaptured + manualActivities)) * 100),
        pendingAgentActions: pendingActions,
        dealsConvertedToProjects: conversions,
      },
      // Retention (85%+ gross logo at 6 months) comes from the billing system,
      // not from product instrumentation, so it is named here rather than faked.
      externallyMeasured: [
        {
          goal: 'Validate retention thesis',
          metric: '85%+ gross logo retention at 6 months',
          source: 'Billing system — not derivable from product events',
        },
        {
          goal: 'Validate the dual-beachhead bet (qualitative)',
          metric: 'Design partners report the default schema fits',
          source: 'Design-partner interviews',
        },
      ],
    };
  });

  /** The autonomy stance, surfaced so admins can read the constraint (§25.5). */
  app.get('/reports/autonomy-policy', async (request) => {
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: request.ctx!.organizationId },
    });
    return {
      ...autonomyPolicySummary(),
      workspaceOptedIn: org.autoApplyOptIn,
      // True at V1 for every workspace, regardless of the opt-in flag.
      everyActionRequiresConfirmation: true,
    };
  });

  /**
   * Raw event feed for design-partner analysis. Properties carry IDs, enums and
   * durations only — never captured communication content (§38.1).
   */
  app.get('/reports/events', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { name, limit } = request.query as { name?: string; limit?: string };
    const events = await prisma.analyticsEvent.findMany({
      where: name ? { name } : {},
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number.parseInt(limit ?? '200', 10) || 200, 1000),
    });

    return {
      data: events,
      note:
        'Analytics events reference record IDs and metadata only. Message subjects, bodies, ' +
        'summaries and addresses are never recorded here.',
    };
  });
};
