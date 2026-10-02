import { prisma } from '../../db/client.js';
import { requireContext } from '../../db/context.js';

/**
 * Ownership scoping (Epic G).
 *
 *   MEMBER  — records they own
 *   MANAGER — every record owned by anyone on their team (FR-PERM-03)
 *   ADMIN   — the whole workspace
 *
 * Returns a Prisma `where` fragment on `ownerId`, or `{}` for unrestricted
 * access. Tenant scoping is already handled by the client extension, so this
 * only narrows *within* a workspace.
 */
export async function ownerScopeFilter(): Promise<Record<string, unknown>> {
  const ctx = requireContext();

  if (ctx.role === 'ADMIN' || ctx.role === null) return {};
  if (!ctx.userId) return {};

  if (ctx.role === 'MANAGER') {
    const me = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { teamId: true },
    });
    if (!me?.teamId) {
      // A manager with no team sees their own records; they have no team to
      // manage yet, and inheriting workspace-wide visibility would be wrong.
      return { ownerId: ctx.userId };
    }
    const teammates = await prisma.user.findMany({
      where: { teamId: me.teamId },
      select: { id: true },
    });
    return { ownerId: { in: teammates.map((u) => u.id) } };
  }

  return { ownerId: ctx.userId };
}

/** True when the caller may read/write a record with this owner. */
export async function canAccessOwner(ownerId: string | null): Promise<boolean> {
  const ctx = requireContext();
  if (ctx.role === 'ADMIN' || ctx.role === null) return true;
  if (ownerId === null) return true;
  if (ownerId === ctx.userId) return true;

  if (ctx.role === 'MANAGER' && ctx.userId) {
    const [me, them] = await Promise.all([
      prisma.user.findUnique({ where: { id: ctx.userId }, select: { teamId: true } }),
      prisma.user.findUnique({ where: { id: ownerId }, select: { teamId: true } }),
    ]);
    return Boolean(me?.teamId && me.teamId === them?.teamId);
  }

  return false;
}
