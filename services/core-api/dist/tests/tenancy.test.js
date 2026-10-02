import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db/client.js';
import { runUnscoped, runWithContext } from '../src/db/context.js';
import { createDefaultPipeline } from '../src/modules/workspace/bootstrap.js';
import { purgeAttributes, setTags } from '../src/modules/common/attributes.js';
/**
 * Tenancy isolation, exercised against a real database.
 *
 * These are integration tests on purpose. The whole isolation mechanism is a
 * Prisma client extension — a pure-function test cannot observe it, and the
 * absence of tests at this layer is exactly what let two cross-tenant defects
 * through review: an unfiltered `Organization` read, and `deleteMany` calls on
 * join tables that carry no `organizationId` of their own.
 *
 * Requires the dev database (docker compose up -d). Data is namespaced and
 * torn down afterwards.
 */
const SUFFIX = `t${Date.now()}`;
let orgA = '';
let orgB = '';
let ctxA;
let ctxB;
function ctxFor(organizationId) {
    return {
        organizationId,
        userId: null,
        userName: 'tenancy-test',
        role: 'ADMIN',
        actorType: 'SYSTEM',
    };
}
/**
 * Always `await` inside the store.
 *
 * Prisma promises are lazy — handing one back out of `runWithContext` defers
 * the query until after the store has exited, and the extension then refuses
 * it for lack of context. This helper makes the correct shape the only shape
 * available to the tests below.
 */
