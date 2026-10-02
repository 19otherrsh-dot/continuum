import type { FastifyPluginAsync } from 'fastify';
import { createTaskSchema, listQuerySchema, updateTaskSchema } from '@continuum/shared';
import { prisma } from '../../db/client.js';
import { orgId } from '../../db/context.js';
import { diffFields, recordAudit } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';
import { ownerScopeFilter } from '../common/scope.js';
import { serializeTask } from '../common/serializers.js';

export const taskRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.requireAuth);

  app.get('/tasks', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const scope = await ownerScopeFilter();
    const where: Record<string, unknown> = { ...scope };
    if (query.status) where.status = query.status;
    if (query.ownerId) where.ownerId = query.ownerId;

    const [rows, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    return { data: rows.map(serializeTask), total, page: query.page, pageSize: query.pageSize };
  });

  app.post('/tasks', async (request, reply) => {
    const input = createTaskSchema.parse(request.body);
    const ctx = request.ctx!;

    const row = await prisma.task.create({
      data: {
        organizationId: orgId(),
        title: input.title,
        notes: input.notes ?? null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        ownerId: input.ownerId ?? ctx.userId,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        source: 'HUMAN',
      },
    });
    return reply.status(201).send(serializeTask(row));
  });

  app.patch('/tasks/:id', async (request) => {
    const { id } = request.params as { id: string };
    const input = updateTaskSchema.parse(request.body);

    const before = await prisma.task.findFirst({ where: { id } });
    if (!before) throw notFound('Task');

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.notes !== undefined) data.notes = input.notes ?? null;
    if (input.dueAt !== undefined) data.dueAt = input.dueAt ? new Date(input.dueAt) : null;
    if (input.ownerId !== undefined) data.ownerId = input.ownerId ?? null;
    // `source` is deliberately not touched: an agent-created task stays
    // identifiable as agent-created even after a human completes it.
    if (input.status !== undefined) data.status = input.status;

    const row = await prisma.task.update({ where: { id }, data });
    await recordAudit(diffFields('TASK', id, before as Record<string, unknown>, data));
    return serializeTask(row);
  });

  app.delete('/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.task.findFirst({ where: { id } });
    if (!existing) throw notFound('Task');
    await prisma.task.delete({ where: { id } });
    return reply.status(204).send();
  });
};
