import type { ConfidenceTier } from '@continuum/shared';

export interface ThresholdConfig {
  high: number;
  medium: number;
}

export type GateDecision =
  | { persist: true; tier: ConfidenceTier; prominent: boolean }
  | { persist: false; reason: 'below_threshold' };

/**
 * The three-tier confidence gate (PRD §25.1).
 *
 *   >= high      HIGH   — pending proposal, surfaced prominently on the record
 *   medium..high MEDIUM — pending proposal, visible in the Agent Action Log only
 *   <  medium    dropped entirely — no AgentAction row is created
 *
 * The bottom tier is the one that matters. FR-AGENT-06 says silence is
 * preferred to a low-confidence guess, and the way to honour that is to not
 * write the record at all: a proposal that exists but is hidden still costs
 * the user attention the moment they open the log.
 *
 * Note what is *not* gated — the Activity and its summary are written
 * regardless. A quiet agent still leaves a complete timeline.
 */
export function gate(confidence: number, thresholds: ThresholdConfig): GateDecision {
  if (!Number.isFinite(confidence) || confidence < thresholds.medium) {
    return { persist: false, reason: 'below_threshold' };
  }
  if (confidence >= thresholds.high) {
    return { persist: true, tier: 'HIGH', prominent: true };
  }
  return { persist: true, tier: 'MEDIUM', prominent: false };
}

/**
 * Signals that adjust a raw model confidence before gating.
 *
 * These are the "what determines confidence" weights from PRD §25.2, applied
 * as a bounded multiplier so a strong prior cannot manufacture certainty the
 * underlying evidence does not support.
 */
export interface ConfidenceSignals {
  /** The statement was explicit rather than inferred. */
  explicitStatement?: boolean;
  /** We have confirmed proposals of this type on this account before. */
  priorConfirmations?: number;
  /** The user has previously corrected this kind of inference on this account. */
  priorCorrections?: number;
  /** Sender is a known contact rather than an unrecognised address. */
  knownSender?: boolean;
  /** Content was thin — a one-line reply carries less evidence. */
  sparseContent?: boolean;

  /**
   * Where the signal came from. A call transcript is inherently noisier than
   * clean email text — the same sentence carries less evidential weight when a
   * speech-to-text pass may have produced it (§25.2).
   */
  sourceKind?: 'EMAIL' | 'CALL' | 'MEETING' | 'NOTE';

  /**
   * Whether the proposal runs with or against the record's existing
   * trajectory. A stage advance on a deal that has been moving steadily
   * forward is more credible than the same advance on one with no prior
   * positive signal (§25.2).
   */
  trajectory?: 'CONSISTENT' | 'NEUTRAL' | 'CONTRADICTORY';
}

/**
 * Applies the §25.2 signals as bounded adjustments to the model's own score.
 *
 * Bounded is the operative word: these are priors about how much to trust a
 * reading, and a strong prior must not be able to manufacture certainty the
 * underlying evidence does not support. The largest single downward adjustment
 * therefore outweighs the largest upward one — it should always be easier for
 * this function to make the agent quieter than louder.
 */
export function adjustConfidence(base: number, signals: ConfidenceSignals): number {
  let score = base;

  if (signals.explicitStatement) score += 0.05;
  if (signals.knownSender) score += 0.03;
  if (signals.sparseContent) score -= 0.15;

  // Source reliability. Transcription errors turn "we won't sign this quarter"
  // into "we will sign this quarter" more easily than a typo does.
  if (signals.sourceKind === 'CALL') score -= 0.07;
  else if (signals.sourceKind === 'MEETING') score -= 0.03;

  // Consistency with where the record has been heading.
  if (signals.trajectory === 'CONSISTENT') score += 0.04;
  else if (signals.trajectory === 'CONTRADICTORY') score -= 0.12;

  // Corrections are weighted more heavily than confirmations: being told we
  // were wrong on this account is stronger evidence than being told we were
  // right, and should make the agent quieter rather than more assertive.
  score += Math.min(0.06, (signals.priorConfirmations ?? 0) * 0.02);
  score -= Math.min(0.25, (signals.priorCorrections ?? 0) * 0.08);

  return Math.max(0, Math.min(1, score));
}

/**
 * Reads a deal's recent history to decide whether a forward-moving proposal
 * runs with or against its trajectory.
 */
export function trajectoryFrom(input: {
  recentSentiments: (('POSITIVE' | 'NEUTRAL' | 'NEGATIVE') | null)[];
  isStalling: boolean;
  advancing: boolean;
}): NonNullable<ConfidenceSignals['trajectory']> {
  if (!input.advancing) return 'NEUTRAL';

  const positives = input.recentSentiments.filter((s) => s === 'POSITIVE').length;
  const negatives = input.recentSentiments.filter((s) => s === 'NEGATIVE').length;

  // A deal nobody has heard from, or one trending negative, is a poor
  // candidate for an advance no matter how the latest message reads.
  if (input.isStalling || negatives > positives) return 'CONTRADICTORY';
  if (positives > 0 && negatives === 0) return 'CONSISTENT';
  return 'NEUTRAL';
}

/**
 * Qualitative label for display (§25.3, tenet 38).
 *
 * The UI shows this rather than a raw percentage: "86%" implies a calibration
 * the model does not have, and invites users to reason about a difference
 * between 86% and 84% that carries no real information.
 */
export function confidenceLabel(tier: ConfidenceTier): string {
  return tier === 'HIGH' ? 'Strong signal' : 'Worth checking';
}
