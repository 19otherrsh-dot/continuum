import { placeCallSchema } from '@continuum/shared';
import { config } from '../../config.js';
import { prisma } from '../../db/client.js';
import { orgId, runWithContext } from '../../db/context.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { enrichActivity } from '../../ingestion/pipeline.js';
import { getTelephonyProvider } from '../../providers/index.js';
import { serializeActivity } from '../common/serializers.js';
import { touchDealActivity } from '../deals/service.js';
export const callRoutes = async (app) => {
    /**
     * Consent lookup for a number, so the UI can tell the rep what will happen
     * *before* they press call rather than after (FR-PIPE-04).
     */
    app.get('/calls/consent', { preHandler: [app.requireAuth] }, async (request) => {
        const { number } = request.query;
        if (!number)
            throw badRequest('number is required');
        const { regime, region } = getTelephonyProvider().consentRegimeFor(number);
        return {
            regime,
            region,
            requiresPrompt: regime !== 'ONE_PARTY',
            message: regime === 'ONE_PARTY'
                ? 'This call will be recorded and transcribed.'
                : regime === 'TWO_PARTY'
                    ? 'This number is in an all-party consent region. The call will open with a recording notice, and recording starts only after it plays.'
                    : 'We could not determine the consent rules for this number, so it will be treated as all-party: a recording notice plays first.',
        };
    });
    /**
     * Places a call through the integrated provider without leaving the app
     * (FR-PIPE-03), and logs it the moment it resolves.
     */
    app.post('/calls', { preHandler: [app.requireAuth] }, async (request, reply) => {
        const input = placeCallSchema.parse(request.body);
        const ctx = request.ctx;
        const contact = await prisma.contact.findFirst({ where: { id: input.contactId } });
        if (!contact)
            throw notFound('Contact');
        const toNumber = input.toNumber ?? contact.phone;
        if (!toNumber)
            throw badRequest('This contact has no phone number on file');
        const telephony = getTelephonyProvider();
        const { regime } = telephony.consentRegimeFor(toNumber);
        // Unknown jurisdictions are treated as all-party. Recording someone who
        // did not consent is the failure worth designing against.
        const requireConsentPrompt = regime !== 'ONE_PARTY';
        const result = await telephony.placeCall({
            to: toNumber,
            requireConsentPrompt,
            record: true,
            callbackUrl: `${config.publicBaseUrl}/api/v1/calls/webhook`,
        });
        // A call that rang out is logged as an attempt, never as a conversation —
        // otherwise the pipeline reads healthier than it is (Epic C edge case).
        const connected = result.outcome === 'CONNECTED';
        const activity = await prisma.activity.create({
            data: {
                organizationId: orgId(),
                type: 'CALL',
                direction: 'OUTBOUND',
                subject: connected
                    ? `Call with ${contact.firstName ?? contact.email}`
                    : `Call attempted — ${describeOutcome(result.outcome)}`,
                body: result.transcript ?? '',
                transcript: result.transcript,
                occurredAt: new Date(),
                source: 'HUMAN',
                durationSeconds: result.durationSeconds,
                callOutcome: result.outcome,
                recordingUrl: result.recordingUrl,
                externalCallId: result.externalCallId,
                // Nothing to summarize when no conversation took place.
                summaryStatus: connected && result.transcript ? 'PENDING' : 'SKIPPED',
                participants: { create: [{ contactId: contact.id }] },
                links: {
                    create: [
                        ...(input.dealId
                            ? [{ entityType: 'DEAL', entityId: input.dealId, isPrimary: true }]
                            : []),
                        { entityType: 'CONTACT', entityId: contact.id, isPrimary: !input.dealId },
                    ],
                },
            },
            include: { participants: { include: { contact: true } } },
        });
        if (input.dealId)
            await touchDealActivity(input.dealId, activity.occurredAt);
        // Transcript summarization runs through the same pipeline as email, so a
        // call and a message look the same on the timeline (FR-AC-10).
        if (activity.summaryStatus === 'PENDING') {
            setImmediate(() => {
                void runWithContext(ctx, () => enrichActivity(activity.id)).catch(() => undefined);
            });
        }
        return reply.status(201).send({
            activity: serializeActivity(activity),
            outcome: result.outcome,
            consentRegime: regime,
            consentPromptPlayed: requireConsentPrompt,
        });
    });
    /**
     * Provider status webhook. Public — the telephony provider has no session —
     * and idempotent, since providers retry.
     */
    app.post('/calls/webhook', async (request, reply) => {
        const body = (request.body ?? {});
        const callSid = body.CallSid ?? body.callSid;
        if (!callSid)
            return reply.status(200).send({ ok: true });
        const activity = await prisma.activity.findFirst({
            where: { externalCallId: callSid },
            select: { id: true, organizationId: true, summaryStatus: true },
        });
        // An event for a call whose activity was deleted is logged and dropped —
        // never retried indefinitely.
        if (!activity)
            return reply.status(200).send({ ok: true, matched: false });
        const status = (body.CallStatus ?? '').toLowerCase();
        const outcome = status === 'completed'
            ? 'CONNECTED'
            : status === 'no-answer' || status === 'busy'
                ? 'ATTEMPTED_NO_CONNECT'
                : status === 'failed'
                    ? 'FAILED'
                    : null;
        const recordingUrl = body.RecordingUrl ?? null;
        const duration = Number.parseInt(body.CallDuration ?? '0', 10);
        const ctx = {
            organizationId: activity.organizationId,
            userId: null,
            userName: 'Calling',
            role: null,
            actorType: 'SYSTEM',
        };
        await runWithContext(ctx, async () => {
            let transcript = null;
            if (recordingUrl) {
                transcript = await getTelephonyProvider().transcribe(recordingUrl).catch(() => null);
            }
            await prisma.activity.update({
                where: { id: activity.id },
                data: {
                    ...(outcome ? { callOutcome: outcome } : {}),
                    ...(Number.isFinite(duration) && duration > 0 ? { durationSeconds: duration } : {}),
                    ...(recordingUrl ? { recordingUrl } : {}),
                    ...(transcript ? { transcript, body: transcript, summaryStatus: 'PENDING' } : {}),
                },
            });
            if (transcript)
                await enrichActivity(activity.id);
        });
        return reply.status(200).send({ ok: true });
    });
};
function describeOutcome(outcome) {
    switch (outcome) {
        case 'ATTEMPTED_NO_CONNECT':
            return 'no answer';
        case 'VOICEMAIL':
            return 'voicemail';
        case 'FAILED':
            return 'failed to connect';
        default:
            return outcome.toLowerCase();
    }
}
