import { prisma } from '../../db/client.js';
import { badRequest } from '../../lib/errors.js';
import { displayName } from '../../lib/email.js';
import { agentActionInclude, recordProposals } from '../agent-actions/service.js';
import { serializeAgentAction } from '../common/serializers.js';
/**
 * Model Context Protocol interface (FR-API-02).
 *
 * The important property is what the write tools do — or rather, what they
 * refuse to do. An external agent connected over MCP cannot mutate a record.
 * Every write tool creates a *pending Agent Action* and returns its id, which
 * means third-party agents pass through exactly the same human confirmation
 * gate as Continuum's own agent.
 *
 * That is a deliberate constraint, not an oversight. The trust guarantee is
 * worth nothing if it can be bypassed by pointing a different model at the
 * API.
 */
const TOOLS = [
    {
        name: 'search_records',
        description: 'Search contacts, companies, deals and projects by name, email or domain. Read-only.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search term' },
                entityType: {
                    type: 'string',
                    enum: ['CONTACT', 'COMPANY', 'DEAL', 'PROJECT'],
                    description: 'Optional filter',
                },
            },
            required: ['query'],
        },
    },
    {
        name: 'get_deal',
        description: 'Fetch a deal with its stage, contacts and recent activity timeline. Read-only.',
        inputSchema: {
            type: 'object',
            properties: { dealId: { type: 'string' } },
            required: ['dealId'],
        },
    },
    {
        name: 'list_activities',
        description: 'List captured activities for a record, including AI summaries and next steps. Read-only.',
        inputSchema: {
            type: 'object',
            properties: {
                entityType: { type: 'string', enum: ['CONTACT', 'COMPANY', 'DEAL', 'PROJECT'] },
                entityId: { type: 'string' },
                limit: { type: 'number' },
            },
            required: ['entityType', 'entityId'],
        },
    },
    {
        name: 'list_pipeline',
        description: 'List open deals grouped by stage. Read-only.',
        inputSchema: { type: 'object', properties: {} },
    },
    {
        name: 'propose_stage_change',
        description: 'Propose moving a deal to a different stage. This does NOT change the deal — it creates a ' +
            'pending proposal that a person must confirm in Continuum. Returns the proposal id.',
        inputSchema: {
            type: 'object',
            properties: {
                dealId: { type: 'string' },
                stageName: { type: 'string' },
                confidence: { type: 'number', description: '0-1. Below the workspace threshold is discarded.' },
                rationale: { type: 'string', description: 'Evidence for the proposal.' },
            },
            required: ['dealId', 'stageName', 'rationale'],
        },
    },
    {
        name: 'propose_contact',
        description: 'Propose adding a contact. This does NOT create the contact — it creates a pending ' +
            'proposal that a person must confirm in Continuum. Returns the proposal id.',
        inputSchema: {
            type: 'object',
            properties: {
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                title: { type: 'string' },
                confidence: { type: 'number' },
                rationale: { type: 'string' },
            },
            required: ['email', 'rationale'],
        },
    },
    {
        name: 'list_pending_proposals',
        description: 'List proposals awaiting human confirmation, including ones you created.',
        inputSchema: { type: 'object', properties: {} },
    },
];
export const mcpRoutes = async (app) => {
    app.addHook('preHandler', app.requireAuth);
    app.get('/mcp/tools', async () => ({
        tools: TOOLS,
        note: 'Write tools create pending proposals rather than mutating records. A person confirms them ' +
            'in Continuum before anything changes.',
    }));
    app.post('/mcp/call', async (request) => {
        const body = request.body;
        const name = body?.name;
        const args = body?.arguments ?? {};
        if (!name)
            throw badRequest('name is required');
        switch (name) {
            case 'search_records':
                return { content: await searchRecords(String(args.query ?? ''), args.entityType) };
            case 'get_deal':
                return { content: await getDeal(String(args.dealId ?? '')) };
            case 'list_activities':
                return {
                    content: await listActivities(String(args.entityType ?? ''), String(args.entityId ?? ''), Number(args.limit ?? 20)),
                };
            case 'list_pipeline':
                return { content: await listPipeline() };
            case 'propose_stage_change':
                return { content: await proposeStageChange(args) };
            case 'propose_contact':
                return { content: await proposeContact(args) };
            case 'list_pending_proposals': {
                const rows = await prisma.agentAction.findMany({
                    where: { status: 'PENDING' },
                    include: agentActionInclude,
                    orderBy: { createdAt: 'desc' },
                });
                return { content: rows.map(serializeAgentAction) };
            }
            default:
                throw badRequest(`Unknown tool "${name}"`);
        }
    });
};
async function searchRecords(query, entityType) {
    if (query.trim().length < 2)
        return [];
    const contains = { contains: query, mode: 'insensitive' };
    const out = [];
    if (!entityType || entityType === 'CONTACT') {
        const rows = await prisma.contact.findMany({
            where: { OR: [{ email: contains }, { firstName: contains }, { lastName: contains }] },
            include: { company: { select: { name: true } } },
            take: 10,
        });
        out.push(...rows.map((r) => ({
            entityType: 'CONTACT',
            id: r.id,
            name: displayName(r.firstName, r.lastName, r.email),
            email: r.email,
            company: r.company?.name ?? null,
            source: r.source,
        })));
    }
    if (!entityType || entityType === 'COMPANY') {
        const rows = await prisma.company.findMany({
            where: { OR: [{ name: contains }, { domain: contains }] },
            take: 10,
        });
        out.push(...rows.map((r) => ({
            entityType: 'COMPANY',
            id: r.id,
            name: r.name,
            domain: r.domain,
            source: r.source,
        })));
    }
    if (!entityType || entityType === 'DEAL') {
        const rows = await prisma.deal.findMany({
            where: { name: contains },
            include: { stage: true, company: { select: { name: true } } },
            take: 10,
        });
        out.push(...rows.map((r) => ({
            entityType: 'DEAL',
            id: r.id,
            name: r.name,
            stage: r.stage.name,
            // Exposed so a consuming agent can tell inferred state from confirmed.
            stageSource: r.stageSource,
            status: r.status,
            company: r.company?.name ?? null,
        })));
    }
    if (!entityType || entityType === 'PROJECT') {
        const rows = await prisma.project.findMany({ where: { name: contains }, take: 10 });
        out.push(...rows.map((r) => ({
            entityType: 'PROJECT',
            id: r.id,
            name: r.name,
            status: r.status,
        })));
    }
    return out;
}
async function getDeal(dealId) {
    const deal = await prisma.deal.findFirst({
        where: { id: dealId },
        include: {
            stage: true,
            company: true,
            contacts: { include: { contact: true } },
            pipeline: { include: { stages: { orderBy: { order: 'asc' } } } },
        },
    });
    if (!deal)
        return { error: 'Deal not found' };
    const activities = await prisma.activity.findMany({
        where: { links: { some: { entityType: 'DEAL', entityId: dealId } } },
        orderBy: { occurredAt: 'desc' },
        take: 20,
    });
    return {
        id: deal.id,
        name: deal.name,
        stage: deal.stage.name,
        stageSource: deal.stageSource,
        availableStages: deal.pipeline.stages.map((s) => s.name),
        status: deal.status,
        valueCents: deal.valueCents,
        company: deal.company?.name ?? null,
        stalling: deal.stallingSince !== null,
        lastActivityAt: deal.lastActivityAt,
        contacts: deal.contacts.map((dc) => ({
            id: dc.contactId,
            name: displayName(dc.contact.firstName, dc.contact.lastName, dc.contact.email),
            email: dc.contact.email,
            role: dc.role,
        })),
        recentActivity: activities.map((a) => ({
            type: a.type,
            occurredAt: a.occurredAt,
            subject: a.subject,
            summary: a.aiSummary,
            sentiment: a.sentiment,
            nextStep: a.nextStep,
        })),
    };
}
async function listActivities(entityType, entityId, limit) {
    const rows = await prisma.activity.findMany({
        where: { links: { some: { entityType: entityType, entityId } } },
        orderBy: { occurredAt: 'desc' },
        take: Math.min(limit, 100),
    });
    return rows.map((a) => ({
        id: a.id,
        type: a.type,
        direction: a.direction,
        occurredAt: a.occurredAt,
        subject: a.subject,
        summary: a.aiSummary,
        sentiment: a.sentiment,
        nextStep: a.nextStep,
        summaryStatus: a.summaryStatus,
    }));
}
async function listPipeline() {
    const deals = await prisma.deal.findMany({
        where: { status: 'OPEN' },
        include: { stage: true, company: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 200,
    });
    const grouped = new Map();
    for (const deal of deals) {
        const bucket = grouped.get(deal.stage.name) ?? [];
        bucket.push({
            id: deal.id,
            name: deal.name,
            company: deal.company?.name ?? null,
            valueCents: deal.valueCents,
            stalling: deal.stallingSince !== null,
            lastActivityAt: deal.lastActivityAt,
        });
        grouped.set(deal.stage.name, bucket);
    }
    return [...grouped.entries()].map(([stage, dealsInStage]) => ({ stage, deals: dealsInStage }));
}
/**
 * Creates a pending proposal. Note what is absent: no call to
 * `moveDealToStage`. The deal is untouched until a human confirms.
 */
/**
 * Creates a pending proposal. Note what is absent: no call to
 * `moveDealToStage`, and no direct row insert either. Everything routes through
 * `recordProposals`, so an external agent inherits the same guardrails as the
 * internal one — including the single-stage-hop limit, which is exactly the
 * rule a confident external model would otherwise blow straight through.
 */
async function proposeStageChange(args) {
    const dealId = String(args.dealId ?? '');
    const stageName = String(args.stageName ?? '');
    const rationale = String(args.rationale ?? '');
    const confidence = typeof args.confidence === 'number' ? args.confidence : 0.7;
    const deal = await prisma.deal.findFirst({
        where: { id: dealId },
        include: { pipeline: { include: { stages: true } } },
    });
    if (!deal)
        return { error: 'Deal not found' };
    const stage = deal.pipeline.stages.find((s) => s.name === stageName);
    if (!stage) {
        return {
            error: `No stage named "${stageName}"`,
            availableStages: deal.pipeline.stages.map((s) => s.name),
        };
    }
    const recorded = await recordProposals({
        activityId: null,
        dealId,
        companyId: deal.companyId,
        originLabel: '[via MCP]',
        actions: [
            {
                type: 'CHANGE_DEAL_STAGE',
                payload: { stageName },
                confidence,
                rationale,
            },
        ],
    });
    const proposal = recorded[0];
    if (!proposal) {
        return {
            created: false,
            reason: 'No proposal was created. Either the confidence was below this workspace\'s threshold, ' +
                'or a proposal for this deal is already pending.',
        };
    }
    const clamped = proposal.payload.stageName !== stageName;
    return {
        created: true,
        proposalId: proposal.id,
        status: 'PENDING',
        proposedStage: proposal.payload.stageName,
        ...(clamped
            ? {
                adjusted: true,
                note: proposal.guardrailNote,
            }
            : {}),
        message: 'Proposal recorded. The deal has NOT changed — someone must confirm this in Continuum first.',
    };
}
async function proposeContact(args) {
    const email = String(args.email ?? '').toLowerCase();
    if (!email.includes('@'))
        return { error: 'A valid email is required' };
    const rationale = String(args.rationale ?? '');
    const confidence = typeof args.confidence === 'number' ? args.confidence : 0.7;
    const existing = await prisma.contact.findFirst({ where: { email } });
    if (existing) {
        return { created: false, reason: 'That contact already exists', contactId: existing.id };
    }
    const recorded = await recordProposals({
        activityId: null,
        dealId: null,
        companyId: null,
        originLabel: '[via MCP]',
        actions: [
            {
                type: 'CREATE_CONTACT',
                payload: {
                    email,
                    firstName: args.firstName ?? null,
                    lastName: args.lastName ?? null,
                    title: args.title ?? null,
                },
                confidence,
                rationale,
            },
        ],
    });
    const proposal = recorded[0];
    if (!proposal) {
        return {
            created: false,
            reason: 'No proposal was created. Either the confidence was below this workspace\'s threshold, ' +
                'or an identical proposal is already pending.',
        };
    }
    return {
        created: true,
        proposalId: proposal.id,
        status: 'PENDING',
        message: 'Proposal recorded. No contact has been created — someone must confirm this in Continuum first.',
    };
}
