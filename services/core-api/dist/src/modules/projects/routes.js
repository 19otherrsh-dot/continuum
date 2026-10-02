import { convertDealSchema, createMilestoneSchema, listQuerySchema, updateMilestoneSchema, updateProjectSchema, } from '@continuum/shared';
import { prisma } from '../../db/client.js';
import { diffFields, recordAudit } from '../../lib/audit.js';
import { badRequest, forbidden, notFound } from '../../lib/errors.js';
import { getCustomFields, purgeAttributes, setCustomFields } from '../common/attributes.js';
import { ownerScopeFilter } from '../common/scope.js';
import { serializeActivity, serializeMilestone, serializeProject } from '../common/serializers.js';
import { convertDealToProject, projectInclude } from './service.js';
/**
 * Guards every project route for Sales-only workspaces. When `showProjectsUi`
 * is false the object is hidden from navigation *and* unreachable via the API,
 * so a sales team never encounters delivery concepts they did not ask for
 * (FR-PROJ-05).
 */
async function assertProjectsEnabled(organizationId) {
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    if (!org.showProjectsUi) {
        throw forbidden('Projects are not enabled for this workspace. Switch the motion to Agency or Hybrid in Settings.');
    }
}
export const projectRoutes = async (app) => {
    app.addHook('preHandler', app.requireAuth);
    app.addHook('preHandler', async (request) => {
        await assertProjectsEnabled(request.ctx.organizationId);
    });
    app.get('/projects', async (request) => {
        const query = listQuerySchema.parse(request.query);
        const scope = await ownerScopeFilter();
        const where = { ...scope };
        if (query.status)
            where.status = query.status;
        if (query.q)
            where.name = { contains: query.q, mode: 'insensitive' };
        const [rows, total] = await Promise.all([
            prisma.project.findMany({
                where,
                include: projectInclude,
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            prisma.project.count({ where }),
        ]);
        const customFields = await getCustomFields('PROJECT', rows.map((r) => r.id));
        return {
            data: rows.map((row) => serializeProject(row, customFields.get(row.id) ?? {})),
            total,
            page: query.page,
            pageSize: query.pageSize,
        };
    });
    app.get('/projects/:id', async (request) => {
        const { id } = request.params;
        const row = await prisma.project.findFirst({ where: { id }, include: projectInclude });
        if (!row)
            throw notFound('Project');
        const customFields = await getCustomFields('PROJECT', [id]);
        return serializeProject(row, customFields.get(id) ?? {});
    });
    /** One-click conversion from a won deal (FR-PROJ-01, Journey 3). */
    app.post('/deals/:id/convert-to-project', async (request, reply) => {
        const { id } = request.params;
        const input = convertDealSchema.parse(request.body ?? {});
        const project = await convertDealToProject(id, {
            name: input.name,
            ownerId: input.ownerId ?? undefined,
        });
        const customFields = await getCustomFields('PROJECT', [project.id]);
        return reply.status(201).send(serializeProject(project, customFields.get(project.id) ?? {}));
    });
    app.patch('/projects/:id', async (request) => {
        const { id } = request.params;
        const input = updateProjectSchema.parse(request.body);
        const before = await prisma.project.findFirst({ where: { id } });
        if (!before)
            throw notFound('Project');
        const data = {};
        if (input.name !== undefined)
            data.name = input.name;
        if (input.ownerId !== undefined)
            data.ownerId = input.ownerId ?? null;
        if (input.status !== undefined) {
            data.status = input.status;
            // Status changes are always human-initiated at V1 — there are no
            // automatic project transitions.
            data.completedAt = input.status === 'COMPLETED' ? new Date() : null;
        }
        if (Object.keys(data).length > 0) {
            await prisma.project.update({ where: { id }, data });
            await recordAudit(diffFields('PROJECT', id, before, data));
        }
        await setCustomFields('PROJECT', id, input.customFields);
        const row = await prisma.project.findFirstOrThrow({ where: { id }, include: projectInclude });
        const customFields = await getCustomFields('PROJECT', [id]);
        return serializeProject(row, customFields.get(id) ?? {});
    });
    /**
     * The delivery timeline. Adding a milestone requires nothing about the
     * client to be re-entered — company and contacts came across with the
     * conversion (FR-PROJ-02, Journey 3 step 4).
     */
    app.post('/projects/:id/milestones', async (request, reply) => {
        const { id } = request.params;
        const input = createMilestoneSchema.parse(request.body);
        const project = await prisma.project.findFirst({ where: { id } });
        if (!project)
            throw notFound('Project');
        const last = await prisma.milestone.findFirst({
            where: { projectId: id },
            orderBy: { order: 'desc' },
        });
        const milestone = await prisma.milestone.create({
            data: {
                projectId: id,
                title: input.title,
                ownerId: input.ownerId ?? null,
                dueDate: input.dueDate ? new Date(input.dueDate) : null,
                order: (last?.order ?? -1) + 1,
            },
        });
        return reply.status(201).send(serializeMilestone(milestone));
    });
    app.patch('/projects/:id/milestones/:milestoneId', async (request) => {
        const { id, milestoneId } = request.params;
        const input = updateMilestoneSchema.parse(request.body);
        const existing = await prisma.milestone.findUnique({ where: { id: milestoneId } });
        if (!existing || existing.projectId !== id)
            throw notFound('Milestone');
        const data = {};
        if (input.title !== undefined)
            data.title = input.title;
        if (input.ownerId !== undefined)
            data.ownerId = input.ownerId ?? null;
        if (input.dueDate !== undefined) {
            data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
        }
        if (input.completed !== undefined) {
            data.completedAt = input.completed ? new Date() : null;
        }
        const milestone = await prisma.milestone.update({ where: { id: milestoneId }, data });
        return serializeMilestone(milestone);
    });
    app.delete('/projects/:id/milestones/:milestoneId', async (request, reply) => {
        const { id, milestoneId } = request.params;
        const existing = await prisma.milestone.findUnique({ where: { id: milestoneId } });
        if (!existing || existing.projectId !== id)
            throw notFound('Milestone');
        await prisma.milestone.delete({ where: { id: milestoneId } });
        return reply.status(204).send();
    });
    /**
     * Project timeline. Includes everything captured before the sale, which is
     * the whole reason Persona B's handoff problem goes away: the conversation
     * that explains *why* the client wants something is still on the record.
     */
    app.get('/projects/:id/activities', async (request) => {
        const { id } = request.params;
        const project = await prisma.project.findFirst({ where: { id } });
        if (!project)
            throw notFound('Project');
        const activities = await prisma.activity.findMany({
            where: { links: { some: { entityType: 'PROJECT', entityId: id } } },
            include: { participants: { include: { contact: true } } },
            orderBy: { occurredAt: 'desc' },
            take: 200,
        });
        return { data: activities.map(serializeActivity) };
    });
    app.post('/projects/:id/contacts', async (request, reply) => {
        const { id } = request.params;
        const body = request.body;
        if (!body?.contactId)
            throw badRequest('contactId is required');
        const project = await prisma.project.findFirst({ where: { id } });
        if (!project)
            throw notFound('Project');
        await prisma.projectContact.upsert({
            where: { projectId_contactId: { projectId: id, contactId: body.contactId } },
            create: { projectId: id, contactId: body.contactId, role: body.role ?? null },
            update: { role: body.role ?? null },
        });
        return reply.status(201).send({ ok: true });
    });
    app.delete('/projects/:id', async (request, reply) => {
        const { id } = request.params;
        const existing = await prisma.project.findFirst({ where: { id } });
        if (!existing)
            throw notFound('Project');
        await purgeAttributes('PROJECT', id);
        await prisma.project.delete({ where: { id } });
        await recordAudit({
            entityType: 'PROJECT',
            entityId: id,
            field: 'deleted',
            priorValue: existing.name,
        });
        return reply.status(204).send();
    });
};
