import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import type { IntegrationProvider } from '@continuum/shared';
import { track } from '../../analytics/events.js';
import { config } from '../../config.js';
import { prisma } from '../../db/client.js';
import { orgId, runWithContext, type RequestContext } from '../../db/context.js';
import { encrypt } from '../../lib/crypto.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { runEnrichmentTick } from '../../ingestion/enrichment-worker.js';
import { runIngestionTick } from '../../ingestion/scheduler.js';
import { availableProviders, getEmailProvider } from '../../providers/index.js';
import { serializeConnection } from '../common/serializers.js';

/**
 * OAuth state, held in memory for the few minutes between redirect and
 * callback. Short-lived by design — a stale entry is a failed connect attempt,
 * not a security problem.
 */
const pendingStates = new Map<string, { ctx: RequestContext; provider: string; at: number }>();

function pruneStates(): void {
  const cutoff = Date.now() - 10 * 60_000;
  for (const [key, value] of pendingStates) {
    if (value.at < cutoff) pendingStates.delete(key);
  }
}

/**
 * What the consent screen promises, stated plainly (FR-AC-01).
 *
 * This is shown to the user before they authorise anything. It is deliberately
 * specific about what is *not* captured, because a vague permissions prompt is
 * the reason people distrust automatic capture in the first place.
 */
const CAPTURE_DISCLOSURE = {
  captured: [
    'Email you send to and receive from business contacts',
    'Calendar events with external attendees',
    'The sender, recipients, subject, timestamp and body of those messages',
    'An AI-generated summary of each one',
  ],
  notCaptured: [
    'Personal email with consumer addresses (Gmail, Outlook.com, iCloud and similar)',
    'Newsletters, marketing mail and automated notifications',
    'Anything from a sender or thread you exclude',
    'Attachments — file contents are never read or stored',
  ],
  controls: [
    'You can exclude any sender or thread at any time, and past excluded content stops being processed.',
    'Disconnecting stops capture immediately.',
    'Everything captured is exportable, in full, at any time.',
  ],
} as const;

