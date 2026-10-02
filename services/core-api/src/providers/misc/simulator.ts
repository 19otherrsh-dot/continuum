import { randomUUID } from 'node:crypto';
import type { ESignProvider, SlackProvider } from '../types.js';

/**
 * Simulator implementations for the notification and e-signature providers.
 *
 * Both record what they were asked to do in memory so the demo UI and the
 * journey harness can assert on it without a network round trip.
 */

export interface SentSlackMessage {
  channel: string;
  title: string;
  body: string;
  url?: string;
  sentAt: Date;
}

export class SimulatorSlackProvider implements SlackProvider {
  readonly id = 'simulator';
  static sent: SentSlackMessage[] = [];

  async notify(options: {
    channel: string;
    title: string;
    body: string;
    url?: string;
  }): Promise<void> {
    SimulatorSlackProvider.sent.push({ ...options, sentAt: new Date() });
  }

  static reset(): void {
    SimulatorSlackProvider.sent = [];
  }
}

interface SimulatedEnvelope {
  externalRef: string;
  status: string;
  signedAt: Date | null;
  signerEmail: string;
  title: string;
}

export class SimulatorESignProvider implements ESignProvider {
  readonly id = 'simulator';
  private static envelopes = new Map<string, SimulatedEnvelope>();

  async send(options: {
    title: string;
    body: string;
    signerEmail: string;
    signerName: string;
  }): Promise<{ externalRef: string; status: string }> {
    const externalRef = `sim-env-${randomUUID()}`;
    SimulatorESignProvider.envelopes.set(externalRef, {
      externalRef,
      status: 'SENT',
      signedAt: null,
      signerEmail: options.signerEmail,
      title: options.title,
    });
    return { externalRef, status: 'SENT' };
  }

  async status(externalRef: string): Promise<{ status: string; signedAt: Date | null }> {
    const envelope = SimulatorESignProvider.envelopes.get(externalRef);
    if (!envelope) return { status: 'UNKNOWN', signedAt: null };
    return { status: envelope.status, signedAt: envelope.signedAt };
  }

  /** Used by the demo endpoint to simulate the counterparty signing. */
  static markSigned(externalRef: string): boolean {
    const envelope = SimulatorESignProvider.envelopes.get(externalRef);
    if (!envelope) return false;
    envelope.status = 'SIGNED';
    envelope.signedAt = new Date();
    return true;
  }

  static reset(): void {
    SimulatorESignProvider.envelopes.clear();
  }
}
