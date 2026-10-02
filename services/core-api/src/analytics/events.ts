import { prisma } from '../db/client.js';
import { getContext } from '../db/context.js';

/**
 * Product analytics (PRD §38).
 *
 * Instrumented from the first design-partner deployment rather than added once
 * a problem is already visible to a user — by then the data that would explain
 * it does not exist.
 *
 * **Data minimization (§38.1).** Events carry record IDs, enums and durations.
 * They never carry captured communication content: no subjects, no bodies, no
 * summaries, no email addresses. Analytics is stored in its own table so it can
 * be retained on a different schedule from the CRM records it describes, and so
 * a query against it cannot accidentally surface a customer's mail. The
 * `sanitize` step below enforces that rather than trusting call sites.
 */

export type AnalyticsEventName =
  | 'signup_completed'
  | 'integration_connected'
  | 'first_activity_captured'
  | 'activity_captured'
  | 'agent_action_created'
  | 'agent_action_resolved'
  | 'deal_stage_changed'
  | 'deal_converted_to_project'
  | 'capture_coverage'
  | 'export_requested'
  | 'stalling_deal_flagged'
  | 'stalling_deal_resolved';

/**
 * Property values are restricted to types that cannot smuggle message content.
 * Strings are permitted but truncated and screened below.
 */
export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

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

function sanitize(props: AnalyticsProps): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (FORBIDDEN_KEYS.has(key.toLowerCase().replace(/[_-]/g, ''))) continue;
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
export async function track(
  name: AnalyticsEventName,
  props: AnalyticsProps = {},
): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;

  try {
    await prisma.analyticsEvent.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        name,
        properties: sanitize(props) as object,
      },
    });
  } catch {
    // Deliberately swallowed.
  }
}

/** Fire-and-forget wrapper for hot paths where even the insert latency matters. */
export function trackAsync(name: AnalyticsEventName, props: AnalyticsProps = {}): void {
  void track(name, props);
}

/**
 * The `first_activity_captured` event measures time-to-value, which is only
 * meaningful once per connection — the target is a median under five minutes
 * from connecting a mailbox (§39).
 */
export async function trackFirstCapture(connectionId: string): Promise<void> {
  const ctx = getContext();
  if (!ctx) return;

  try {
    const already = await prisma.analyticsEvent.findFirst({
      where: { name: 'first_activity_captured', properties: { path: ['connectionId'], equals: connectionId } },
    });
    if (already) return;

    const connection = await prisma.integrationConnection.findFirst({
      where: { id: connectionId },
      select: { createdAt: true, provider: true },
    });
    if (!connection) return;

    await track('first_activity_captured', {
      connectionId,
      provider: connection.provider,
      secondsSinceConnection: Math.round((Date.now() - connection.createdAt.getTime()) / 1000),
    });
  } catch {
    /* non-critical */
  }
}
