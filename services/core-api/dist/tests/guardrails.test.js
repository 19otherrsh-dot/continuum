import { describe, expect, it } from 'vitest';
import { ALWAYS_REQUIRES_CONFIRMATION, CONSEQUENCE_RANK, NEVER_AUTO_EXECUTES, clampStageChange, filterEnrichment, } from '../src/ai/guardrails.js';
import { evaluateAutonomy } from '../src/ai/autonomy.js';
import { adjustConfidence, trajectoryFrom } from '../src/ai/confidence.js';
const PIPELINE = {
    orderedStages: [
        { name: 'New Lead', order: 0, isWonStage: false, isLostStage: false },
        { name: 'Contacted', order: 1, isWonStage: false, isLostStage: false },
        { name: 'Qualified', order: 2, isWonStage: false, isLostStage: false },
        { name: 'Proposal', order: 3, isWonStage: false, isLostStage: false },
        { name: 'Won', order: 4, isWonStage: true, isLostStage: false },
        { name: 'Lost', order: 5, isWonStage: false, isLostStage: true },
    ],
    currentStageName: 'New Lead',
};
describe('stage-change guardrail (§25.4)', () => {
    /**
     * The headline case from the spec: "let's sign" on a New Lead deal proposes
     * Contacted, not Won. A jump that large is far more likely to be misread
     * context than genuine progress.
     */
    it('never advances more than one stage, clamping instead of rejecting', () => {
        const outcome = clampStageChange({ stageName: 'Won' }, PIPELINE);
        expect(outcome.allowed).toBe(true);
        if (!outcome.allowed)
            return;
        expect(outcome.payload.stageName).toBe('Contacted');
        expect(outcome.note).toContain('more than one stage');
    });
    it('allows a single-stage advance untouched', () => {
        const outcome = clampStageChange({ stageName: 'Contacted' }, PIPELINE);
        expect(outcome.allowed).toBe(true);
        if (!outcome.allowed)
            return;
        expect(outcome.payload.stageName).toBe('Contacted');
        expect(outcome.note).toBeUndefined();
    });
    /** Moving backwards is a correction, not an unearned advance — no clamp. */
    it('allows an arbitrary move backwards', () => {
        const outcome = clampStageChange({ stageName: 'New Lead' }, { ...PIPELINE, currentStageName: 'Proposal' });
        expect(outcome.allowed).toBe(true);
        if (!outcome.allowed)
            return;
        expect(outcome.payload.stageName).toBe('New Lead');
    });
    /** Marking a deal Lost never inflates the pipeline, so distance is irrelevant. */
    it('allows a jump straight to Lost', () => {
        const outcome = clampStageChange({ stageName: 'Lost' }, PIPELINE);
        expect(outcome.allowed).toBe(true);
        if (!outcome.allowed)
            return;
        expect(outcome.payload.stageName).toBe('Lost');
    });
    it('rejects an unknown stage and a no-op move', () => {
        expect(clampStageChange({ stageName: 'Nonsense' }, PIPELINE).allowed).toBe(false);
        expect(clampStageChange({ stageName: 'New Lead' }, PIPELINE).allowed).toBe(false);
    });
});
describe('enrichment guardrail (§25.4)', () => {
    it('fills blanks only', () => {
        const outcome = filterEnrichment({ title: 'VP Sales', phone: '+15551234567' }, { title: null, phone: '+15559999999' }, new Set());
        expect(outcome.allowed).toBe(true);
        if (!outcome.allowed)
            return;
        expect(outcome.payload).toEqual({ title: 'VP Sales' });
    });
    /**
     * A human-entered value is a statement of intent. The agent has no standing
     * to contradict it, at any confidence.
     */
    it('never overwrites a human-entered value even when the field looks empty-ish', () => {
        const outcome = filterEnrichment({ title: 'Head of Ops' }, { title: '' }, new Set(['title']));
        expect(outcome.allowed).toBe(false);
    });
    it('rejects the proposal outright when nothing is left to fill', () => {
        const outcome = filterEnrichment({ title: 'VP' }, { title: 'CTO' }, new Set());
        expect(outcome.allowed).toBe(false);
        if (outcome.allowed)
            return;
        expect(outcome.reason).toContain('only fills blanks');
    });
});
describe('autonomy policy (§25.5)', () => {
    /** V1: no exceptions, at any confidence tier. */
    it('requires human confirmation for every action type at phase 1', () => {
        for (const type of Object.keys(CONSEQUENCE_RANK)) {
            const decision = evaluateAutonomy({
                type,
                confidence: 0.99,
                workspaceOptedIn: true,
                phase: 1,
            });
            expect(decision.autoApply).toBe(false);
        }
    });
    it('opens only the lowest-consequence action type at phase 2, above a high bar', () => {
        expect(evaluateAutonomy({ type: 'CREATE_TASK', confidence: 0.96, workspaceOptedIn: true, phase: 2 })
            .autoApply).toBe(true);
        // Below the bar.
        expect(evaluateAutonomy({ type: 'CREATE_TASK', confidence: 0.9, workspaceOptedIn: true, phase: 2 })
            .autoApply).toBe(false);
        // Higher-consequence type, however confident.
        expect(evaluateAutonomy({
            type: 'CHANGE_DEAL_STAGE',
            confidence: 0.99,
            workspaceOptedIn: true,
            phase: 2,
        }).autoApply).toBe(false);
    });
    it('respects the workspace opt-in', () => {
        expect(evaluateAutonomy({ type: 'CREATE_TASK', confidence: 0.99, workspaceOptedIn: false, phase: 2 })
            .autoApply).toBe(false);
    });
    /** Guardrails outrank the phase policy in every phase. */
    it('never auto-applies record creation, at any phase or confidence', () => {
        for (const phase of [1, 2, 3]) {
            expect(evaluateAutonomy({
                type: 'CREATE_CONTACT',
                confidence: 1,
                workspaceOptedIn: true,
                phase,
            }).autoApply).toBe(false);
        }
        expect(ALWAYS_REQUIRES_CONFIRMATION.has('CREATE_CONTACT')).toBe(true);
        expect(NEVER_AUTO_EXECUTES.has('DRAFT_EMAIL')).toBe(true);
    });
    it('ranks task suggestions as the least consequential action', () => {
        expect(CONSEQUENCE_RANK.CREATE_TASK).toBeLessThan(CONSEQUENCE_RANK.CHANGE_DEAL_STAGE);
        expect(CONSEQUENCE_RANK.CREATE_TASK).toBeLessThan(CONSEQUENCE_RANK.UPDATE_DEAL);
    });
});
describe('confidence signals (§25.2)', () => {
    /** A transcript may itself be a mis-transcription — same words, weaker evidence. */
    it('weights a call transcript below clean email text', () => {
        const fromEmail = adjustConfidence(0.85, { sourceKind: 'EMAIL' });
        const fromCall = adjustConfidence(0.85, { sourceKind: 'CALL' });
        expect(fromCall).toBeLessThan(fromEmail);
    });
    it('rewards a proposal consistent with the record trajectory and penalises one against it', () => {
        const consistent = adjustConfidence(0.8, { trajectory: 'CONSISTENT' });
        const contradictory = adjustConfidence(0.8, { trajectory: 'CONTRADICTORY' });
        expect(consistent).toBeGreaterThan(0.8);
        expect(contradictory).toBeLessThan(0.7);
    });
    it('treats an advance on a stalled deal as contradictory', () => {
        expect(trajectoryFrom({ recentSentiments: ['POSITIVE'], isStalling: true, advancing: true })).toBe('CONTRADICTORY');
        expect(trajectoryFrom({ recentSentiments: ['POSITIVE', 'POSITIVE'], isStalling: false, advancing: true })).toBe('CONSISTENT');
        expect(trajectoryFrom({ recentSentiments: ['NEGATIVE'], isStalling: false, advancing: true })).toBe('CONTRADICTORY');
    });
    /**
     * It must always be easier for the signal weighting to make the agent
     * quieter than louder — a strong prior cannot manufacture certainty the
     * evidence does not support.
     */
    it('can lower confidence further than it can raise it', () => {
        const maxUp = adjustConfidence(0.5, {
            explicitStatement: true,
            knownSender: true,
            trajectory: 'CONSISTENT',
            priorConfirmations: 10,
        });
        const maxDown = adjustConfidence(0.5, {
            sparseContent: true,
            sourceKind: 'CALL',
            trajectory: 'CONTRADICTORY',
            priorCorrections: 10,
        });
        expect(maxUp - 0.5).toBeLessThan(0.5 - maxDown);
    });
});
