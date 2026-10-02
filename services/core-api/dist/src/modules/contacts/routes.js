import { createContactSchema, listQuerySchema, updateContactSchema, } from '@continuum/shared';
import { prisma } from '../../db/client.js';
import { orgId } from '../../db/context.js';
import { diffFields, recordAudit } from '../../lib/audit.js';
import { isBusinessDomain, parseAddress } from '../../lib/email.js';
import { notFound } from '../../lib/errors.js';
import { getCustomFields, getTags, purgeAttributes, setCustomFields, setTags, } from '../common/attributes.js';
import { serializeContact } from '../common/serializers.js';
const companySelect = { select: { id: true, name: true, domain: true } };
/**
 * Attaches a contact to the company that owns its email domain, creating the
 * company if it does not exist yet (FR-DATA-03). Consumer mailboxes are left
 * unlinked — a personal address is a person, not an account.
 */
export async function autoLinkCompany(email) {
    const parsed = parseAddress(email);
    if (!parsed || !isBusinessDomain(parsed.domain))
        return null;
    const existing = await prisma.company.findFirst({ where: { domain: parsed.domain } });
    return existing?.id ?? null;
}
export const contactRoutes = async (app) => {
    app.addHook('preHandler', app.requireAuth);
    app.get('/contacts', async (request) => {
        const query = listQuerySchema.parse(request.query);
        const where = {};
        if (query.q) {
            where.OR = [
                { email: { contains: query.q, mode: 'insensitive' } },
                { firstName: { contains: query.q, mode: 'insensitive' } },
                { lastName: { contains: query.q, mode: 'insensitive' } },
                { title: { contains: query.q, mode: 'insensitive' } },
            ];
        }
        if (query.tag) {
            const tagged = await prisma.tagging.findMany({
                where: { entityType: 'CONTACT', tag: { name: query.tag } },
                select: { entityId: true },
            });
            where.id = { in: tagged.map((t) => t.entityId) };
        }
        const [rows, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                include: { company: companySelect },
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
            prisma.contact.count({ where }),
        ]);
        const ids = rows.map((r) => r.id);
        const [tags, customFields] = await Promise.all([
            getTags('CONTACT', ids),
            getCustomFields('CONTACT', ids),
        ]);
        return {
            data: rows.map((row) => serializeContact(row, tags.get(row.id) ?? [], customFields.get(row.id) ?? {})),
            total,
            page: query.page,
            pageSize: query.pageSize,
        };
    });
    app.get('/contacts/:id', async (request) => {
        const { id } = request.params;
        const row = await prisma.contact.findFirst({
            where: { id },
            include: { company: companySelect },
        });
        if (!row)
            throw notFound('Contact');
        const [tags, customFields] = await Promise.all([
            getTags('CONTACT', [id]),
            getCustomFields('CONTACT', [id]),
        ]);
        return serializeContact(row, tags.get(id) ?? [], customFields.get(id) ?? {});
    });
    app.post('/contacts', async (request, reply) => {
        const input = createContactSchema.parse(request.body);
        const email = input.email.toLowerCase();
        const companyId = input.companyId ?? (await autoLinkCompany(email));
        const row = await prisma.contact.create({
            data: {
                organizationId: orgId(),
                email,
                firstName: input.firstName ?? null,
                lastName: input.lastName ?? null,
                phone: input.phone ?? null,
                title: input.title ?? null,
                companyId,
                source: 'HUMAN',
            },
            include: { company: companySelect },
        });
        await setTags('CONTACT', row.id, input.tags);
        await setCustomFields('CONTACT', row.id, input.customFields);
        await recordAudit({
            entityType: 'CONTACT',
            entityId: row.id,
            field: 'created',
            newValue: email,
        });
        return reply
            .status(201)
            .send(serializeContact(row, input.tags ?? [], input.customFields ?? {}));
    });
    app.patch('/contacts/:id', async (request) => {
        const { id } = request.params;
        const input = updateContactSchema.parse(request.body);
        const before = await prisma.contact.findFirst({ where: { id } });
        if (!before)
            throw notFound('Contact');
        const data = {};
        if (input.email !== undefined)
            data.email = input.email.toLowerCase();
        if (input.firstName !== undefined)
            data.firstName = input.firstName ?? null;
        if (input.lastName !== undefined)
            data.lastName = input.lastName ?? null;
        if (input.phone !== undefined)
            data.phone = input.phone ?? null;
        if (input.title !== undefined)
            data.title = input.title ?? null;
        if (input.companyId !== undefined)
            data.companyId = input.companyId ?? null;
        if (Object.keys(data).length > 0)
            data.source = 'HUMAN';
        const row = Object.keys(data).length > 0
            ? await prisma.contact.update({
                where: { id },
                data,
                include: { company: companySelect },
            })
            : await prisma.contact.findFirstOrThrow({
                where: { id },
                include: { company: companySelect },
            });
        await setTags('CONTACT', id, input.tags);
        await setCustomFields('CONTACT', id, input.customFields);
        await recordAudit(diffFields('CONTACT', id, before, data));
        const [tags, customFields] = await Promise.all([
            getTags('CONTACT', [id]),
            getCustomFields('CONTACT', [id]),
        ]);
        return serializeContact(row, tags.get(id) ?? [], customFields.get(id) ?? {});
    });
    app.delete('/contacts/:id', async (request, reply) => {
        const { id } = request.params;
        const existing = await prisma.contact.findFirst({ where: { id } });
        if (!existing)
            throw notFound('Contact');
        await purgeAttributes('CONTACT', id);
        await prisma.contact.delete({ where: { id } });
        await recordAudit({
            entityType: 'CONTACT',
            entityId: id,
            field: 'deleted',
            priorValue: existing.email,
        });
        return reply.status(204).send();
    });
    /** Unified timeline for a contact (FR-AC-05). */
    app.get('/contacts/:id/activities', async (request) => {
        const { id } = request.params;
        const activities = await prisma.activity.findMany({
            where: {
                OR: [
                    { participants: { some: { contactId: id } } },
                    { links: { some: { entityType: 'CONTACT', entityId: id } } },
                ],
            },
            include: { participants: { include: { contact: true } } },
            orderBy: { occurredAt: 'desc' },
            take: 200,
        });
        const { serializeActivity } = await import('../common/serializers.js');
        return { data: activities.map(serializeActivity) };
    });
};
