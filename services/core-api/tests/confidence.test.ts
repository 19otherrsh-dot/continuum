import { describe, expect, it } from 'vitest';
import { adjustConfidence, gate } from '../src/ai/confidence.js';

const thresholds = { high: 0.8, medium: 0.5 };

describe('confidence gate', () => {
  it('surfaces high-confidence proposals prominently', () => {
    const decision = gate(0.86, thresholds);
    expect(decision).toEqual({ persist: true, tier: 'HIGH', prominent: true });
  });

  it('records medium-confidence proposals without interrupting anyone', () => {
    const decision = gate(0.62, thresholds);
    expect(decision).toEqual({ persist: true, tier: 'MEDIUM', prominent: false });
  });

  /**
   * FR-AGENT-06. The point is not that low-confidence proposals are hidden —
   * it is that no row is created at all. A suggestion that exists but is
   * tucked away still costs the user attention the moment they open the log.
   */
  it('creates nothing at all below the lower threshold', () => {
    expect(gate(0.49, thresholds)).toEqual({ persist: false, reason: 'below_threshold' });
    expect(gate(0, thresholds)).toEqual({ persist: false, reason: 'below_threshold' });
  });

  it('treats a non-numeric score as no signal rather than as certainty', () => {
    expect(gate(Number.NaN, thresholds).persist).toBe(false);
  });

  it('respects a workspace that has tightened its thresholds', () => {
    const strict = { high: 0.95, medium: 0.9 };
    expect(gate(0.86, strict).persist).toBe(false);
    expect(gate(0.96, strict)).toEqual({ persist: true, tier: 'HIGH', prominent: true });
  });
});

describe('confidence adjustment', () => {
  it('nudges explicit statements from a known sender upward', () => {
    const score = adjustConfidence(0.75, { explicitStatement: true, knownSender: true });
    expect(score).toBeGreaterThan(0.75);
  });

  it('penalises thin content', () => {
    expect(adjustConfidence(0.8, { sparseContent: true })).toBeLessThan(0.7);
  });

  /**
   * Being told we were wrong on this account is stronger evidence than being
   * told we were right, so corrections should make the agent quieter faster
   * than confirmations make it bolder.
   */
  it('weighs prior corrections more heavily than prior confirmations', () => {
    const afterCorrections = adjustConfidence(0.85, { priorCorrections: 3 });
    const afterConfirmations = adjustConfidence(0.85, { priorConfirmations: 3 });

    expect(0.85 - afterCorrections).toBeGreaterThan(afterConfirmations - 0.85);
    expect(afterCorrections).toBeLessThan(0.8);
  });

  it('never escapes the 0..1 range', () => {
    expect(adjustConfidence(0.99, { explicitStatement: true, knownSender: true })).toBeLessThanOrEqual(1);
    expect(adjustConfidence(0.05, { sparseContent: true, priorCorrections: 5 })).toBeGreaterThanOrEqual(0);
  });
});
