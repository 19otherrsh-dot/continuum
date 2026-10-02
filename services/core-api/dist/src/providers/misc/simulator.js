import { randomUUID } from 'node:crypto';
export class SimulatorSlackProvider {
    id = 'simulator';
    static sent = [];
    async notify(options) {
        SimulatorSlackProvider.sent.push({ ...options, sentAt: new Date() });
    }
    static reset() {
        SimulatorSlackProvider.sent = [];
    }
}
export class SimulatorESignProvider {
    id = 'simulator';
    static envelopes = new Map();
    async send(options) {
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
    async status(externalRef) {
        const envelope = SimulatorESignProvider.envelopes.get(externalRef);
        if (!envelope)
            return { status: 'UNKNOWN', signedAt: null };
        return { status: envelope.status, signedAt: envelope.signedAt };
    }
    /** Used by the demo endpoint to simulate the counterparty signing. */
    static markSigned(externalRef) {
        const envelope = SimulatorESignProvider.envelopes.get(externalRef);
        if (!envelope)
            return false;
        envelope.status = 'SIGNED';
        envelope.signedAt = new Date();
        return true;
    }
    static reset() {
        SimulatorESignProvider.envelopes.clear();
    }
}
