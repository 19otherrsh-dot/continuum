import type { EntityType } from '@continuum/shared';
import { prisma } from '../../db/client.js';
import { requireContext } from '../../db/context.js';
import { badRequest } from '../../lib/errors.js';

/**
 * Tags and custom fields are generic across entity types, so both live here
 * rather than being reimplemented per module.
 */

export async function setTags(
  entityType: EntityType,
  entityId: string,
  names: string[] | undefined,
): Promise<void> {
  if (!names) return;
  const { organizationId } = requireContext();
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];

  const tags = await Promise.all(
    unique.map((name) =>
      prisma.tag.upsert({
        where: { organizationId_name: { organizationId, name } },
        create: { name, organizationId },
        update: {},
      }),
    ),
  );

  // Scoped through the tag's organization — Tagging has no organizationId of
  // its own, so the client extension cannot scope it automatically.
  await prisma.tagging.deleteMany({
    where: { entityType, entityId, tag: { organizationId } },
  });
  if (tags.length > 0) {
    await prisma.tagging.createMany({
      data: tags.map((tag) => ({ tagId: tag.id, entityType, entityId })),
      skipDuplicates: true,
    });
  }
}

export async function getTags(entityType: EntityType, entityIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (entityIds.length === 0) return map;

  const rows = await prisma.tagging.findMany({
    where: { entityType, entityId: { in: entityIds } },
    include: { tag: true },
  });
  for (const row of rows) {
    const list = map.get(row.entityId) ?? [];
    list.push(row.tag.name);
    map.set(row.entityId, list);
  }
  return map;
}

/**
 * Writes custom field values. Unknown keys are rejected rather than silently
 * dropped, so a typo surfaces immediately instead of appearing to save.
 */
export async function setCustomFields(
  entityType: EntityType,
  entityId: string,
  values: Record<string, unknown> | undefined,
): Promise<void> {
  if (!values || Object.keys(values).length === 0) return;
  const { organizationId } = requireContext();

  const defs = await prisma.customFieldDef.findMany({
    where: { organizationId, entityType, archivedAt: null },
  });
  const byKey = new Map(defs.map((def) => [def.key, def]));

  for (const [key, value] of Object.entries(values)) {
    const def = byKey.get(key);
    if (!def) throw badRequest(`Unknown custom field "${key}" for ${entityType}`);

    if (value === null || value === undefined) {
      await prisma.customFieldValue.deleteMany({ where: { defId: def.id, entityId } });
      continue;
    }
    await prisma.customFieldValue.upsert({
      where: { defId_entityId: { defId: def.id, entityId } },
      create: { defId: def.id, entityId, value: value as object },
      update: { value: value as object },
    });
  }
}

/**
 * Reads custom field values.
 *
 * Values whose definition has been archived are still returned, because a
 * deleted field must not silently remove data from exports — the definition is
 * soft-deleted precisely so recorded values survive (Epic B edge case).
 */
export async function getCustomFields(
  entityType: EntityType,
  entityIds: string[],
  options: { includeArchived?: boolean } = {},
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (entityIds.length === 0) return map;
  const { organizationId } = requireContext();

  const defs = await prisma.customFieldDef.findMany({
    where: {
      organizationId,
      entityType,
      ...(options.includeArchived ? {} : { archivedAt: null }),
    },
  });
  if (defs.length === 0) return map;

  const values = await prisma.customFieldValue.findMany({
    where: { defId: { in: defs.map((d) => d.id) }, entityId: { in: entityIds } },
  });
  const defById = new Map(defs.map((d) => [d.id, d]));

  for (const value of values) {
    const def = defById.get(value.defId);
    if (!def) continue;
    const bucket = map.get(value.entityId) ?? {};
    bucket[def.key] = value.value;
    map.set(value.entityId, bucket);
  }
  return map;
}

/**
 * Removes tags, custom field values and activity links belonging to a deleted
 * record.
 *
 * Every filter is scoped through the row's tenant-owning relation. These three
 * models carry no `organizationId` of their own, so the client extension does
 * not scope them — a bare `deleteMany({ where: { entityId } })` here would run
 * across every tenant. UUID entity ids make a collision implausible in
 * practice, but "implausible" is not the standard a delete should be held to.
 */
export async function purgeAttributes(entityType: EntityType, entityId: string): Promise<void> {
  const { organizationId } = requireContext();

  await prisma.tagging.deleteMany({
    where: { entityType, entityId, tag: { organizationId } },
  });
  await prisma.customFieldValue.deleteMany({
    where: { entityId, def: { organizationId } },
  });
  await prisma.activityLink.deleteMany({
    where: { entityType, entityId, activity: { organizationId } },
  });
}
