import type { FastifyPluginAsync } from 'fastify';
import {
  confirmAgentActionSchema,
  listQuerySchema,
  rejectAgentActionSchema,
} from '@continuum/shared';
import { prisma } from '../../db/client.js';
import { notFound } from '../../lib/errors.js';
import { serializeAgentAction } from '../common/serializers.js';
import { agentActionInclude, confirmAgentAction, rejectAgentAction } from './service.js';

export const agentActionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.requireAuth);

  /**
   * The Agent Action Log (FR-AGENT-05).
   *
   * Every proposal the system has ever made is here — confirmed, rejected, and
   * pending alike — with its confidence score, the activity that triggered it,
   * and who reviewed it. Nothing is deleted and nothing auto-expires, because
   * a log that quietly drops entries is not observability.
   */
  app.get('/agent-actions', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;

    const [rows, total] = await Promise.all([
      prisma.agentAction.findMany({
        where,
        include: agentActionInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.agentAction.count({ where }),
    ]);

    return {
      data: rows.map(serializeAgentAction),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  });

  /** Pending proposals for a specific record, shown inline on that record. */
  app.get('/agent-actions/pending', async (request) => {
    const { entityType, entityId } = request.query as {
      entityType?: string;
      entityId?: string;
    };

    const rows = await prisma.agentAction.findMany({
      where: {
        status: 'PENDING',
        ...(entityType ? { targetEntityType: entityType as never } : {}),
        ...(entityId ? { targetEntityId: entityId } : {}),
      },
      include: agentActionInclude,
      orderBy: [{ tier: 'asc' }, { createdAt: 'desc' }],
    });
    return { data: rows.map(serializeAgentAction) };
  });

  app.get('/agent-actions/:id', async (request) => {
    const { id } = request.params as { id: string };
    const row = await prisma.agentAction.findFirst({
      where: { id },
      include: agentActionInclude,
    });
    if (!row) throw notFound('Agent action');
    return serializeAgentAction(row);
  });

  /**
   * Confirm — optionally with a correction.
   *
   * If `correctedPayload` is present, the corrected value is what gets applied,
   * and the difference is retained as context for future inference on this
   * account (FR-AGENT-03, FR-AGENT-04).
   */
  app.post('/agent-actions/:id/confirm', async (request) => {
    const { id } = request.params as { id: string };
    const input = confirmAgentActionSchema.parse(request.body ?? {});
    const row = await confirmAgentAction(id, input.correctedPayload);
    return serializeAgentAction(row);
  });

  app.post('/agent-actions/:id/reject', async (request) => {
    const { id } = request.params as { id: string };
    const input = rejectAgentActionSchema.parse(request.body ?? {});
    const row = await rejectAgentAction(id, input.reason);
    return serializeAgentAction(row);
  });

  /** Corrections the workspace has made, surfaced so the moat is inspectable. */
  app.get('/agent-actions/corrections', async () => {
    const rows = await prisma.agentCorrection.findMany({
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { data: rows };
  });
};