export const integrationRoutes: FastifyPluginAsync = async (app) => {
  /** Public: what connecting will and will not do. Read before consenting. */
  app.get('/integrations/disclosure', async () => CAPTURE_DISCLOSURE);

  app.get('/integrations/available', { preHandler: [app.requireAuth] }, async () => ({
    data: availableProviders(),
    providerMode: config.providerMode,
  }));

  /**
   * Starts the connect flow. Google and Microsoft each begin syncing *both*
   * mail and calendar from this single action (FR-INT-01, FR-INT-02).
   */
  app.post('/integrations/:provider/connect', { preHandler: [app.requireAuth] }, async (request) => {
    const { provider } = request.params as { provider: string };
    const upper = provider.toUpperCase() as IntegrationProvider;

    if (upper !== 'GOOGLE' && upper !== 'MICROSOFT') {
      throw badRequest('Only Google Workspace and Microsoft 365 support mailbox capture');
    }

    pruneStates();
    const state = randomUUID();
    pendingStates.set(state, { ctx: request.ctx!, provider: upper, at: Date.now() });

    const emailProvider = getEmailProvider(upper);
    return {
      authorizationUrl: emailProvider.authorizationUrl(state),
      state,
      simulated: config.providerMode === 'simulator',
      disclosure: CAPTURE_DISCLOSURE,
    };
  });

  /**
   * OAuth callback. Public by necessity — the provider redirects the browser
   * here without our session cookie — so the tenant comes from the one-time
   * `state` value rather than from the request.
   */
  const handleCallback = async (
    request: { query: unknown },
    reply: { redirect: (url: string) => unknown },
  ) => {
    const { code, state } = request.query as { code?: string; state?: string };
    if (!state) throw badRequest('Missing state');

    const pending = pendingStates.get(state);
    if (!pending) throw badRequest('This connection attempt expired. Please try again.');
    pendingStates.delete(state);

    const provider = getEmailProvider(pending.provider as 'GOOGLE' | 'MICROSOFT');
    const credentials = await provider.exchangeCode(code ?? 'simulator');

    await runWithContext(pending.ctx, async () => {
      const existing = await prisma.integrationConnection.findFirst({
        where: {
          provider: pending.provider as IntegrationProvider,
          accountEmail: credentials.accountEmail,
        },
      });

      const data = {
        provider: pending.provider as IntegrationProvider,
        userId: pending.ctx.userId,
        status: 'CONNECTED' as const,
        accountEmail: credentials.accountEmail,
        accessToken: credentials.accessToken ? encrypt(credentials.accessToken) : null,
        refreshToken: credentials.refreshToken ? encrypt(credentials.refreshToken) : null,
        expiresAt: credentials.expiresAt,
        lastError: null,
        failureCount: 0,
        backoffSeconds: 60,
        // Poll immediately so the backfill starts now, not in a minute. The
        // user is watching this screen.
        nextPollAt: new Date(),
      };

      if (existing) {
        await prisma.integrationConnection.update({
          where: { id: existing.id },
          data: { ...data, backfillCompletedAt: null },
        });
      } else {
        await prisma.integrationConnection.create({ data: { ...data, organizationId: orgId() } });
      }

      // Time-to-first-connection, the leading indicator for Journey 1 (§38).
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: pending.ctx.organizationId },
        select: { createdAt: true },
      });
      await track('integration_connected', {
        provider: pending.provider,
        reconnect: Boolean(existing),
        secondsSinceSignup: Math.round((Date.now() - org.createdAt.getTime()) / 1000),
      });
    });

    // Kick the scheduler rather than waiting for the worker's next tick, so
    // the first captured activity lands within seconds of consenting.
    setImmediate(() => {
      void runIngestionTick().catch(() => undefined);
    });

    return reply.redirect(`${config.webOrigin}/onboarding/connected?provider=${pending.provider}`);
  };

  app.get('/integrations/google/callback', handleCallback);
  app.get('/integrations/microsoft/callback', handleCallback);
  app.get('/integrations/simulator/callback', handleCallback);

  /** Connection health, including the specific reason a mailbox stopped syncing. */
  app.get('/integrations/status', { preHandler: [app.requireAuth] }, async () => {
    const connections = await prisma.integrationConnection.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const capturedCount = await prisma.activity.count({
      where: { source: 'AGENT_INFERRED' },
    });

    return {
      data: connections.map((connection) => ({
        ...serializeConnection(connection),
        needsAttention: connection.status === 'REAUTH_REQUIRED',
        message:
          connection.status === 'REAUTH_REQUIRED'
            ? 'Continuum lost access to this account. Reconnect to resume capture.'
            : connection.status === 'ERROR'
              ? `Temporarily unable to sync — retrying automatically. ${connection.lastError ?? ''}`.trim()
              : null,
      })),
      capturedActivities: capturedCount,
    };
  });

  /** Forces a poll now. Used by the onboarding screen and by the demo tooling. */
  app.post('/integrations/sync-now', { preHandler: [app.requireAuth] }, async (request) => {
    await prisma.integrationConnection.updateMany({
      where: { status: { in: ['CONNECTED', 'ERROR'] } },
      data: { nextPollAt: new Date() },
    });

    const { polled, outcomes } = await runIngestionTick();

    /**
     * Ingestion no longer summarizes inline, so drain the queue here too.
     * Onboarding calls this endpoint and shows the user what was captured —
     * returning records with no summaries yet would undercut the whole point
     * of the screen. The worker does the same thing continuously; this makes
     * the API path self-sufficient when it is not running.
     */
    let enriched = 0;
    for (let pass = 0; pass < 5; pass += 1) {
      const outcome = await runEnrichmentTick();
      enriched += outcome.succeeded;
      if (outcome.claimed === 0) break;
    }
    void request;

    return {
      enriched,
      polled,
      created: outcomes.reduce((n, o) => n + o.created, 0),
      updated: outcomes.reduce((n, o) => n + o.updated, 0),
      duplicates: outcomes.reduce((n, o) => n + o.duplicates, 0),
      filtered: outcomes.reduce((n, o) => n + o.filtered, 0),
      excluded: outcomes.reduce((n, o) => n + o.excluded, 0),
    };
  });

  app.post(
    '/integrations/:provider/disconnect',
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const { provider } = request.params as { provider: string };
      const connection = await prisma.integrationConnection.findFirst({
        where: { provider: provider.toUpperCase() as IntegrationProvider },
      });
      if (!connection) throw notFound('Connection');

      await prisma.integrationConnection.update({
        where: { id: connection.id },
        data: { status: 'DISCONNECTED', accessToken: null, refreshToken: null },
      });
      return reply.status(204).send();
    },
  );

  /**
   * Connects Slack. Real workspaces do this through Slack's OAuth flow; in
   * simulator mode the connection is recorded directly so notification routing
   * is exercisable.
   */
  app.post('/integrations/slack/connect', { preHandler: [app.requireAuth] }, async (request) => {
    const body = (request.body ?? {}) as { channel?: string };
    const existing = await prisma.integrationConnection.findFirst({
      where: { provider: 'SLACK' },
    });

    const data = {
      provider: 'SLACK' as const,
      status: 'CONNECTED' as const,
      accountEmail: body.channel ?? '#continuum',
    };

    const connection = existing
      ? await prisma.integrationConnection.update({ where: { id: existing.id }, data })
      : await prisma.integrationConnection.create({
          data: { ...data, organizationId: orgId() },
        });

    return serializeConnection(connection);
  });
};
