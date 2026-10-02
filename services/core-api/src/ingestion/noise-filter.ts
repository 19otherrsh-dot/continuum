import { isAutomatedSender, parseAddress } from '../lib/email.js';
import type { CapturedMessage } from '../providers/types.js';

export interface NoiseVerdict {
  isNoise: boolean;
  reason: string | null;
}

/**
 * Bulk-mail detection, run *before* the matching engine.
 *
 * The ordering matters. A newsletter from a customer's own domain would
 * otherwise look exactly like a genuine reply from a new stakeholder, and the
 * agent would propose a contact for every marketing list the team is on
 * (Epic A edge case). Filtering here means such a message never reaches
 * matching, never generates a proposal, and never costs a summarization call.
 *
 * The filter is deliberately conservative on the other side too: a false
 * positive silently loses a real customer email, which is worse than an
 * occasional newsletter on the timeline. Only unambiguous machine markers
 * count.
 */
export function classifyNoise(message: CapturedMessage): NoiseVerdict {
  const headers = message.headers ?? {};
  const header = (name: string): string | undefined => headers[name.toLowerCase()];

  // RFC 2369 — only bulk senders set this.
  if (header('list-unsubscribe') || header('list-id')) {
    return { isNoise: true, reason: 'bulk-mail headers' };
  }

  const precedence = header('precedence')?.toLowerCase();
  if (precedence === 'bulk' || precedence === 'junk' || precedence === 'list') {
    return { isNoise: true, reason: `precedence: ${precedence}` };
  }

  if (header('auto-submitted') && header('auto-submitted') !== 'no') {
    return { isNoise: true, reason: 'auto-submitted' };
  }

  // Out-of-office and vacation autoresponders.
  if (header('x-autoreply') || header('x-autorespond') || header('x-auto-response-suppress')) {
    return { isNoise: true, reason: 'auto-responder' };
  }

  if (header('x-campaign-id') || header('x-mailer-campaign') || header('feedback-id')) {
    return { isNoise: true, reason: 'marketing campaign headers' };
  }

  const from = parseAddress(message.from);
  if (!from) {
    return { isNoise: true, reason: 'unparseable sender' };
  }

  if (isAutomatedSender(from)) {
    return { isNoise: true, reason: `automated sender (${from.localPart})` };
  }

  // Delivery failures reference a real contact but are not a conversation.
  const subject = (message.subject ?? '').toLowerCase();
  if (
    subject.startsWith('undeliverable') ||
    subject.startsWith('delivery status notification') ||
    subject.startsWith('mail delivery failed') ||
    subject.startsWith('automatic reply') ||
    subject.startsWith('out of office')
  ) {
    return { isNoise: true, reason: 'delivery/auto-reply notification' };
  }

  return { isNoise: false, reason: null };
}

/**
 * User-configured exclusions (FR-AC-08), applied on top of noise detection.
 * Excluded content is dropped here — before persistence and before any AI
 * call — so it is never ingested, summarized, or transiently processed.
 */
export interface ExclusionRule {
  kind: 'SENDER' | 'DOMAIN' | 'THREAD';
  value: string;
}

export function isExcluded(message: CapturedMessage, rules: ExclusionRule[]): boolean {
  if (rules.length === 0) return false;

  const from = parseAddress(message.from);
  const participants = [message.from, ...message.to, ...message.cc]
    .map((raw) => parseAddress(raw))
    .filter((a): a is NonNullable<typeof a> => a !== null);

  for (const rule of rules) {
    const value = rule.value.toLowerCase();
    if (rule.kind === 'SENDER' && from?.email === value) return true;
    if (rule.kind === 'DOMAIN' && participants.some((p) => p.domain === value)) return true;
    if (rule.kind === 'THREAD' && message.threadRef?.toLowerCase() === value) return true;
  }
  return false;
}
