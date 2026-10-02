import type { AgentActionType } from '@continuum/shared';
import { ALWAYS_REQUIRES_CONFIRMATION, NEVER_AUTO_EXECUTES } from './guardrails.js';

/**
 * The autonomy roadmap (PRD §25.5), expressed as enforced policy rather than a
 * comment.
 *
 * V1 ships human-confirmed suggestions only — no exceptions, at any confidence
 * tier. That is a trust-building constraint, not a technical limitation, so it
 * is encoded here as a single function every write path consults. Enabling a
 * later phase is a deliberate change to this file, not something that can be
 * reached accidentally by tuning a threshold elsewhere.
 *
 * What changes across phases is *who clicks Confirm* — never whether the action
 * is logged, attributed, or reversible. The Agent Action Log (FR-AGENT-05)
 * stays the single source of truth in every phase.
 */

export type AutonomyPhase = 1 | 2 | 3;

/** V1. Do not change without the design-partner data §37.1 requires. */
export const CURRENT_PHASE: AutonomyPhase = 1;

/**
 * Phase 2 opens auto-apply to the lowest-consequence action type only, and only
 * at a confidence well above the normal "high" tier. An incorrect task
 * suggestion is dismissed in one click and corrupts no record — which is
 * exactly why it goes first.
 */
const PHASE_2_ELIGIBLE: ReadonlySet<AgentActionType> = new Set(['CREATE_TASK']);
const PHASE_2_MIN_CONFIDENCE = 0.95;

/**
 * Phase 3 widens eligibility, but only where the acceptance-rate data collected
 * since V1 (§38, `agent_action_resolved`) supports it. The set is deliberately
 * empty here: it is to be populated from evidence, never speculatively.
 */
const PHASE_3_ELIGIBLE: ReadonlySet<AgentActionType> = new Set();
const PHASE_3_MIN_CONFIDENCE = 0.95;

export interface AutonomyDecision {
  /** True only when the action may take effect without a person clicking Confirm. */
  autoApply: boolean;
  reason: string;
}

export function evaluateAutonomy(input: {
  type: AgentActionType;
  confidence: number;
  /** Workspace admin opt-in. Required from Phase 2 onward; ignored in Phase 1. */
  workspaceOptedIn: boolean;
  phase?: AutonomyPhase;
}): AutonomyDecision {
  const phase = input.phase ?? CURRENT_PHASE;

  // Guardrails outrank the phase policy. These never auto-apply, ever.
  if (NEVER_AUTO_EXECUTES.has(input.type)) {
    return { autoApply: false, reason: 'This action type never executes without a person.' };
  }
  if (ALWAYS_REQUIRES_CONFIRMATION.has(input.type)) {
    return {
      autoApply: false,
      reason: 'Creating a record always requires confirmation, whatever the confidence.',
    };
  }

  if (phase === 1) {
    return {
      autoApply: false,
      reason: 'Every suggestion requires human confirmation at this stage of the product.',
    };
  }

  if (!input.workspaceOptedIn) {
    return { autoApply: false, reason: 'This workspace has not enabled any automatic actions.' };
  }

  const eligible = phase === 2 ? PHASE_2_ELIGIBLE : PHASE_3_ELIGIBLE;
  const minimum = phase === 2 ? PHASE_2_MIN_CONFIDENCE : PHASE_3_MIN_CONFIDENCE;

  if (!eligible.has(input.type)) {
    return { autoApply: false, reason: 'This action type is not eligible for automatic apply.' };
  }
  if (input.confidence < minimum) {
    return {
      autoApply: false,
      reason: `Confidence ${input.confidence.toFixed(2)} is below the ${minimum} bar for automatic apply.`,
    };
  }

  return { autoApply: true, reason: `Auto-applied under phase ${phase} policy — reversible in one click.` };
}

/** Surfaced in settings so the constraint is legible to admins, not just to us. */
export function autonomyPolicySummary(): {
  phase: AutonomyPhase;
  headline: string;
  detail: string;
} {
  return {
    phase: CURRENT_PHASE,
    headline: 'Every suggestion waits for you',
    detail:
      'Continuum never changes a record on its own. Suggestions are proposed, logged with their ' +
      'confidence and source, and applied only when someone confirms them. Later versions may let ' +
      'admins opt in to auto-applying the lowest-consequence suggestions above a very high ' +
      'confidence bar — and even then, everything stays logged, attributed, and reversible in one click.',
  };
}
