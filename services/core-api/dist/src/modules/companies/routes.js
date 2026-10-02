import { createCompanySchema, listQuerySchema, updateCompanySchema, } from '@continuum/shared';
import { prisma } from '../../db/client.js';
import { orgId } from '../../db/context.js';
import { diffFields, recordAudit } from '../../lib/audit.js';
import { notFound } from '../../lib/errors.js';
import { getCustomFields, getTags, purgeAttributes, setCustomFields, setTags, } from '../common/attributes.js';
import { serializeCompany } from '../common/serializers.js';
export const companyRoutes = async (app) => {
    app.addHook('preHandler', app.requireAuth);
    app.get('/companies', async (request) => {
        const query = listQuerySchema.parse(request.query);
        const where = {};
        if (query.q) {
            where.OR = [
                { name: { contains: query.q, mode: 'insensitive' } },
                { domain: { contains: query.q, mode: 'insensitive' } },
            ];
        }
        if (query.tag) {
            const tagged = await prisma.tagging.findMany({
                where: { entityType: 'COMPANY', tag: { name: query.tag } },
                select: { entityId: true },
            });
            where.id = { in: tagged.map((t) => t.entityId) };
        }
        const [rows, total] = await Promise.all([
            prisma.company.findMany({
                where,
                orderBy: { name: 'asc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            prisma.company.count({ where }),
        ]);
        const ids = rows.map((r) => r.id);
        const [tags, customFields] = await Promise.all([
            getTags('COMPANY', ids),
            getCustomFields('COMPANY', ids),
        ]);
        return {
            data: rows.map((row) => serializeCompany(row, tags.get(row.id) ?? [], customFields.get(row.id) ?? {})),
            total,
            page: query.page,
            pageSize: query.pageSize,
        };
    });
    app.get('/companies/:id', async (request) => {
        const { id } = request.params;
        const row = await prisma.company.findFirst({ where: { id } });
        if (!row)
            throw notFound('Company');
        const [tags, customFields] = await Promise.all([
            getTags('COMPANY', [id]),
            getCustomFields('COMPANY', [id]),
        ]);
        return serializeCompany(row, tags.get(id) ?? [], customFields.get(id) ?? {});
    });
    app.post('/companies', async (request, reply) => {
        const input = createCompanySchema.parse(request.body);
        const row = await prisma.company.create({
            data: {
                organizationId: orgId(),
                name: input.name,
                domain: input.domain?.toLowerCase() ?? null,
                website: input.website ?? null,
                source: 'HUMAN',
            },
        });
        await setTags('COMPANY', row.id, input.tags);
        await setCustomFields('COMPANY', row.id, input.customFields);
        await recordAudit({
            entityType: 'COMPANY',
            entityId: row.id,
            field: 'created',
            newValue: row.name,
        });
        return reply.status(201).send(serializeCompany(row, input.tags ?? [], input.customFields ?? {}));
    });
    app.patch('/companies/:id', async (request) => {
        const { id } = request.params;
        const input = updateCompanySchema.parse(request.body);
        const before = await prisma.company.findFirst({ where: { id } });
        if (!before)
            throw notFound('Company');
        const data = {};
        if (input.name !== undefined)
            data.name = input.name;
        if (input.domain !== undefined)
            data.domain = input.domain?.toLowerCase() ?? null;
        if (input.website !== undefined)
            data.website = input.website ?? null;
        // Any human edit reclaims the field: once a person has touched a record it
        // is no longer presented as agent-inferred.
        if (Object.keys(data).length > 0)
            data.source = 'HUMAN';
        const row = Object.keys(data).length > 0
            ? await prisma.company.update({ where: { id }, data })
            : before;
        await setTags('COMPANY', id, input.tags);
        await setCustomFields('COMPANY', id, input.customFields);
        await recordAudit(diffFields('COMPANY', id, before, data));
        const [tags, customFields] = await Promise.all([
            getTags('COMPANY', [id]),
            getCustomFields('COMPANY', [id]),
        ]);
        return serializeCompany(row, tags.get(id) ?? [], customFields.get(id) ?? {});
    });
    app.delete('/companies/:id', async (request, reply) => {
        const { id } = request.params;
        const existing = await prisma.company.findFirst({ where: { id } });
        if (!existing)
            throw notFound('Company');
        await purgeAttributes('COMPANY', id);
        await prisma.company.delete({ where: { id } });
        await recordAudit({
            entityType: 'COMPANY',
            entityId: id,
            field: 'deleted',
            priorValue: existing.name,
        });
        return reply.status(204).send();
    });
};
