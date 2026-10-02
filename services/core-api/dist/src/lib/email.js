import { AUTOMATED_LOCAL_PARTS, CONSUMER_EMAIL_DOMAINS } from '@continuum/shared';
/** Parses `Display Name <user@example.com>` or a bare address. Returns null if unusable. */
export function parseAddress(raw) {
    if (!raw)
        return null;
    const trimmed = raw.trim();
    const angled = /^(.*?)<([^>]+)>$/.exec(trimmed);
    const namePart = angled?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
    const addressPart = (angled?.[2] ?? trimmed).trim().toLowerCase();
    const at = addressPart.lastIndexOf('@');
    if (at <= 0 || at === addressPart.length - 1)
        return null;
    const localPart = addressPart.slice(0, at);
    const domain = addressPart.slice(at + 1);
    if (!domain.includes('.'))
        return null;
    return {
        email: addressPart,
        name: namePart.length > 0 ? namePart : null,
        localPart,
        domain,
    };
}
export function parseAddressList(raw) {
    if (!raw)
        return [];
    const items = Array.isArray(raw) ? raw : raw.split(',');
    const seen = new Set();
    const out = [];
    for (const item of items) {
        const parsed = parseAddress(item);
        if (parsed && !seen.has(parsed.email)) {
            seen.add(parsed.email);
            out.push(parsed);
        }
    }
    return out;
}
/**
 * A consumer mailbox is a person, not an account. Without this check every
 * personal address would mint a "gmail.com" company.
 */
export function isBusinessDomain(domain) {
    return !CONSUMER_EMAIL_DOMAINS.has(domain.toLowerCase());
}
/** True for machine senders — no-reply, notifications, bounce handlers, and the like. */
export function isAutomatedSender(address) {
    const local = address.localPart.toLowerCase();
    return AUTOMATED_LOCAL_PARTS.some((marker) => local === marker || local.startsWith(`${marker}-`) || local.startsWith(`${marker}.`));
}
/** Best-effort company name from a domain: "acme-corp.co.uk" -> "Acme Corp". */
export function companyNameFromDomain(domain) {
    const host = domain.toLowerCase().replace(/^www\./, '');
    const label = host.split('.')[0] ?? host;
    return label
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
/** Splits a display name into first/last without inventing structure that isn't there. */
export function splitName(name) {
    if (!name)
        return { firstName: null, lastName: null };
    const cleaned = name.replace(/\s+/g, ' ').trim();
    if (!cleaned)
        return { firstName: null, lastName: null };
    // "Doe, Jane" is common in directory exports.
    if (cleaned.includes(',')) {
        const [last, first] = cleaned.split(',', 2);
        return { firstName: first?.trim() || null, lastName: last?.trim() || null };
    }
    const parts = cleaned.split(' ');
    if (parts.length === 1)
        return { firstName: parts[0] ?? null, lastName: null };
    return {
        firstName: parts[0] ?? null,
        lastName: parts.slice(1).join(' ') || null,
    };
}
export function displayName(firstName, lastName, email) {
    const joined = [firstName, lastName].filter(Boolean).join(' ').trim();
    return joined.length > 0 ? joined : email;
}
