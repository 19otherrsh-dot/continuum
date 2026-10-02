import { addDealContactSchema, createDealSchema, listQuerySchema, moveDealStageSchema, updateDealSchema, } from '@continuum/shared';
import { prisma } from '../../db/client.js';
import { orgId } from '../../db/context.js';
import { diffFields, recordAudit } from '../../lib/audit.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { getCustomFields, getTags, purgeAttributes, setCustomFields, setTags, } from '../common/attributes.js';
import { canAccessOwner, ownerScopeFilter } from '../common/scope.js';
import { serializeActivity, serializeDeal } from '../common/serializers.js';
import { defaultPipeline, firstStageId } from '../workspace/bootstrap.js';
import { dealInclude, linkContactToDeal, moveDealToStage } from './service.js';
export const dealRoutes = async (app) => {
    app.addHook('preHandler', app.requireAuth);
    app.get('/deals', async (request) => {
        const query = listQuerySchema.parse(request.query);
        // Managers see their whole team's pipeline, not only their own (FR-PERM-03).
        const scope = await ownerScopeFilter();
        const where = { ...scope };
        if (query.q)
            where.name = { contains: query.q, mode: 'insensitive' };
        if (query.stageId)
            where.stageId = query.stageId;
        if (query.pipelineId)
            where.pipelineId = query.pipelineId;
        if (query.status)
            where.status = query.status;
        if (query.ownerId)
            where.ownerId = query.ownerId;
        if (query.tag) {
            const tagged = await prisma.tagging.findMany({
                where: { entityType: 'DEAL', tag: { name: query.tag } },
                select: { entityId: true },
            });
            where.id = { in: tagged.map((t) => t.entityId) };
        }
        const [rows, total] = await Promise.all([
            prisma.deal.findMany({
                where,
                include: dealInclude,
                orderBy: { updatedAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            prisma.deal.count({ where }),
        ]);
        const ids = rows.map((r) => r.id);
        const [tags, customFields] = await Promise.all([
            getTags('DEAL', ids),
            getCustomFields('DEAL', ids),
        ]);
        return {
            data: rows.map((row) => serializeDeal(row, tags.get(row.id) ?? [], customFields.get(row.id) ?? {})),
            total,
            page: query.page,
            pageSize: query.pageSize,
        };
    });
    app.get('/deals/:id', async (request) => {
        const { id } = request.params;
        const row = await prisma.deal.findFirst({ where: { id }, include: dealInclude });
        if (!row)
            throw notFound('Deal');
        if (!(await canAccessOwner(row.ownerId)))
            throw forbidden();
        const [tags, customFields] = await Promise.all([
            getTags('DEAL', [id]),
            getCustomFields('DEAL', [id]),
        ]);
        return serializeDeal(row, tags.get(id) ?? [], customFields.get(id) ?? {});
    });
    app.post('/deals', async (request, reply) => {
        const input = createDealSchema.parse(request.body);
        const ctx = request.ctx;
        const organization = await prisma.organization.findUniqueOrThrow({
            where: { id: ctx.organizationId },
        });
        const pipelineId = input.pipelineId ?? (await defaultPipeline(organization.motion)).id;
        const stageId = input.stageId ?? (await firstStageId(pipelineId));
        const row = await prisma.deal.create({
            data: {
                organizationId: orgId(),
                name: input.name,
                pipelineId,
                stageId,
                stageSource: 'HUMAN',
                valueCents: input.valueCents ?? null,
                currency: input.currency ?? 'USD',
                ownerId: input.ownerId ?? ctx.userId,
                companyId: input.companyId ?? null,
                expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
                source: 'HUMAN',
            },
            include: dealInclude,
        });
        for (const contactId of input.contactIds ?? []) {
            await linkContactToDeal(row.id, contactId, null);
        }
        await setTags('DEAL', row.id, input.tags);
        await setCustomFields('DEAL', row.id, input.customFields);
        await recordAudit({
            entityType: 'DEAL',
            entityId: row.id,
            field: 'created',
            newValue: row.name,
        });
        const fresh = await prisma.deal.findFirstOrThrow({
            where: { id: row.id },
            include: dealInclude,
        });
        return reply.status(201).send(serializeDeal(fresh, input.tags ?? [], input.customFields ?? {}));
    });
    app.patch('/deals/:id', async (request) => {
        const { id } = request.params;
        const input = updateDealSchema.parse(request.body);
        const before = await prisma.deal.findFirst({ where: { id } });
        if (!before)
            throw notFound('Deal');
        if (!(await canAccessOwner(before.ownerId)))
            throw forbidden();
        const data = {};
        if (input.name !== undefined)
            data.name = input.name;
        if (input.valueCents !== undefined)
            data.valueCents = input.valueCents ?? null;
        if (input.currency !== undefined)
            data.currency = input.currency;
        if (input.ownerId !== undefined)
            data.ownerId = input.ownerId ?? null;
        if (input.companyId !== undefined)
            data.companyId = input.companyId ?? null;
        if (input.expectedCloseDate !== undefined) {
            data.expectedCloseDate = input.expectedCloseDate
                ? new Date(input.expectedCloseDate)
                : null;
        }
        if (input.pipelineId !== undefined && input.pipelineId !== before.pipelineId) {
            data.pipelineId = input.pipelineId;
            data.stageId = await firstStageId(input.pipelineId);
            data.stageSource = 'HUMAN';
        }
        if (Object.keys(data).length > 0) {
            await prisma.deal.update({ where: { id }, data });
            await recordAudit(diffFields('DEAL', id, before, data));
        }
        // Stage changes route through moveDealToStage so status, closedAt and the
        // reopen-review flag stay consistent no matter which endpoint was used.
        if (input.stageId && input.stageId !== before.stageId) {
            await moveDealToStage(id, input.stageId, 'HUMAN');
        }
        await setTags('DEAL', id, input.tags);
        await setCustomFields('DEAL', id, input.customFields);
        const row = await prisma.deal.findFirstOrThrow({ where: { id }, include: dealInclude });
        const [tags, customFields] = await Promise.all([
            getTags('DEAL', [id]),
            getCustomFields('DEAL', [id]),
        ]);
        return serializeDeal(row, tags.get(id) ?? [], customFields.get(id) ?? {});
    });
    /**
     * Dragging a card on the Kanban board. Separate from PATCH so the source is
     * unambiguously HUMAN and cannot be set by accident (FR-PIPE-01).
     */
    app.post('/deals/:id/stage', async (request) => {
        const { id } = request.params;
        const { stageId } = moveDealStageSchema.parse(request.body);
        const deal = await prisma.deal.findFirst({ where: { id } });
        if (!deal)
            throw notFound('Deal');
        if (!(await canAccessOwner(deal.ownerId)))
            throw forbidden();
        const stage = await prisma.stage.findUnique({ where: { id: stageId } });
        if (!stage || stage.pipelineId !== deal.pipelineId) {
            throw badRequest('That stage does not belong to this deal\'s pipeline');
        }
        await moveDealToStage(id, stageId, 'HUMAN');
        const row = await prisma.deal.findFirstOrThrow({ where: { id }, include: dealInclude });
        const [tags, customFields] = await Promise.all([
            getTags('DEAL', [id]),
            getCustomFields('DEAL', [id]),
        ]);
        return serializeDeal(row, tags.get(id) ?? [], customFields.get(id) ?? {});
    });
    app.post('/deals/:id/contacts', async (request, reply) => {
        const { id } = request.params;
        const input = addDealContactSchema.parse(request.body);
        const deal = await prisma.deal.findFirst({ where: { id } });
        if (!deal)
            throw notFound('Deal');
        const contact = await prisma.contact.findFirst({ where: { id: input.contactId } });
        if (!contact)
            throw notFound('Contact');
        await linkContactToDeal(id, input.contactId, input.role ?? null);
        return reply.status(201).send({ ok: true });
    });
    app.delete('/deals/:id/contacts/:contactId', async (request, reply) => {
        const { id, contactId } = request.params;
        const deal = await prisma.deal.findFirst({ where: { id } });
        if (!deal)
            throw notFound('Deal');
        await prisma.dealContact.deleteMany({ where: { dealId: id, contactId } });
        return reply.status(204).send();
    });
    /**
     * The unified chronological timeline: emails, calls, meetings and manual
     * notes together on one record (FR-AC-05).
     */
    app.get('/deals/:id/activities', async (request) => {
        const { id } = request.params;
        const deal = await prisma.deal.findFirst({ where: { id } });
        if (!deal)
            throw notFound('Deal');
        const activities = await prisma.activity.findMany({
            where: { links: { some: { entityType: 'DEAL', entityId: id } } },
            include: { participants: { include: { contact: true } } },
            orderBy: { occurredAt: 'desc' },
            take: 200,
        });
        return { data: activities.map(serializeActivity) };
    });
    app.delete('/deals/:id', async (request, reply) => {
        const { id } = request.params;
        const existing = await prisma.deal.findFirst({ where: { id } });
        if (!existing)
            throw notFound('Deal');
        if (!(await canAccessOwner(existing.ownerId)))
            throw forbidden();
        await purgeAttributes('DEAL', id);
        await prisma.deal.delete({ where: { id } });
        await recordAudit({
            entityType: 'DEAL',
            entityId: id,
            field: 'deleted',
            priorValue: existing.name,
        });
        return reply.status(204).send();
    });
};
