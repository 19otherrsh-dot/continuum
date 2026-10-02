/**
 * Deterministic summarizer and proposer used when no ANTHROPIC_API_KEY is set.
 *
 * The design goal here is honesty, not simulated intelligence. The fallback
 * produces an *extractive* summary — real sentences from the message rather
 * than invented ones — and scores confidence conservatively, so almost
 * everything lands below the proposal threshold and the agent stays quiet.
 *
 * That is the correct degradation. Without a model the product should still be
 * a well-organized timeline; what it must never become is a pipeline full of
 * confident guesses.
 */
const POSITIVE_MARKERS = [
    'approved',
    'signed off',
    'looks good',
    'sounds good',
    'excited',
    'great',
    'happy to',
    'works for us',
    'go ahead',
    'positive',
    'thanks for',
    'glad',
    'perfect',
];
const NEGATIVE_MARKERS = [
    'concerned',
    'concern',
    'unfortunately',
    'not going to',
    'too expensive',
    'over budget',
    'hold off',
    'on hold',
    'pause',
    'disappointed',
    'blocker',
    'issue',
    'delay',
    'cannot',
    "can't",
    'no longer',
];
const NEXT_STEP_PATTERNS = [
    /\b(?:can we|could we|shall we|let'?s)\s+([^.?!\n]{6,120})[.?!]?/i,
    /\bI'?ll\s+([^.?!\n]{6,120})[.?!]/i,
    /\bwe'?ll\s+([^.?!\n]{6,120})[.?!]/i,
    /\b(?:next step|next steps?)\s*(?:is|are|:)\s*([^.?!\n]{6,120})[.?!]?/i,
    /\bsend\s+(?:me\s+|us\s+|over\s+)?(?:the\s+)?([^.?!\n]{4,120})[.?!]/i,
    /\bfollow up\s+([^.?!\n]{4,120})[.?!]?/i,
];
function sentences(text) {
    return text
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
}
/** Drops signature blocks and quoted replies so they do not dominate the summary. */
function stripQuotedAndSignature(body) {
    const lines = body.split('\n');
    const kept = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('>'))
            continue;
        if (/^on .+ wrote:$/i.test(trimmed))
            break;
        if (trimmed === '--' || trimmed === '-- ')
            break;
        if (/^(best|regards|thanks|cheers|sincerely|kind regards)[,.]?$/i.test(trimmed))
            break;
        kept.push(line);
    }
    return kept.join('\n').trim();
}
export function localSummarize(input) {
    const cleaned = stripQuotedAndSignature(input.body);
    const parts = sentences(cleaned);
    // Extractive: the opening sentences of the message, verbatim. Nothing here
    // is generated, so nothing here can be wrong about what was said.
    const lead = parts.slice(0, 3).join(' ');
    const summary = lead.length > 0
        ? lead.length > 480
            ? `${lead.slice(0, 477)}...`
            : lead
        : (input.subject ?? 'No content captured.');
    const lower = cleaned.toLowerCase();
    const positives = POSITIVE_MARKERS.filter((m) => lower.includes(m)).length;
    const negatives = NEGATIVE_MARKERS.filter((m) => lower.includes(m)).length;
    const sentiment = negatives > positives ? 'NEGATIVE' : positives > negatives ? 'POSITIVE' : 'NEUTRAL';
    let nextStep = null;
    for (const pattern of NEXT_STEP_PATTERNS) {
        const match = pattern.exec(cleaned);
        const captured = match?.[1]?.trim();
        if (captured && captured.length >= 6) {
            nextStep = captured.charAt(0).toUpperCase() + captured.slice(1);
            break;
        }
    }
    return { summary, sentiment, nextStep };
}
/**
 * Explicit, unambiguous buying signals only.
 *
 * The bar is deliberately high: a phrase has to state the fact outright
 * ("budget is approved"), not merely suggest it. Anything softer scores below
 * the threshold and produces no proposal at all.
 */
const STAGE_SIGNALS = [
    { pattern: /\bbudget (?:is |was |has been )?approved\b/i, stageHint: 'Proposal', confidence: 0.86 },
    { pattern: /\bfinance (?:has )?signed off\b/i, stageHint: 'Proposal', confidence: 0.84 },
    { pattern: /\bwe'?re? ready to (?:sign|proceed|move forward)\b/i, stageHint: 'Proposal', confidence: 0.85 },
    { pattern: /\bsend (?:over |us |me )?the (?:paperwork|contract|agreement)\b/i, stageHint: 'Proposal', confidence: 0.83 },
    { pattern: /\bpurchase order\b/i, stageHint: 'Proposal', confidence: 0.81 },
];
export function localProposeActions(input) {
    if (!input.hasDeal)
        return [];
    const haystack = `${input.subject ?? ''}\n${input.body}`;
    const actions = [];
    for (const signal of STAGE_SIGNALS) {
        const match = signal.pattern.exec(haystack);
        if (!match)
            continue;
        if (input.currentStageName === signal.stageHint)
            continue;
        actions.push({
            type: 'CHANGE_DEAL_STAGE',
            payload: { stageName: signal.stageHint },
            confidence: signal.confidence,
            rationale: `The message states: "${match[0]}".`,
        });
        break;
    }
    return actions;
}
