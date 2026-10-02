import { prisma } from '../db/client.js';
import { orgId } from '../db/context.js';
import { companyNameFromDomain, isBusinessDomain, parseAddress, splitName, } from '../lib/email.js';
/**
 * Resolves a captured message onto CRM records.
 *
 * Two decisions live here and both have sharp edges:
 *
 * **Which contacts.** Every recognised participant is linked, not just the
 * sender, so a thread involving three stakeholders shows up on all three
 * records. Participants we do not recognise are *returned* rather than
 * created — the agent proposes them and a human confirms (FR-AC-04).
 *
 * **Which record it belongs to.** A contact can be on an open deal and a
 * running project at the same time, so the activity must not be duplicated
 * onto both indiscriminately. Resolution is by most recent context: the open
 * deal that already has this thread, then any open deal for the company, then
 * the company's active project, then the company itself.
 */
export async function matchMessage(message) {
    const organizationId = orgId();
    const participants = collectParticipants(message);
    const businessAddresses = participants.filter((a) => isBusinessDomain(a.domain));
    const contacts = participants.length > 0
        ? await prisma.contact.findMany({
            where: { email: { in: participants.map((p) => p.email) } },
            include: { company: true },
        })
        : [];
    const knownByEmail = new Map(contacts.map((c) => [c.email, c]));
    const unknownAddresses = businessAddresses.filter((a) => !knownByEmail.has(a.email));
    // Companies come from two places: contacts we already know, and domains we
    // recognise even when the individual is new.
    const companyIds = new Set();
    for (const contact of contacts) {
        if (contact.companyId)
            companyIds.add(contact.companyId);
    }
    const domains = [...new Set(businessAddresses.map((a) => a.domain))];
    const companiesByDomain = domains.length > 0
        ? await prisma.company.findMany({ where: { domain: { in: domains } } })
        : [];
    for (const company of companiesByDomain)
        companyIds.add(company.id);
    // The primary company follows the *counterparty* domain, not our own — for
    // an outbound message that is the recipient, for an inbound one the sender.
    const primaryDomain = counterpartyDomain(message, participants);
    const primaryCompany = companiesByDomain.find((c) => c.domain === primaryDomain) ??
        companiesByDomain[0] ??
        null;
    const target = await resolveTarget({
        organizationId,
        threadRef: message.threadRef,
        contactIds: contacts.map((c) => c.id),
        companyIds: [...companyIds],
        primaryCompanyId: primaryCompany?.id ?? null,
    });
    const links = [];
    if (target.dealId)
        links.push({ entityType: 'DEAL', entityId: target.dealId, isPrimary: true });
    if (target.projectId) {
        links.push({ entityType: 'PROJECT', entityId: target.projectId, isPrimary: !target.dealId });
    }
    if (primaryCompany) {
        links.push({
            entityType: 'COMPANY',
            entityId: primaryCompany.id,
            isPrimary: !target.dealId && !target.projectId,
        });
    }
    for (const contact of contacts) {
        links.push({ entityType: 'CONTACT', entityId: contact.id, isPrimary: false });
    }
    return {
        knownContactIds: contacts.map((c) => c.id),
        unknownAddresses,
        companyIds: [...companyIds],
        links,
        dealId: target.dealId,
        projectId: target.projectId,
        primaryCompanyId: primaryCompany?.id ?? null,
    };
}
function collectParticipants(message) {
    const raw = [message.from, ...message.to, ...message.cc, ...(message.attendees ?? [])];
    const seen = new Map();
    for (const item of raw) {
        const parsed = parseAddress(item);
        // Our own mailbox is a participant but never a CRM contact.
        if (parsed && parsed.email !== message.mailbox.toLowerCase()) {
            seen.set(parsed.email, parsed);
        }
    }
    return [...seen.values()];
}
/**
 * The domain of the party on the other side of the conversation. For a message
 * BCC'ing a colleague at a different firm, this keeps the primary association
 * on the original recipient's domain rather than drifting to whoever happened
 * to be copied (Epic A edge case).
 */
function counterpartyDomain(message, participants) {
    const from = parseAddress(message.from);
    const mailbox = message.mailbox.toLowerCase();
    const outbound = from?.email === mailbox;
    if (outbound) {
        const firstRecipient = message.to
            .map((t) => parseAddress(t))
            .find((a) => a !== null && isBusinessDomain(a.domain));
        if (firstRecipient)
            return firstRecipient.domain;
    }
    else if (from && isBusinessDomain(from.domain)) {
        return from.domain;
    }
    return participants.find((p) => isBusinessDomain(p.domain))?.domain ?? null;
}
async function resolveTarget(input) {
    // 1. The thread is already attached to something. Strongest signal there is:
    //    continue the conversation where it has been living.
    if (input.threadRef) {
        const prior = await prisma.activity.findFirst({
            where: { threadRef: input.threadRef },
            include: { links: true },
            orderBy: { occurredAt: 'desc' },
        });
        const priorDeal = prior?.links.find((l) => l.entityType === 'DEAL');
        if (priorDeal)
            return { dealId: priorDeal.entityId, projectId: null };
        const priorProject = prior?.links.find((l) => l.entityType === 'PROJECT');
        if (priorProject)
            return { dealId: null, projectId: priorProject.entityId };
    }
    // 2. An open deal involving one of these contacts.
    if (input.contactIds.length > 0) {
        const deal = await prisma.deal.findFirst({
            where: { status: 'OPEN', contacts: { some: { contactId: { in: input.contactIds } } } },
            orderBy: { updatedAt: 'desc' },
        });
        if (deal)
            return { dealId: deal.id, projectId: null };
    }
    // 3. An open deal for the company.
    if (input.companyIds.length > 0) {
        const deal = await prisma.deal.findFirst({
            where: { status: 'OPEN', companyId: { in: input.companyIds } },
            orderBy: { updatedAt: 'desc' },
        });
        if (deal)
            return { dealId: deal.id, projectId: null };
        // 4. No open deal — an active project is the live relationship. This is
        //    what keeps post-signature conversation flowing onto the delivery
        //    record without anyone re-linking anything.
        const project = await prisma.project.findFirst({
            where: { status: 'ACTIVE', companyId: { in: input.companyIds } },
            orderBy: { updatedAt: 'desc' },
        });
        if (project)
            return { dealId: null, projectId: project.id };
    }
    return { dealId: null, projectId: null };
}
/**
 * Finds or creates the company for a business domain. Used when confirming a
 * contact proposal — the account has to exist before the contact can hang off
 * it (FR-DATA-03).
 */
export async function ensureCompanyForDomain(domain, source = 'AGENT_INFERRED') {
    if (!isBusinessDomain(domain))
        return null;
    const existing = await prisma.company.findFirst({ where: { domain } });
    if (existing)
        return existing.id;
    const created = await prisma.company.create({
        data: {
            organizationId: orgId(),
            name: companyNameFromDomain(domain),
            domain,
            source,
        },
    });
    return created.id;
}
/** Splits a display name for a proposed contact, so the user sees a real name to confirm. */
export function contactFieldsFromAddress(address) {
    const { firstName, lastName } = splitName(address.name);
    return {
        email: address.email,
        firstName,
        lastName,
        domain: address.domain,
    };
}
