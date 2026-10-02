import { prisma } from '../../db/client.js';
import { displayName } from '../../lib/email.js';
/**
 * Global search across every record type (FR-SEARCH-01).
 *
 * Activity summaries are searched too, so a term that only ever appeared in
 * the body of a captured email still surfaces the deal it belongs to — the
 * thing a rep actually remembers is what was *said*, not which structured
 * field it landed in (FR-SEARCH-02).
 */
export const searchRoutes = async (app) => {
    app.addHook('preHandler', app.requireAuth);
    app.get('/search', async (request) => {
        const { q, limit } = request.query;
        const query = (q ?? '').trim();
        if (query.length < 2)
            return { data: [] };
        const take = Math.min(Number.parseInt(limit ?? '20', 10) || 20, 50);
        const contains = { contains: query, mode: 'insensitive' };
        const org = await prisma.organization.findUniqueOrThrow({
            where: { id: request.ctx.organizationId },
        });
        const [contacts, companies, deals, projects, activities] = await Promise.all([
            prisma.contact.findMany({
                where: {
                    OR: [
                        { email: contains },
                        { firstName: contains },
                        { lastName: contains },
                        { title: contains },
                    ],
                },
                include: { company: { select: { name: true } } },
                take,
            }),
            prisma.company.findMany({
                where: { OR: [{ name: contains }, { domain: contains }] },
                take,
            }),
            prisma.deal.findMany({
                where: { name: contains },
                include: { company: { select: { name: true } }, stage: { select: { name: true } } },
                take,
            }),
            org.showProjectsUi
                ? prisma.project.findMany({
                    where: { name: contains },
                    include: { company: { select: { name: true } } },
                    take,
                })
                : Promise.resolve([]),
            prisma.activity.findMany({
                where: {
                    OR: [{ subject: contains }, { aiSummary: contains }, { body: contains }],
                },
                include: { links: true },
                orderBy: { occurredAt: 'desc' },
                take,
            }),
        ]);
        const results = [];
        // Exact-ish matches on a record's own name rank above a mention buried in
        // a message body.
        for (const contact of contacts) {
            const name = displayName(contact.firstName, contact.lastName, contact.email);
            results.push({
                entityType: 'CONTACT',
                id: contact.id,
                title: name,
                subtitle: [contact.title, contact.company?.name, contact.email]
                    .filter(Boolean)
                    .join(' · '),
                score: rank(query, name) + 0.2,
            });
        }
        for (const company of companies) {
            results.push({
                entityType: 'COMPANY',
                id: company.id,
                title: company.name,
                subtitle: company.domain,
                score: rank(query, company.name) + 0.2,
            });
        }
        for (const deal of deals) {
            results.push({
                entityType: 'DEAL',
                id: deal.id,
                title: deal.name,
                subtitle: [deal.company?.name, deal.stage.name].filter(Boolean).join(' · '),
                score: rank(query, deal.name) + 0.3,
            });
        }
        for (const project of projects) {
            results.push({
                entityType: 'PROJECT',
                id: project.id,
                title: project.name,
                subtitle: project.company?.name ?? null,
                score: rank(query, project.name) + 0.25,
            });
        }
        // An activity match resolves to the record it belongs to, deduped so one
        // busy thread does not crowd out everything else.
        const seen = new Set(results.map((r) => `${r.entityType}:${r.id}`));
        for (const activity of activities) {
            const link = activity.links.find((l) => l.entityType === 'DEAL') ??
                activity.links.find((l) => l.entityType === 'PROJECT') ??
                activity.links.find((l) => l.entityType === 'COMPANY') ??
                activity.links.find((l) => l.entityType === 'CONTACT');
            if (!link)
                continue;
            const key = `${link.entityType}:${link.entityId}`;
            if (seen.has(key))
                continue;
            seen.add(key);
            const title = await titleFor(link.entityType, link.entityId);
            if (!title)
                continue;
            results.push({
                entityType: link.entityType,
                id: link.entityId,
                title,
                subtitle: `Mentioned in: ${activity.subject ?? activity.aiSummary?.slice(0, 80) ?? 'activity'}`,
                score: rank(query, activity.subject ?? ''),
            });
        }
        return {
            data: results.sort((a, b) => b.score - a.score).slice(0, take),
        };
    });
};
function rank(query, candidate) {
    const q = query.toLowerCase();
    const c = (candidate ?? '').toLowerCase();
    if (c === q)
        return 1;
    if (c.startsWith(q))
        return 0.85;
    if (c.includes(q))
        return 0.6;
    return 0.4;
}
async function titleFor(entityType, entityId) {
    switch (entityType) {
        case 'DEAL': {
            const deal = await prisma.deal.findFirst({ where: { id: entityId } });
            return deal?.name ?? null;
        }
        case 'PROJECT': {
            const project = await prisma.project.findFirst({ where: { id: entityId } });
            return project?.name ?? null;
        }
        case 'COMPANY': {
            const company = await prisma.company.findFirst({ where: { id: entityId } });
            return company?.name ?? null;
        }
        case 'CONTACT': {
            const contact = await prisma.contact.findFirst({ where: { id: entityId } });
            return contact ? displayName(contact.firstName, contact.lastName, contact.email) : null;
        }
        default:
            return null;
    }
}
