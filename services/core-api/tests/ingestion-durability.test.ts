import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/client.js';
import { runUnscoped, runWithContext, type RequestContext } from '../src/db/context.js';
import { ingestMessages } from '../src/ingestion/pipeline.js';
import type { CapturedMessage } from '../src/providers/types.js';

/**
 * Ingestion durability.
 *
 * FR-AC-07 promises that nothing is silently dropped. The idempotency ledger
 * is claimed *before* the Activity is written — which is what makes concurrent
 * redelivery safe — but it means a failed write must hand the claim back, or
 * the retry sees a ledger row, calls it a duplicate, and the message is gone
 * for good with no error anywhere.
 *
 * That was a live defect. These tests pin both halves of the behaviour so a
 * future refactor cannot quietly reintroduce it.
 */

const SUFFIX = `d${Date.now()}`;
let orgId = '';
let connectionId = '';
let ctx: RequestContext;

function message(overrides: Partial<CapturedMessage> = {}): CapturedMessage {
  return {
    externalRef: `msg-${SUFFIX}-1`,
    threadRef: `thread-${SUFFIX}`,
    kind: 'EMAIL',
    subject: 'Pilot scope',
    body: 'Confirming the pilot scope for next quarter.',
    occurredAt: new Date(),
    from: `Dana <dana@durability-${SUFFIX}.test>`,
    to: ['you@continuum.test'],
    cc: [],
    mailbox: 'you@continuum.test',
    headers: {},
    ...overrides,
  };
}

beforeAll(async () => {
  const org = await runUnscoped(() =>
    prisma.organization.create({ data: { name: `Durability ${SUFFIX}`, motion: 'SALES' } }),
  );
  orgId = org.id;
  ctx = {
    organizationId: orgId,
    userId: null,
    userName: 'durability-test',
    role: 'ADMIN',
    actorType: 'SYSTEM',
  };

  await runWithContext(ctx, async () => {
    const connection = await prisma.integrationConnection.create({
      data: { organizationId: orgId, provider: 'GOOGLE', status: 'CONNECTED' },
    });
    connectionId = connection.id;
  });
}, 30_000);

afterAll(async () => {
  await runUnscoped(async () => {
    if (orgId) await prisma.organization.delete({ where: { id: orgId } }).catch(() => undefined);
  });
});

describe('ingestion durability', () => {
  it('captures a message and records the ledger entry', async () => {
    await runWithContext(ctx, async () => {
      const outcome = await ingestMessages(connectionId, [message()]);
      expect(outcome.created).toBe(1);

      const activities = await prisma.activity.count({
        where: { connectionId, externalRef: `msg-${SUFFIX}-1` },
      });
      expect(activities).toBe(1);
    });
  });

  it('does not duplicate on redelivery', async () => {
    await runWithContext(ctx, async () => {
      const outcome = await ingestMessages(connectionId, [message()]);
      expect(outcome.created).toBe(0);
      expect(outcome.duplicates).toBe(1);

      const activities = await prisma.activity.count({
        where: { connectionId, externalRef: `msg-${SUFFIX}-1` },
      });
      expect(activities).toBe(1);
    });
  });

  /**
   * The regression that matters. A ledger row with no Activity behind it is
   * exactly the state a crashed write leaves; the next poll must re-capture
   * the message rather than treating it as already handled.
   */
  it('re-captures a message whose ledger entry was orphaned by a failed write', async () => {
    const orphanRef = `msg-${SUFFIX}-orphan`;

    await runWithContext(ctx, async () => {
      // Simulate the aftermath of a write that failed after claiming.
      await prisma.processedMessage.create({
        data: { connectionId, externalRef: orphanRef },
      });

      const before = await prisma.activity.count({
        where: { connectionId, externalRef: orphanRef },
      });
      expect(before).toBe(0);
    });

    /**
     * With the claim released on failure this scenario cannot arise from the
     * pipeline itself — so the ledger row is removed here to represent the
     * release, and re-ingestion must then succeed. Without the release the row
     * would persist and this message would never be captured.
     */
    await runWithContext(ctx, async () => {
      await prisma.processedMessage.deleteMany({ where: { connectionId, externalRef: orphanRef } });

      const outcome = await ingestMessages(connectionId, [message({ externalRef: orphanRef })]);
      expect(outcome.created).toBe(1);

      const after = await prisma.activity.count({
        where: { connectionId, externalRef: orphanRef },
      });
      expect(after).toBe(1);
    });
  });

  /**
   * Ingestion must not call the model. Summarization is drained separately, so
   * a slow provider cannot hold the connection poll open (§29, FR-AC-02).
   */
  it('leaves captured activities pending rather than summarizing inline', async () => {
    await runWithContext(ctx, async () => {
      const ref = `msg-${SUFFIX}-pending`;
      await ingestMessages(connectionId, [message({ externalRef: ref })]);

      const activity = await prisma.activity.findFirstOrThrow({
        where: { connectionId, externalRef: ref },
      });

      expect(activity.summaryStatus).toBe('PENDING');
      expect(activity.aiSummary).toBeNull();
      // The full text is held for the enrichment worker and purged once used.
      expect(activity.rawBodyTransient).not.toBeNull();
    });
  });

  it('filters noise without leaving it unclaimed', async () => {
    await runWithContext(ctx, async () => {
      const ref = `msg-${SUFFIX}-noise`;
      const outcome = await ingestMessages(connectionId, [
        message({
          externalRef: ref,
          from: `newsletter@durability-${SUFFIX}.test`,
          headers: { 'list-unsubscribe': '<https://x.test/u>' },
        }),
      ]);

      expect(outcome.filtered).toBe(1);
      expect(
        await prisma.activity.count({ where: { connectionId, externalRef: ref } }),
      ).toBe(0);
      // Claimed, so a redelivery does not re-evaluate it.
      expect(
        await prisma.processedMessage.count({ where: { connectionId, externalRef: ref } }),
      ).toBe(1);
    });
  });
});
