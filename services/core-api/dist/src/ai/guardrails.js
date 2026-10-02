/**
 * Stage changes never advance more than one stage at a time.
 *
 * "Let's sign" on a New Lead deal proposes Qualified, not Won. A jump that
 * large is far more likely to be misread context than genuine progress, and
 * the cost of being wrong scales with the size of the jump — a one-stage error
 * is a small correction, whereas silently marking a cold lead Won corrupts the
 * forecast the manager relies on.
 *
 * Clamping rather than rejecting is deliberate: the underlying signal was
 * probably real, so the useful move is to propose the defensible version of it.
 */
export function clampStageChange(payload, context) {
    const requested = String(payload.stageName ?? '');
    const stages = [...context.orderedStages].sort((a, b) => a.order - b.order);
    const currentIndex = stages.findIndex((s) => s.name === context.currentStageName);
    const requestedIndex = stages.findIndex((s) => s.name === requested);
    if (requestedIndex === -1) {
        return { allowed: false, reason: `No stage named "${requested}" in this pipeline` };
    }
    if (currentIndex === -1) {
        return { allowed: false, reason: 'Deal is in an unrecognised stage' };
    }
    if (requestedIndex === currentIndex) {
        return { allowed: false, reason: 'Deal is already in that stage' };
    }
    // Moving backwards, or into a Lost stage, is allowed at any distance:
    // it is a correction rather than an unearned advance, and it does not
    // inflate the pipeline.
    if (requestedIndex < currentIndex || stages[requestedIndex].isLostStage) {
        return { allowed: true, payload: { ...payload, stageName: requested } };
    }
    if (requestedIndex - currentIndex <= 1) {
        return { allowed: true, payload: { ...payload, stageName: requested } };
    }
    const clampedTo = stages[currentIndex + 1];
    return {
        allowed: true,
        payload: { ...payload, stageName: clampedTo.name },
        note: `The message suggested moving to ${requested}, which is more than one stage ahead. ` +
            `Proposing ${clampedTo.name} instead — large jumps usually mean the context was misread.`,
    };
}
/**
 * Enrichment only ever fills a blank. It never overwrites a value a person
 * entered, at any confidence, because a human-entered value is a statement of
 * intent and the agent has no standing to contradict it.
 */
export function filterEnrichment(payload, existing, humanEnteredFields) {
    const safe = {};
    for (const [field, value] of Object.entries(payload)) {
        if (value === null || value === undefined || value === '')
            continue;
        if (humanEnteredFields.has(field))
            continue;
        const current = existing[field];
        const isEmpty = current === null || current === undefined || current === '';
        if (isEmpty)
            safe[field] = value;
    }
    if (Object.keys(safe).length === 0) {
        return {
            allowed: false,
            reason: 'Every field in this proposal already has a value — enrichment only fills blanks',
        };
    }
    return { allowed: true, payload: safe };
}
/**
 * Action types that always require explicit human confirmation, regardless of
 * confidence and regardless of what a future autonomy phase permits.
 *
 * Creating a record is treated as higher-consequence than editing one: a wrong
 * edit is visible on a record someone already knows about, whereas a wrong
 * *new* record is clutter nobody is watching, and it pollutes matching for
 * every future message from that address.
 */
export const ALWAYS_REQUIRES_CONFIRMATION = new Set([
    'CREATE_CONTACT',
    'CREATE_COMPANY',
]);
/**
 * Action types that never take effect without a person, in any phase.
 * Drafting is assistance; sending is an irreversible act on the user's behalf.
 */
export const NEVER_AUTO_EXECUTES = new Set(['DRAFT_EMAIL', 'SEND_EMAIL']);
/**
 * Relative consequence of each action type, used by the autonomy roadmap to
 * decide what may become eligible for auto-apply first (§25.4, §25.5).
 *
 * Task suggestions are lowest because a wrong one is dismissed in a click and
 * corrupts nothing. Stage changes are highest because they move the number the
 * business forecasts on.
 */
export const CONSEQUENCE_RANK = {
    CREATE_TASK: 1,
    LINK_CONTACT_TO_DEAL: 2,
    UPDATE_CONTACT: 3,
    CREATE_CONTACT: 4,
    CREATE_COMPANY: 4,
    UPDATE_DEAL: 5,
    CHANGE_DEAL_STAGE: 6,
};
/** Human-readable explanation of a guardrail, for the log and the UI. */
export function describeGuardrail(type) {
    switch (type) {
        case 'CHANGE_DEAL_STAGE':
            return 'Stage proposals never advance more than one stage at a time.';
        case 'CREATE_CONTACT':
        case 'CREATE_COMPANY':
            return 'Creating a record always requires confirmation, whatever the confidence.';
        default:
            return null;
    }
}
