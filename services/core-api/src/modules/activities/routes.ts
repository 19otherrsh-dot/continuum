import type { FastifyPluginAsync } from 'fastify';
import { createActivityNoteSchema, listQuerySchema } from '@continuum/shared';
import { prisma } from '../../db/client.js';
import { orgId } from '../../db/context.js';
import { recordAudit } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';
import { serializeActivity } from '../common/serializers.js';
import { touchDealActivity } from '../deals/service.js';

export const activityRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.requireAuth);

  app.get('/activities', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const where: Record<string, unknown> = {};
    if (query.q) {
      where.OR = [
        { subject: { contains: query.q, mode: 'insensitive' } },
        { aiSummary: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: { participants: { include: { contact: true } } },
        orderBy: { occurredAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.activity.count({ where }),
    ]);

    return {
      data: rows.map(serializeActivity),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  });

  app.get('/activities/:id', async (request) => {
    const { id } = request.params as { id: string };
    const row = await prisma.activity.findFirst({
      where: { id },
      include: { participants: { include: { contact: true } }, links: true },
    });
    if (!row) throw notFound('Activity');
    return serializeActivity(row);
  });

  /**
   * A manually written note. Manual notes sit on the same timeline as captured
   * email and calls — the user should not have to think about which system
   * produced an entry.
   *
   * `clientRequestId` makes the write idempotent so a note composed offline
   * and retried on reconnect syncs exactly once, without duplication.
   */
  app.post('/activities/notes', async (request, reply) => {
    const input = createActivityNoteSchema.parse(request.body);
    const ctx = request.ctx!;

    if (input.clientRequestId) {
      const existing = await prisma.activity.findFirst({
        where: { externalRef: `note:${input.clientRequestId}`, connectionId: null },
        include: { participants: { include: { contact: true } } },
      });
      if (existing) return reply.status(200).send(serializeActivity(existing));
    }

    const activity = await prisma.activity.create({
      data: {
        organizationId: orgId(),
        type: 'NOTE',
        direction: 'INTERNAL',
        subject: input.subject ?? null,
        body: input.body,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        source: 'HUMAN',
        // A human-authored note needs no AI summary — it is already the
        // author's own words.
        summaryStatus: 'SKIPPED',
        externalRef: input.clientRequestId ? `note:${input.clientRequestId}` : null,
        links: {
          create: { entityType: input.entityType, entityId: input.entityId, isPrimary: true },
        },
        participants: {
          create: (input.contactIds ?? []).map((contactId) => ({ contactId })),
        },
      },
      include: { participants: { include: { contact: true } } },
    });

    if (input.entityType === 'DEAL') {
      await touchDealActivity(input.entityId, activity.occurredAt);
    }

    await recordAudit({
      entityType: input.entityType,
      entityId: input.entityId,
      field: 'note',
      newValue: input.body.slice(0, 200),
    });

    void ctx;
    return reply.status(201).send(serializeActivity(activity));
  });

  app.delete('/activities/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.activity.findFirst({ where: { id } });
    if (!existing) throw notFound('Activity');
    await prisma.activity.delete({ where: { id } });
    return reply.status(204).send();
  });
};
