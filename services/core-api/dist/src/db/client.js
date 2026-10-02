import { PrismaClient } from '@prisma/client';
import { getContext, isUnscoped } from './context.js';
/**
 * Models that carry `organizationId` directly. Every query against one of
 * these is scoped to the ambient tenant automatically.
 *
 * Models absent from this list (Stage, DealContact, ActivityLink, Milestone,
 * ProcessedMessage, …) are reachable only through a scoped parent, so they
 * inherit the boundary rather than needing their own column.
 */
const TENANT_SCOPED_MODELS = new Set([
    'Team',
    'User',
    'Pipeline',
    'Company',
    'Contact',
    'Deal',
    'Activity',
    'AgentAction',
    'AgentCorrection',
    'Project',
    'Task',
    'IntegrationConnection',
    'CaptureExclusion',
    'Proposal',
    'CustomFieldDef',
    'Tag',
    'AuditLog',
    'FieldPermission',
    'Notification',
    'ApiToken',
    'ExportJob',
]);
/** Operations whose `where` should be narrowed to the tenant. */
const FILTERED_OPS = new Set([
    'findUnique',
    'findUniqueOrThrow',
    'findFirst',
    'findFirstOrThrow',
    'findMany',
    'count',
    'aggregate',
    'groupBy',
    'updateMany',
    'deleteMany',
    'update',
    'delete',
    'upsert',
]);
/** Operations whose `data` should be stamped with the tenant. */
const CREATE_OPS = new Set(['create', 'createMany', 'upsert']);
/** Read operations, used to police unfiltered Organization lookups. */
const READ_OPS = new Set([
    'findUnique',
    'findUniqueOrThrow',
    'findFirst',
    'findFirstOrThrow',
    'findMany',
]);
function withOrgFilter(where, organizationId) {
    const base = (where ?? {});
    return { ...base, organizationId };
}
/**
 * The ambient tenant is applied *last* so it always wins. Callers pass
 * `organizationId` explicitly to satisfy Prisma's generated types, but a wrong
 * or hostile value can never take effect — this is the enforcement point.
 */
function stampOrg(data, organizationId) {
    if (Array.isArray(data)) {
        return data.map((row) => ({ ...row, organizationId }));
    }
    return { ...(data ?? {}), organizationId };
}
const base = new PrismaClient({
    log: process.env.PRISMA_LOG === 'query' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});
/**
 * Tenant isolation, enforced once.
 *
 * This is defence in depth rather than the only line of defence: the SQL in
 * `prisma/migrations/*_row_level_security` defines equivalent Postgres RLS
 * policies, ready to enable before production so isolation survives even a
 * direct database connection (PRD Part Five, §24 production-hardening note).
 */
export const prisma = base.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                if (isUnscoped())
                    return query(args);
                /**
                 * `Organization` cannot be filtered by `organizationId` — it *is* the
                 * tenant — so the generic scoping below does not apply to it. That
                 * makes a bare `organization.findFirst()` silently return an arbitrary
                 * workspace, which is a cross-tenant leak that reads like ordinary
                 * code.
                 *
                 * Rather than rely on every call site remembering, reads are required
                 * to pin `id` to the ambient tenant. Getting it wrong is now a loud
                 * failure instead of wrong data.
                 */
                if (model === 'Organization' && READ_OPS.has(operation)) {
                    const ctx = getContext();
                    const where = args.where;
                    if (ctx && where?.id !== ctx.organizationId) {
                        throw new Error(`Organization.${operation} must select the ambient tenant explicitly ` +
                            `(where: { id: ctx.organizationId }). A bare query here returns an ` +
                            'arbitrary workspace. Use runUnscoped() if this is genuinely cross-tenant.');
                    }
                    return query(args);
                }
                if (!TENANT_SCOPED_MODELS.has(model)) {
                    return query(args);
                }
                const ctx = getContext();
                if (!ctx) {
                    throw new Error(`Tenant-scoped query on ${model}.${operation} ran without a request context. ` +
                        'Wrap it in runWithContext(), or runUnscoped() if it is genuinely cross-tenant.');
                }
                const next = { ...args };
                if (FILTERED_OPS.has(operation)) {
                    next.where = withOrgFilter(next.where, ctx.organizationId);
                }
                if (CREATE_OPS.has(operation)) {
                    if (operation === 'upsert') {
                        next.create = stampOrg(next.create, ctx.organizationId);
                    }
                    else if (next.data !== undefined) {
                        next.data = stampOrg(next.data, ctx.organizationId);
                    }
                }
                return query(next);
            },
        },
    },
});
export async function disconnect() {
    await base.$disconnect();
}
