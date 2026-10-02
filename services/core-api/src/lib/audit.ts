import type { EntityType } from '@continuum/shared';
import { prisma } from '../db/client.js';
import { getContext } from '../db/context.js';

export interface AuditEntry {
  entityType: EntityType;
  entityId: string;
  field: string;
  priorValue?: unknown;
  newValue?: unknown;
}

function stringify(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

/**
 * Records a field-level change with actor, timestamp and prior value (FR-DATA-07).
 *
 * Two agents writing the same field is last-write-wins at the database layer;
 * this log is what makes the conflict visible after the fact rather than
 * silently resolved.
 */
export async function recordAudit(entries: AuditEntry | AuditEntry[]): Promise<void> {
  const list = Array.isArray(entries) ? entries : [entries];
  if (list.length === 0) return;

  const ctx = getContext();
  if (!ctx) return;

  await prisma.auditLog.createMany({
    data: list.map((entry) => ({
      organizationId: ctx.organizationId,
      actorType: ctx.actorType,
      actorId: ctx.userId,
      actorName: ctx.userName,
      entityType: entry.entityType,
      entityId: entry.entityId,
      field: entry.field,
      priorValue: stringify(entry.priorValue),
      newValue: stringify(entry.newValue),
    })),
  });
}

/**
 * Builds audit entries from a before/after pair, emitting one row per field
 * that actually changed.
 */
export function diffFields<T extends Record<string, unknown>>(
  entityType: EntityType,
  entityId: string,
  before: T,
  after: Partial<T>,
): AuditEntry[] {
  const entries: AuditEntry[] = [];
  for (const [field, newValue] of Object.entries(after)) {
    if (newValue === undefined) continue;
    const priorValue = before[field];
    if (stringify(priorValue) === stringify(newValue)) continue;
    entries.push({ entityType, entityId, field, priorValue, newValue });
  }
  return entries;
}
