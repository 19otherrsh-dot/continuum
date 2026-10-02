import bcrypt from 'bcryptjs';
import { prisma } from '../src/db/client.js';
import { runUnscoped, runWithContext } from '../src/db/context.js';
import { encrypt } from '../src/lib/crypto.js';
import { createDefaultPipeline } from '../src/modules/workspace/bootstrap.js';
/**
 * Seeds two workspaces, one per beachhead persona, so both journeys are
 * walkable the moment the app starts:
 *
 *   Northwind Sales  — Persona A. Sales motion, projects hidden. A connected
 *                      simulator mailbox whose fixture inbox drives capture,
 *                      contact proposals, and a stage-change proposal.
 *   Harbor Studio    — Persona B. Agency motion, projects visible, with a won
 *                      deal already sitting there ready to convert.
 */
const SALES_ADMIN = { email: 'alex@continuum.test', password: 'password123', name: 'Alex Rivera' };
const SALES_REP = { email: 'sam@continuum.test', password: 'password123', name: 'Sam Okafor' };
const AGENCY_ADMIN = { email: 'nina@harbor.test', password: 'password123', name: 'Nina Alvarez' };
async function main() {
    console.log('Seeding Continuum...');
    await reset();
    await seedSalesWorkspace();
    await seedAgencyWorkspace();
    console.log(`
Seed complete.

  Sales workspace   ${SALES_ADMIN.email} / ${SALES_ADMIN.password}   (admin)
                    ${SALES_REP.email} / ${SALES_REP.password}   (member)
  Agency workspace  ${AGENCY_ADMIN.email} / ${AGENCY_ADMIN.password}   (admin)

The sales workspace has a connected simulated mailbox. Start the worker
(npm run dev) or POST /api/v1/integrations/sync-now to pull the fixture inbox
and watch capture populate the pipeline.
`);
}
/** Wipes previous seed data so re-running is safe. */
async function reset() {
    await runUnscoped(async () => {
        const orgs = await prisma.organization.findMany({ select: { id: true } });
        for (const org of orgs) {
            await prisma.organization.delete({ where: { id: org.id } });
        }
    });
}
function ctxFor(organizationId, userId, userName) {
    return { organizationId, userId, userName, role: 'ADMIN', actorType: 'SYSTEM' };
}
async function seedSalesWorkspace() {
    const org = await runUnscoped(() => prisma.organization.create({
        data: {
            name: 'Northwind Sales',
            motion: 'SALES',
            // Sales-only: the Project object is hidden from navigation entirely.
            showProjectsUi: false,
            seatCount: 2,
        },
    }));
    await runWithContext(ctxFor(org.id, null, 'Seed'), async () => {
        const passwordHash = await bcrypt.hash(SALES_ADMIN.password, 10);
        const team = await prisma.team.create({
            data: { organizationId: org.id, name: 'Outbound' },
        });
        const admin = await prisma.user.create({
            data: {
                organizationId: org.id,
                email: SALES_ADMIN.email,
                name: SALES_ADMIN.name,
                role: 'ADMIN',
                teamId: team.id,
                passwordHash,
            },
        });
        const rep = await prisma.user.create({
            data: {
                organizationId: org.id,
                email: SALES_REP.email,
                name: SALES_REP.name,
                role: 'MEMBER',
                teamId: team.id,
                passwordHash: await bcrypt.hash(SALES_REP.password, 10),
            },
        });
        const pipeline = await createDefaultPipeline('SALES');
        const stages = pipeline.stages.sort((a, b) => a.order - b.order);
        const qualified = stages.find((s) => s.name === 'Qualified') ?? stages[2];
        const contacted = stages.find((s) => s.name === 'Contacted') ?? stages[1];
        // The company and primary contact the fixture inbox refers to. Capture
        // will attach the email thread to this deal, and the *second* Northwind
        // sender (Marcus) is deliberately absent so the run produces a real
        // new-contact proposal rather than a pre-baked one.
        const northwind = await prisma.company.create({
            data: {
                organizationId: org.id,
                name: 'Northwind Logistics',
                domain: 'northwind-logistics.com',
                website: 'https://northwind-logistics.com',
                source: 'HUMAN',
            },
        });
        const dana = await prisma.contact.create({
            data: {
                organizationId: org.id,
                email: 'dana.whitfield@northwind-logistics.com',
                firstName: 'Dana',
                lastName: 'Whitfield',
                title: 'VP Operations',
                companyId: northwind.id,
                source: 'HUMAN',
            },
        });
        const northwindDeal = await prisma.deal.create({
            data: {
                organizationId: org.id,
                pipelineId: pipeline.id,
                stageId: qualified.id,
                stageSource: 'HUMAN',
                name: 'Northwind Logistics — 40-seat pilot',
                valueCents: 4_800_000,
                ownerId: rep.id,
                companyId: northwind.id,
                expectedCloseDate: new Date(Date.now() + 21 * 86_400_000),
                source: 'HUMAN',
            },
        });
        await prisma.dealContact.create({
            data: { dealId: northwindDeal.id, contactId: dana.id, role: 'decision maker' },
        });
        // A second deal, deliberately left with no recent activity so the stalling
        // sweep has something real to flag.
        const meridian = await prisma.company.create({
            data: {
                organizationId: org.id,
                name: 'Meridian Freight',
                domain: 'meridianfreight.test',
                source: 'HUMAN',
            },
        });
        const priya = await prisma.contact.create({
            data: {
                organizationId: org.id,
                email: 'p.raman@meridianfreight.test',
                firstName: 'Priya',
                lastName: 'Raman',
                title: 'Head of Procurement',
                companyId: meridian.id,
                source: 'HUMAN',
            },
        });
        const stale = await prisma.deal.create({
            data: {
                organizationId: org.id,
                pipelineId: pipeline.id,
                stageId: contacted.id,
                stageSource: 'HUMAN',
                name: 'Meridian Freight — regional rollout',
                valueCents: 12_000_000,
                ownerId: rep.id,
                companyId: meridian.id,
                source: 'HUMAN',
                lastActivityAt: new Date(Date.now() - 18 * 86_400_000),
                createdAt: new Date(Date.now() - 30 * 86_400_000),
            },
        });
        await prisma.dealContact.create({
            data: { dealId: stale.id, contactId: priya.id, role: 'champion' },
        });
        // Contact with a phone number so the native dialler is exercisable.
        await prisma.contact.update({
            where: { id: dana.id },
            data: { phone: '+14155550142' },
        });
        // A connected simulated mailbox, due for its first poll immediately.
        await prisma.integrationConnection.create({
            data: {
                organizationId: org.id,
                userId: admin.id,
                provider: 'GOOGLE',
                status: 'CONNECTED',
                accountEmail: 'you@continuum.test',
                accessToken: encrypt('simulator-access-token'),
                refreshToken: encrypt('simulator-refresh-token'),
                expiresAt: new Date(Date.now() + 3600_000),
                nextPollAt: new Date(),
            },
        });
        await prisma.customFieldDef.create({
            data: {
                organizationId: org.id,
                entityType: 'DEAL',
                key: 'procurement_route',
                label: 'Procurement route',
                type: 'SELECT',
                options: ['Direct', 'Reseller', 'Marketplace'],
            },
        });
        console.log(`  Northwind Sales — ${stages.length} stages, 2 deals, simulated mailbox connected`);
    });
}
async function seedAgencyWorkspace() {
    const org = await runUnscoped(() => prisma.organization.create({
        data: {
            name: 'Harbor Studio',
            motion: 'AGENCY',
            // Agency motion: the delivery side of the relationship is visible.
            showProjectsUi: true,
            seatCount: 1,
        },
    }));
    await runWithContext(ctxFor(org.id, null, 'Seed'), async () => {
        const admin = await prisma.user.create({
            data: {
                organizationId: org.id,
                email: AGENCY_ADMIN.email,
                name: AGENCY_ADMIN.name,
                role: 'ADMIN',
                passwordHash: await bcrypt.hash(AGENCY_ADMIN.password, 10),
            },
        });
        const pipeline = await createDefaultPipeline('AGENCY');
        const stages = pipeline.stages.sort((a, b) => a.order - b.order);
        const wonStage = stages.find((s) => s.isWonStage);
        const scoping = stages.find((s) => s.name === 'Scoping') ?? stages[2];
        const client = await prisma.company.create({
            data: {
                organizationId: org.id,
                name: 'Lumen Partners',
                domain: 'lumenpartners.test',
                source: 'HUMAN',
            },
        });
        const contact = await prisma.contact.create({
            data: {
                organizationId: org.id,
                email: 'tomas@lumenpartners.test',
                firstName: 'Tomas',
                lastName: 'Lind',
                title: 'Marketing Director',
                companyId: client.id,
                source: 'HUMAN',
            },
        });
        /**
         * A won deal with real conversation history behind it. Converting this is
         * Journey 3 — the point being that the sales thread explaining *why* the
         * client wants what they want survives the handoff.
         */
        const wonDeal = await prisma.deal.create({
            data: {
                organizationId: org.id,
                pipelineId: pipeline.id,
                stageId: wonStage.id,
                stageSource: 'HUMAN',
                name: 'Lumen Partners — brand refresh',
                valueCents: 7_500_000,
                ownerId: admin.id,
                companyId: client.id,
                status: 'WON',
                closedAt: new Date(Date.now() - 2 * 86_400_000),
                source: 'HUMAN',
                lastActivityAt: new Date(Date.now() - 2 * 86_400_000),
            },
        });
        await prisma.dealContact.create({
            data: { dealId: wonDeal.id, contactId: contact.id, role: 'decision maker' },
        });
        const history = [
            {
                subject: 'Brand refresh — first thoughts',
                body: 'We want the refresh to land before the funding announcement in March. The current identity reads as a 2019 startup and we are talking to institutional investors now.',
                summary: 'Lumen wants the brand refresh completed before a March funding announcement. Their current identity no longer suits the institutional investors they are now speaking to.',
                sentiment: 'POSITIVE',
                nextStep: 'Share a scope and indicative timeline',
                daysAgo: 24,
            },
            {
                subject: 'Re: Brand refresh — scope',
                body: 'The scope looks right. One thing: our head of product wants the design system usable by engineers directly, not just a PDF. Can you include tokens and a component library?',
                summary: 'Scope approved with one addition: the design system must be engineer-consumable, with design tokens and a component library rather than a static PDF.',
                sentiment: 'POSITIVE',
                nextStep: 'Add tokens and component library to the scope and re-send',
                daysAgo: 12,
            },
            {
                subject: 'Re: Brand refresh — signed',
                body: 'Signed and returned this morning. Looking forward to getting started. Kickoff week of the 14th works our end.',
                summary: 'Lumen signed the agreement and confirmed kickoff for the week of the 14th.',
                sentiment: 'POSITIVE',
                nextStep: 'Schedule kickoff for the week of the 14th',
                daysAgo: 2,
            },
        ];
        for (const entry of history) {
            await prisma.activity.create({
                data: {
                    organizationId: org.id,
                    type: 'EMAIL',
                    direction: 'INBOUND',
                    subject: entry.subject,
                    body: entry.body,
                    occurredAt: new Date(Date.now() - entry.daysAgo * 86_400_000),
                    source: 'AGENT_INFERRED',
                    aiSummary: entry.summary,
                    sentiment: entry.sentiment,
                    nextStep: entry.nextStep,
                    summaryStatus: 'DONE',
                    participants: { create: [{ contactId: contact.id }] },
                    links: {
                        create: [
                            { entityType: 'DEAL', entityId: wonDeal.id, isPrimary: true },
                            { entityType: 'COMPANY', entityId: client.id, isPrimary: false },
                            { entityType: 'CONTACT', entityId: contact.id, isPrimary: false },
                        ],
                    },
                },
            });
        }
        // A second, still-open deal so the agency pipeline is not just one card.
        const harbor = await prisma.company.create({
            data: {
                organizationId: org.id,
                name: 'Harbor Creative',
                domain: 'harborcreative.test',
                source: 'HUMAN',
            },
        });
        await prisma.deal.create({
            data: {
                organizationId: org.id,
                pipelineId: pipeline.id,
                stageId: scoping.id,
                stageSource: 'HUMAN',
                name: 'Harbor Creative — website rebuild',
                valueCents: 6_000_000,
                ownerId: admin.id,
                companyId: harbor.id,
                source: 'HUMAN',
                lastActivityAt: new Date(Date.now() - 3 * 86_400_000),
            },
        });
        console.log('  Harbor Studio — agency motion, 1 won deal ready to convert, 3 captured emails');
    });
}
main()
    .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
})
    .finally(() => {
    void prisma.$disconnect?.();
});
