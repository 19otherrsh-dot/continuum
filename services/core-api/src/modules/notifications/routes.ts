import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../db/client.js';
import { notFound } from '../../lib/errors.js';
import { serializeNotification } from '../common/serializers.js';
import { subscribe } from './service.js';

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.get('/notifications', { preHandler: [app.requireAuth] }, async (request) => {
    const userId = request.ctx!.userId;
    if (!userId) return { data: [], unread: 0 };

    const [rows, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { data: rows.map(serializeNotification), unread };
  });

  app.post('/notifications/:id/read', { preHandler: [app.requireAuth] }, async (request) => {
    const { id } = request.params as { id: string };
    const row = await prisma.notification.findFirst({ where: { id } });
    if (!row) throw notFound('Notification');

    const updated = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return serializeNotification(updated);
  });

  app.post('/notifications/read-all', { preHandler: [app.requireAuth] }, async (request) => {
    const userId = request.ctx!.userId;
    if (!userId) return { updated: 0 };

    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  });

  /**
   * Server-sent events.
   *
   * This is what makes a stalling flag or a new agent proposal appear without
   * the user refreshing (FR-NOTIF-01). SSE rather than websockets because the
   * traffic is strictly one-way and it survives proxies without negotiation.
   *
   * The token arrives as a query parameter because EventSource cannot set an
   * Authorization header.
   */
  app.get('/events/stream', async (request, reply) => {
    const { token } = request.query as { token?: string };

    let userId: string | null = null;
    if (token) {
      try {
        const payload = app.jwt.verify<{ sub: string }>(token);
        userId = payload.sub;
      } catch {
        userId = null;
      }
    } else if (request.ctx?.userId) {
      userId = request.ctx.userId;
    }

    if (!userId) {
      return reply.status(401).send({ error: { code: 'unauthorized', message: 'Token required' } });
    }

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Defeats proxy buffering, which would otherwise hold events until the
      // connection closed — the opposite of the point.
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(': connected\n\n');

    const unsubscribe = subscribe(userId, (event) => {
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
    });

    // Comment frames keep intermediaries from timing the connection out.
    const heartbeat = setInterval(() => reply.raw.write(': ping\n\n'), 25_000);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    return reply;
  });
};
