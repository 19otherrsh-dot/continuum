import type { FastifyPluginAsync } from 'fastify';
import { createPipelineSchema } from '@continuum/shared';
import { prisma } from '../../db/client.js';
import { orgId } from '../../db/context.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { requireRole } from '../../plugins/auth.js';
import { serializePipeline } from '../common/serializers.js';

export const pipelineRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.requireAuth);

  app.get('/pipelines', async () => {
    const rows = await prisma.pipeline.findMany({
      include: { stages: { orderBy: { order: 'asc' } } },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return { data: rows.map(serializePipeline) };
  });

  /**
   * Multiple pipelines are core architecture from V1, not an upsell — a team
   * that outgrows one pipeline should not hit a plan wall (FR-PERM-04).
   */
  app.post('/pipelines', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const input = createPipelineSchema.parse(request.body);

    const stages = input.stages ?? [
      { name: 'New', winProbability: 0.1 },
      { name: 'In Progress', winProbability: 0.5 },
      { name: 'Won', winProbability: 1, isWonStage: true },
      { name: 'Lost', winProbability: 0, isLostStage: true },
    ];

    const pipeline = await prisma.pipeline.create({
      data: {
        organizationId: orgId(),
        name: input.name,
        isDefault: false,
        stages: {
          create: stages.map((stage, index) => ({
            name: stage.name,
            order: index,
            winProbability: stage.winProbability ?? 0,
            isWonStage: stage.isWonStage ?? false,
            isLostStage: stage.isLostStage ?? false,
          })),
        },
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    return reply.status(201).send(serializePipeline(pipeline));
  });

  app.patch('/pipelines/:id/stages/:stageId', { preHandler: requireRole('ADMIN') }, async (request) => {
    const { id, stageId } = request.params as { id: string; stageId: string };
    const body = request.body as {
      name?: string;
      winProbability?: number;
      isWonStage?: boolean;
      isLostStage?: boolean;
    };

    const pipeline = await prisma.pipeline.findFirst({ where: { id } });
    if (!pipeline) throw notFound('Pipeline');

    const stage = await prisma.stage.findUnique({ where: { id: stageId } });
    if (!stage || stage.pipelineId !== id) throw notFound('Stage');

    const updated = await prisma.stage.update({
      where: { id: stageId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.winProbability !== undefined ? { winProbability: body.winProbability } : {}),
        ...(body.isWonStage !== undefined ? { isWonStage: body.isWonStage } : {}),
        ...(body.isLostStage !== undefined ? { isLostStage: body.isLostStage } : {}),
      },
    });
    return updated;
  });

  app.post('/pipelines/:id/stages', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; winProbability?: number };
    if (!body?.name) throw badRequest('name is required');

    const pipeline = await prisma.pipeline.findFirst({ where: { id } });
    if (!pipeline) throw notFound('Pipeline');

    const last = await prisma.stage.findFirst({
      where: { pipelineId: id },
      orderBy: { order: 'desc' },
    });

    // New stages land before the terminal Won/Lost stages, which is almost
    // always what an admin adding a stage means.
    const terminalOrder = await prisma.stage.findFirst({
      where: { pipelineId: id, OR: [{ isWonStage: true }, { isLostStage: true }] },
      orderBy: { order: 'asc' },
    });

    const order = terminalOrder ? terminalOrder.order : (last?.order ?? -1) + 1;
    if (terminalOrder) {
      await prisma.stage.updateMany({
        where: { pipelineId: id, order: { gte: order } },
        data: { order: { increment: 1 } },
      });
    }

    const stage = await prisma.stage.create({
      data: {
        pipelineId: id,
        name: body.name,
        order,
        winProbability: body.winProbability ?? 0.5,
      },
    });
    return reply.status(201).send(stage);
  });
};