function asA(fn) {
    return runWithContext(ctxA, async () => await fn());
}
function asB(fn) {
    return runWithContext(ctxB, async () => await fn());
}
beforeAll(async () => {
    const [a, b] = await runUnscoped(() => Promise.all([
        prisma.organization.create({ data: { name: `Alpha ${SUFFIX}`, motion: 'SALES' } }),
        prisma.organization.create({ data: { name: `Beta ${SUFFIX}`, motion: 'AGENCY' } }),
    ]));
    orgA = a.id;
    orgB = b.id;
    ctxA = ctxFor(orgA);
    ctxB = ctxFor(orgB);
    const hash = await bcrypt.hash('password123', 4);
    await runWithContext(ctxA, async () => {
        await prisma.user.create({
            data: { organizationId: orgA, email: `a-${SUFFIX}@x.test`, name: 'A', passwordHash: hash },
        });
        await createDefaultPipeline('SALES');
        await prisma.company.create({
            data: { organizationId: orgA, name: 'Alpha Corp', domain: `alpha-${SUFFIX}.test` },
        });
    });
    await runWithContext(ctxB, async () => {
        await prisma.user.create({
            data: { organizationId: orgB, email: `b-${SUFFIX}@x.test`, name: 'B', passwordHash: hash },
        });
        await createDefaultPipeline('AGENCY');
        await prisma.company.create({
            data: { organizationId: orgB, name: 'Beta Corp', domain: `beta-${SUFFIX}.test` },
        });
    });
}, 30_000);
afterAll(async () => {
    await runUnscoped(async () => {
        for (const id of [orgA, orgB].filter(Boolean)) {
            await prisma.organization.delete({ where: { id } }).catch(() => undefined);
        }
    });
});
describe('tenant scoping', () => {
    it('lists only the ambient tenant\'s records', async () => {
        const seenByA = await asA(async () => (await prisma.company.findMany()).map((r) => r.name));
        const seenByB = await asB(async () => (await prisma.company.findMany()).map((r) => r.name));
        expect(seenByA).toEqual(['Alpha Corp']);
        expect(seenByB).toEqual(['Beta Corp']);
    });
    it('cannot read another tenant\'s record by id', async () => {
        const betaCompany = await asB(() => prisma.company.findFirstOrThrow());
        const leaked = await asA(() => prisma.company.findFirst({ where: { id: betaCompany.id } }));
        expect(leaked).toBeNull();
    });
    it('cannot update another tenant\'s record even with its exact id', async () => {
        const betaCompany = await asB(() => prisma.company.findFirstOrThrow());
        const result = await asA(() => prisma.company.updateMany({ where: { id: betaCompany.id }, data: { name: 'HIJACKED' } }));
        expect(result.count).toBe(0);
        const after = await asB(() => prisma.company.findUniqueOrThrow({ where: { id: betaCompany.id } }));
        expect(after.name).toBe('Beta Corp');
    });
    it('cannot delete another tenant\'s record', async () => {
        const betaCompany = await asB(() => prisma.company.findFirstOrThrow());
        const result = await asA(() => prisma.company.deleteMany({ where: { id: betaCompany.id } }));
        expect(result.count).toBe(0);
        const survives = await asB(() => prisma.company.findFirst({ where: { id: betaCompany.id } }));
        expect(survives).not.toBeNull();
    });
    /**
     * The ambient tenant is applied *last* when stamping a create, so a hostile
     * or mistaken organizationId in a payload cannot take effect.
     */
    it('ignores an organizationId supplied by the caller', async () => {
        const created = await asA(() => prisma.company.create({
            data: { organizationId: orgB, name: `Smuggled ${SUFFIX}`, domain: `smuggle-${SUFFIX}.test` },
        }));
        expect(created.organizationId).toBe(orgA);
        const visibleToB = await asB(() => prisma.company.findFirst({ where: { id: created.id } }));
        expect(visibleToB).toBeNull();
        await asA(() => prisma.company.delete({ where: { id: created.id } }));
    });
    it('refuses a tenant-scoped query with no ambient context', async () => {
        await expect(prisma.company.findMany()).rejects.toThrow(/without a request context/i);
    });
});
describe('Organization lookups', () => {
    /**
     * Organization cannot be filtered by organizationId — it *is* the tenant —
     * so an unpinned read silently returns an arbitrary workspace. That was a
     * live cross-tenant leak in the metrics endpoints; the extension now rejects
     * the shape outright.
     */
    it('rejects an unfiltered organization read', async () => {
        await expect(asA(() => prisma.organization.findFirst())).rejects.toThrow(/must select the ambient tenant/i);
    });
    it('rejects reading a different tenant\'s organization by id', async () => {
        await expect(asA(() => prisma.organization.findUnique({ where: { id: orgB } }))).rejects.toThrow(/must select the ambient tenant/i);
    });
    it('allows the correctly pinned read', async () => {
        const org = await asA(() => prisma.organization.findUniqueOrThrow({ where: { id: orgA } }));
        expect(org.id).toBe(orgA);
    });
});
describe('join tables without their own organizationId', () => {
    /**
     * Tagging, CustomFieldValue and ActivityLink are reachable only through a
     * scoped parent, so the extension does not filter them. Deletes therefore
     * have to be scoped through that relation by hand — previously they were
     * not, which made `purgeAttributes` a cross-tenant delete waiting for an id
     * collision.
     */
    it('does not delete another tenant\'s tags for a colliding entity id', async () => {
        const sharedEntityId = randomUUID();
        await asA(() => setTags('DEAL', sharedEntityId, ['alpha-tag']));
        await asB(() => setTags('DEAL', sharedEntityId, ['beta-tag']));
        // A purges its own attributes for that id.
        await asA(() => purgeAttributes('DEAL', sharedEntityId));
        const betaTags = await asB(() => prisma.tagging.findMany({
            where: { entityType: 'DEAL', entityId: sharedEntityId, tag: { organizationId: orgB } },
            include: { tag: true },
        }));
        expect(betaTags.map((t) => t.tag.name)).toEqual(['beta-tag']);
        // And A's own tag is gone, so the scoping did not simply disable the purge.
        const alphaTags = await asA(() => prisma.tagging.findMany({
            where: { entityType: 'DEAL', entityId: sharedEntityId, tag: { organizationId: orgA } },
        }));
        expect(alphaTags).toHaveLength(0);
    });
});
