import { track } from '../../analytics/events.js';
import { prisma } from '../../db/client.js';
import { orgId } from '../../db/context.js';
import { recordAudit } from '../../lib/audit.js';
import { conflict, notFound } from '../../lib/errors.js';
export const projectInclude = {
    company: { select: { id: true, name: true, domain: true } },
    milestones: { orderBy: { order: 'asc' } },
    contacts: { include: { contact: true } },
};
/**
 * One-click deal → project conversion (FR-PROJ-01).
 *
 * The whole point is that nothing is re-entered and nothing is re-linked. The
 * Project inherits the company, every stakeholder contact, and — critically —
 * the entire captured activity history, by re-pointing the existing
 * ActivityLink rows rather than copying anything.
 *
 * Because links are rows, capture continues seamlessly: an email from the
 * client next week lands on the Project's timeline through the ordinary
 * matching path, with no special case (FR-PROJ-03).
 *
 * Runs as a single transaction so a partial conversion is impossible.
 */
export async function convertDealToProject(dealId, options = {}) {
    const deal = await prisma.deal.findFirst({
        where: { id: dealId },
        include: { contacts: true, project: { select: { id: true, name: true } } },
    });
    if (!deal)
        throw notFound('Deal');
    // Rejected with a pointer to what already exists, rather than silently
    // creating a second project (FR-PROJ-06). The unique constraint on
    // Project.originatingDealId backstops this at the database layer.
    if (deal.project) {
        throw conflict(`This deal was already converted to project "${deal.project.name}".`, { projectId: deal.project.id });
    }
    if (deal.status !== 'WON') {
        throw conflict('Only won deals can be converted to a project.');
    }
    const organizationId = orgId();
    const project = await prisma.$transaction(async (tx) => {
        const created = await tx.project.create({
            data: {
                organizationId,
                name: options.name ?? deal.name,
                status: 'ACTIVE',
                companyId: deal.companyId,
                ownerId: options.ownerId ?? deal.ownerId,
                originatingDealId: deal.id,
                startedAt: new Date(),
            },
        });
        if (deal.contacts.length > 0) {
            await tx.projectContact.createMany({
                data: deal.contacts.map((dc) => ({
                    projectId: created.id,
                    contactId: dc.contactId,
                    role: dc.role,
                })),
                skipDuplicates: true,
            });
        }
        // Carry the full history across. `skipDuplicates` keeps this idempotent if
        // an activity was already linked to the project by another path.
        const dealLinks = await tx.activityLink.findMany({
            where: { entityType: 'DEAL', entityId: deal.id },
        });
        if (dealLinks.length > 0) {
            await tx.activityLink.createMany({
                data: dealLinks.map((link) => ({
                    activityId: link.activityId,
                    entityType: 'PROJECT',
                    entityId: created.id,
                    isPrimary: link.isPrimary,
                })),
                skipDuplicates: true,
            });
        }
        return created;
    });
    // Adoption of Persona B's core workflow, and how long the handoff took (§38).
    await track('deal_converted_to_project', {
        dealId: deal.id,
        projectId: project.id,
        activitiesCarriedOver: await prisma.activityLink.count({
            where: { entityType: 'PROJECT', entityId: project.id },
        }),
        hoursSinceWon: deal.closedAt
            ? Math.round((Date.now() - deal.closedAt.getTime()) / 3_600_000)
            : null,
    });
    await recordAudit({
        entityType: 'PROJECT',
        entityId: project.id,
        field: 'convertedFromDeal',
        priorValue: deal.name,
        newValue: project.name,
    });
    return prisma.project.findFirstOrThrow({
        where: { id: project.id },
        include: projectInclude,
    });
}
