import { prisma } from '../db/client.js';
import { getContext } from '../db/context.js';
/** Keys that would carry communication content if a call site ever passed them. */
const FORBIDDEN_KEYS = new Set([
    'subject',
    'body',
    'summary',
    'aisummary',
    'transcript',
    'email',
    'name',
    'content',
    'text',
    'rationale',
    'nextstep',
    'title',
]);
function sanitize(props) {
    const clean = {};
    for (const [key, value] of Object.entries(props)) {
        if (value === undefined)
            continue;
        if (FORBIDDEN_KEYS.has(key.toLowerCase().replace(/[_-]/g, '')))
            continue;
        // Any free-text value is capped hard — long enough for an enum or an id,
        // too short to be a message.
        clean[key] = typeof value === 'string' ? value.slice(0, 120) : value;
    }
    return clean;
}
/**
 * Records an event. Never throws and never blocks the caller: analytics failing
 * must not fail the user's actual request.
 */
export async function track(name, props = {}) {
    const ctx = getContext();
    if (!ctx)
        return;
    try {
        await prisma.analyticsEvent.create({
            data: {
                organizationId: ctx.organizationId,
                userId: ctx.userId,
                name,
                properties: sanitize(props),
            },
        });
    }
    catch {
        // Deliberately swallowed.
    }
}
/** Fire-and-forget wrapper for hot paths where even the insert latency matters. */
export function trackAsync(name, props = {}) {
    void track(name, props);
}
/**
 * The `first_activity_captured` event measures time-to-value, which is only
 * meaningful once per connection — the target is a median under five minutes
 * from connecting a mailbox (§39).
 */
export async function trackFirstCapture(connectionId) {
    const ctx = getContext();
    if (!ctx)
        return;
    try {
        const already = await prisma.analyticsEvent.findFirst({
            where: { name: 'first_activity_captured', properties: { path: ['connectionId'], equals: connectionId } },
        });
        if (already)
            return;
        const connection = await prisma.integrationConnection.findFirst({
            where: { id: connectionId },
            select: { createdAt: true, provider: true },
        });
        if (!connection)
            return;
        await track('first_activity_captured', {
            connectionId,
            provider: connection.provider,
            secondsSinceConnection: Math.round((Date.now() - connection.createdAt.getTime()) / 1000),
        });
    }
    catch {
        /* non-critical */
    }
}
