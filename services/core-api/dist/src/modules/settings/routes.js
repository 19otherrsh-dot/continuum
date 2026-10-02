import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createApiTokenSchema, createCustomFieldSchema, createExclusionSchema, inviteUserSchema, updateOrgSettingsSchema, updateUserRoleSchema, } from '@continuum/shared';
import bcrypt from 'bcryptjs';
import { track } from '../../analytics/events.js';
import { prisma } from '../../db/client.js';
import { orgId } from '../../db/context.js';
import { runWithContext } from '../../db/context.js';
import { generateApiToken } from '../../lib/crypto.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/errors.js';
import { requireRole } from '../../plugins/auth.js';
import { serializeConnection, serializeUser } from '../common/serializers.js';
import { runExport } from '../export/service.js';
import { showProjectsFor } from '../workspace/bootstrap.js';
export const settingsRoutes = async (app) => {
    app.addHook('preHandler', app.requireAuth);
    // ---------------------------------------------------------------- workspace
    app.get('/settings/organization', async (request) => {
        const org = await prisma.organization.findUniqueOrThrow({
            where: { id: request.ctx.organizationId },
        });
        const seatsUsed = await prisma.user.count();
        return {
            id: org.id,
            name: org.name,
            motion: org.motion,
            showProjectsUi: org.showProjectsUi,
            stallingThresholdDays: org.stallingThresholdDays,
            agentHighThreshold: org.agentHighThreshold,
            agentMediumThreshold: org.agentMediumThreshold,
            planName: org.planName,
            seatCount: seatsUsed,
            pricePerSeatCents: org.pricePerSeatCents,
        };
    });
    app.patch('/settings/organization', { preHandler: requireRole('ADMIN') }, async (request) => {
        const input = updateOrgSettingsSchema.parse(request.body);
        const id = request.ctx.organizationId;
        if (input.agentHighThreshold !== undefined &&
            input.agentMediumThreshold !== undefined &&
            input.agentMediumThreshold > input.agentHighThreshold) {
            throw badRequest('The medium confidence threshold cannot exceed the high threshold');
        }
        const data = {};
        if (input.name !== undefined)
            data.name = input.name;
        if (input.stallingThresholdDays !== undefined) {
            // Applies on the next evaluation cycle rather than retroactively
            // rewriting history (FR-ADMIN-04).
            data.stallingThresholdDays = input.stallingThresholdDays;
        }
        if (input.agentHighThreshold !== undefined)
            data.agentHighThreshold = input.agentHighThreshold;
        if (input.agentMediumThreshold !== undefined) {
            data.agentMediumThreshold = input.agentMediumThreshold;
        }
        if (input.motion !== undefined) {
            data.motion = input.motion;
            // Switching motion re-derives Project visibility unless the admin is
            // overriding it explicitly in the same request.
            data.showProjectsUi = input.showProjectsUi ?? showProjectsFor(input.motion);
        }
        else if (input.showProjectsUi !== undefined) {
            data.showProjectsUi = input.showProjectsUi;
        }
        const org = await prisma.organization.update({ where: { id }, data });
        return {
            id: org.id,
            name: org.name,
            motion: org.motion,
            showProjectsUi: org.showProjectsUi,
            stallingThresholdDays: org.stallingThresholdDays,
            agentHighThreshold: org.agentHighThreshold,
            agentMediumThreshold: org.agentMediumThreshold,
        };
    });
    /** Billing summary. Every line is explainable — no hidden fees (FR-ADMIN-01). */
    app.get('/settings/billing', async (request) => {
        const org = await prisma.organization.findUniqueOrThrow({
            where: { id: request.ctx.organizationId },
        });
        const seats = await prisma.user.count();
        const nextInvoiceCents = seats * org.pricePerSeatCents;
        const now = new Date();
        const nextInvoiceDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return {
            planName: org.planName,
            seats,
            pricePerSeatCents: org.pricePerSeatCents,
            lineItems: [
                {
                    description: `${org.planName} plan — ${seats} seat${seats === 1 ? '' : 's'}`,
                    quantity: seats,
                    unitPriceCents: org.pricePerSeatCents,
                    totalCents: nextInvoiceCents,
                },
            ],
            nextInvoiceCents,
            nextInvoiceDate: nextInvoiceDate.toISOString(),
            // Stated explicitly because opacity here is the category's trust problem.
            notes: [
                'Pricing is per seat. There are no per-record, per-email, or AI usage charges.',
                'Automatic capture, AI summaries, and agent proposals are included at every tier.',
                'Full data export is free on every plan.',
            ],
        };
    });
    // ------------------------------------------------------------------- people
    app.get('/settings/users', async () => {
        const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
        return { data: users.map(serializeUser) };
    });
    app.post('/settings/users', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
        const input = inviteUserSchema.parse(request.body);
        const existing = await prisma.user.findFirst({ where: { email: input.email.toLowerCase() } });
        if (existing)
            throw conflict('That email is already a member of this workspace');
        const user = await prisma.user.create({
            data: {
                organizationId: orgId(),
                email: input.email.toLowerCase(),
                name: input.name,
                role: input.role,
                teamId: input.teamId ?? null,
                passwordHash: await bcrypt.hash(input.password, 10),
            },
        });
        await prisma.organization.update({
            where: { id: request.ctx.organizationId },
            data: { seatCount: await prisma.user.count() },
        });
        return reply.status(201).send(serializeUser(user));
    });
    app.patch('/settings/users/:id', { preHandler: requireRole('ADMIN') }, async (request) => {
        const { id } = request.params;
        const input = updateUserRoleSchema.parse(request.body);
        const target = await prisma.user.findFirst({ where: { id } });
        if (!target)
            throw notFound('User');
        // A workspace must never be left without an administrator, so the last
        // admin cannot demote themselves out of the role (Epic G edge case).
        if (input.role && input.role !== 'ADMIN' && target.role === 'ADMIN') {
            const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
            if (admins <= 1) {
                throw badRequest('This is the only administrator. Promote another member to admin first.');
            }
        }
        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(input.role !== undefined ? { role: input.role } : {}),
                ...(input.teamId !== undefined ? { teamId: input.teamId ?? null } : {}),
            },
        });
        return serializeUser(user);
    });
    app.get('/settings/teams', async () => {
        const teams = await prisma.team.findMany({
            include: { members: { select: { id: true, name: true, email: true, role: true } } },
            orderBy: { name: 'asc' },
        });
        return { data: teams };
    });
    app.post('/settings/teams', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
        const body = request.body;
        if (!body?.name)
            throw badRequest('name is required');
        const team = await prisma.team.create({ data: { organizationId: orgId(), name: body.name } });
        return reply.status(201).send(team);
    });
    // ------------------------------------------------------------ custom fields
    app.get('/settings/custom-fields', async () => {
        const defs = await prisma.customFieldDef.findMany({
            where: { archivedAt: null },
            orderBy: [{ entityType: 'asc' }, { label: 'asc' }],
        });
        return { data: defs };
    });
    /**
     * New fields are usable on every record of that type immediately — no schema
     * migration, no engineering involvement (FR-DATA-04, FR-ADMIN-03).
     */
    app.post('/settings/custom-fields', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
        const input = createCustomFieldSchema.parse(request.body);
        const def = await prisma.customFieldDef.create({
            data: {
                organizationId: orgId(),
                entityType: input.entityType,
                key: input.key,
                label: input.label,
                type: input.type,
                options: input.options ?? [],
            },
        });
        return reply.status(201).send(def);
    });
    /**
     * Archives rather than drops. Recorded values are retained so exports stay
     * complete and saved reports keep rendering — a deleted field empties a
     * column, it does not error (Epics B and H edge cases).
     */
    app.delete('/settings/custom-fields/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
        const { id } = request.params;
        const def = await prisma.customFieldDef.findFirst({ where: { id } });
        if (!def)
            throw notFound('Custom field');
        await prisma.customFieldDef.update({ where: { id }, data: { archivedAt: new Date() } });
        return reply.status(204).send();
    });
    // -------------------------------------------------------------- integrations
    app.get('/settings/integrations', async () => {
        const connections = await prisma.integrationConnection.findMany({
            orderBy: { createdAt: 'asc' },
        });
        return { data: connections.map(serializeConnection) };
    });
    app.delete('/settings/integrations/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
        const { id } = request.params;
        const connection = await prisma.integrationConnection.findFirst({ where: { id } });
        if (!connection)
            throw notFound('Connection');
        await prisma.integrationConnection.update({
            where: { id },
            data: { status: 'DISCONNECTED', accessToken: null, refreshToken: null },
        });
        return reply.status(204).send();
    });
    // --------------------------------------------------------------- exclusions
    app.get('/settings/exclusions', async () => {
        const rows = await prisma.captureExclusion.findMany({ orderBy: { createdAt: 'desc' } });
        return { data: rows };
    });
    /**
     * Excluding a sender or thread stops future capture entirely: no ingestion,
     * no summarization, and nothing sent to the model (FR-AC-08).
     */
    app.post('/settings/exclusions', async (request, reply) => {
        const input = createExclusionSchema.parse(request.body);
        const value = input.value.toLowerCase();
        // A workspace-wide rule (connectionId null) cannot be addressed by Prisma's
        // compound-unique lookup, so this is a find-then-create rather than an
        // upsert. Re-adding the same rule is a no-op either way.
        const existing = await prisma.captureExclusion.findFirst({
            where: { connectionId: input.connectionId ?? null, kind: input.kind, value },
        });
        const row = existing ??
            (await prisma.captureExclusion.create({
                data: {
                    organizationId: orgId(),
                    connectionId: input.connectionId ?? null,
                    kind: input.kind,
                    value,
                },
            }));
        // Excluding a sender also flags the matching contact, so the UI can show
        // why nothing new is arriving for them.
        if (input.kind === 'SENDER') {
            await prisma.contact.updateMany({ where: { email: value }, data: { excluded: true } });
        }
        return reply.status(201).send(row);
    });
    app.delete('/settings/exclusions/:id', async (request, reply) => {
        const { id } = request.params;
        const row = await prisma.captureExclusion.findFirst({ where: { id } });
        if (!row)
            throw notFound('Exclusion');
        await prisma.captureExclusion.delete({ where: { id } });
        if (row.kind === 'SENDER') {
            await prisma.contact.updateMany({ where: { email: row.value }, data: { excluded: false } });
        }
        return reply.status(204).send();
    });
    // ------------------------------------------------------------- API tokens
    app.get('/settings/api-tokens', { preHandler: requireRole('ADMIN') }, async () => {
        const tokens = await prisma.apiToken.findMany({ orderBy: { createdAt: 'desc' } });
        return {
            data: tokens.map((t) => ({
                id: t.id,
                name: t.name,
                prefix: t.tokenPrefix,
                lastUsedAt: t.lastUsedAt,
                revokedAt: t.revokedAt,
                createdAt: t.createdAt,
            })),
        };
    });
    app.post('/settings/api-tokens', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
        const input = createApiTokenSchema.parse(request.body);
        const { token, prefix, hash } = generateApiToken();
        const record = await prisma.apiToken.create({
            data: { organizationId: orgId(), name: input.name, tokenHash: hash, tokenPrefix: prefix },
        });
        // The plaintext is returned exactly once and never stored.
        return reply
            .status(201)
            .send({ id: record.id, name: record.name, token, prefix, createdAt: record.createdAt });
    });
    app.delete('/settings/api-tokens/:id', { preHandler: requireRole('ADMIN') }, async (request, reply) => {
        const { id } = request.params;
        const record = await prisma.apiToken.findFirst({ where: { id } });
        if (!record)
            throw notFound('API token');
        // Revocation takes effect on the very next request — tokens are resolved
        // from the database on each call, so there is no cache to invalidate.
        await prisma.apiToken.update({ where: { id }, data: { revokedAt: new Date() } });
        return reply.status(204).send();
    });
    // ----------------------------------------------------------------- export
    app.get('/settings/exports', async () => {
        /**
         * A job whose process died mid-run would otherwise sit in RUNNING forever,
         * with the UI cheerfully implying work is still happening. Anything past a
         * generous ceiling is marked failed so the user can simply retry.
         */
        const stallCutoff = new Date(Date.now() - 15 * 60_000);
        await prisma.exportJob.updateMany({
            where: { status: { in: ['QUEUED', 'RUNNING'] }, createdAt: { lt: stallCutoff } },
            data: {
                status: 'FAILED',
                error: 'Export did not finish — the process was interrupted. Please try again.',
                completedAt: new Date(),
            },
        });
        const jobs = await prisma.exportJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
        return { data: jobs };
    });
    /**
     * Available to any member with no plan-tier restriction and no fee — the
     * same transparency principle that governs pricing governs portability.
     */
    app.post('/settings/exports', async (request, reply) => {
        const ctx = request.ctx;
        const job = await prisma.exportJob.create({
            data: { organizationId: orgId(), requestedById: ctx.userId, status: 'QUEUED' },
        });
        // Expected to be low-volume but non-zero — usage of the trust-building
        // portability feature is itself a signal worth watching (§38).
        await track('export_requested', { jobId: job.id });
        // Generated asynchronously so a large workspace does not block the request.
        setImmediate(() => {
            void runWithContext(ctx, () => runExport(job.id)).catch((error) => {
                request.log.error({ err: error, jobId: job.id }, 'Export failed');
            });
        });
        return reply.status(202).send(job);
    });
    app.get('/settings/exports/:id/download', async (request, reply) => {
        const { id } = request.params;
        const job = await prisma.exportJob.findFirst({ where: { id } });
        if (!job)
            throw notFound('Export');
        if (job.status !== 'READY' || !job.filePath) {
            throw badRequest(`Export is ${job.status.toLowerCase()}, not ready to download yet`);
        }
        const manifest = join(job.filePath, 'MANIFEST.md');
        await stat(manifest);
        void forbidden;
        return reply
            .header('Content-Type', 'text/markdown; charset=utf-8')
            .header('Content-Disposition', `attachment; filename="continuum-export-${id}.md"`)
            .send(createReadStream(manifest));
    });
    /** Where the generated files live, so the UI can point the user at them. */
    app.get('/settings/exports/:id', async (request) => {
        const { id } = request.params;
        const job = await prisma.exportJob.findFirst({ where: { id } });
        if (!job)
            throw notFound('Export');
        return job;
    });
};
