import { Prisma } from '@prisma/client';
import type { EntityType, NotificationType } from '@continuum/shared';
import { config } from '../../config.js';
import { prisma } from '../../db/client.js';
import { requireContext } from '../../db/context.js';
import { getSlackProvider } from '../../providers/index.js';

/** In-process fan-out to connected SSE clients, keyed by user id. */
type Listener = (event: { type: string; data: unknown }) => void;
const listeners = new Map<string, Set<Listener>>();

export function subscribe(userId: string, listener: Listener): () => void {
  const set = listeners.get(userId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(userId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(userId);
  };
}

export function publish(userId: string, type: string, data: unknown): void {
  for (const listener of listeners.get(userId) ?? []) {
    try {
      listener({ type, data });
    } catch {
      // A wedged client must never break the request that triggered the event.
    }
  }
}

export interface NotifyInput {
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: EntityType | null;
  entityId?: string | null;
  /** Restricts delivery; defaults to the owner of the referenced record. */
  userIds?: string[];
  /** Suppresses repeats of the same underlying event. */
  dedupeKey?: string;
  slackChannel?: string;
}

/**
 * Creates in-app notifications and pushes them to any connected client, so a
 * stalling flag or new proposal appears without a page refresh (FR-NOTIF-01).
 *
 * Slack delivery rides the same call when a workspace has it connected
 * (FR-INT-03) — the notification is authored once and routed, rather than
 * being reimplemented per channel.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const { organizationId } = requireContext();

  const recipients =
    input.userIds ??
    (await resolveRecipients(input.entityType ?? null, input.entityId ?? null));
  if (recipients.length === 0) return;

  for (const userId of recipients) {
    /**
     * Deduplication is enforced by a unique index on (userId, dedupeKey), not
     * by a read-then-write check — two workers flagging the same stalling deal
     * concurrently would both pass a lookup and both insert.
     *
     * The key has its own column. It used to be smuggled through `body`, which
     * meant any notification that also carried human-readable text wrote the
     * text and silently lost its deduplication.
     */
    let notification;
    try {
      notification = await prisma.notification.create({
        data: {
          organizationId,
          userId,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          dedupeKey: input.dedupeKey ?? null,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        input.dedupeKey
      ) {
        // Already notified about this exact event.
        continue;
      }
      throw error;
    }

    publish(userId, 'notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      entityType: notification.entityType,
      entityId: notification.entityId,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  await maybeSlack(input);
}

async function resolveRecipients(
  entityType: EntityType | null,
  entityId: string | null,
): Promise<string[]> {
  if (entityType === 'DEAL' && entityId) {
    const deal = await prisma.deal.findFirst({
      where: { id: entityId },
      select: { ownerId: true },
    });
    if (deal?.ownerId) return [deal.ownerId];
  }
  if (entityType === 'PROJECT' && entityId) {
    const project = await prisma.project.findFirst({
      where: { id: entityId },
      select: { ownerId: true },
    });
    if (project?.ownerId) return [project.ownerId];
  }

  // Unowned records fall back to admins, so nothing goes unseen.
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });
  return admins.map((a) => a.id);
}

async function maybeSlack(input: NotifyInput): Promise<void> {
  const connection = await prisma.integrationConnection.findFirst({
    where: { provider: 'SLACK', status: 'CONNECTED' },
  });
  if (!connection) return;

  try {
    const slack = getSlackProvider();
    await slack.notify({
      channel: input.slackChannel ?? connection.accountEmail ?? '#continuum',
      title: input.title,
      body: input.body ?? '',
      url:
        input.entityType && input.entityId
          ? `${config.webOrigin}/${input.entityType.toLowerCase()}s/${input.entityId}`
          : undefined,
    });
  } catch {
    // Slack being down must not fail the operation that produced the event.
  }
}
