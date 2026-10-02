import type { FastifyPluginAsync } from 'fastify';
import { sendProposalSchema } from '@continuum/shared';
import { prisma } from '../../db/client.js';
import { orgId } from '../../db/context.js';
import { displayName } from '../../lib/email.js';
import { notFound } from '../../lib/errors.js';
import { getESignProvider } from '../../providers/index.js';

/**
 * Proposal generation and e-signature (Epic E).
 *
 * Sending ships at V1. Reflecting signature status onto the deal without a
 * manual update is FR-INT-04, which is P1 — so `refresh` here polls the
 * provider on request rather than driving deal state on its own.
 */
export const proposalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.requireAuth);

  app.get('/proposals', async (request) => {
    const { dealId } = request.query as { dealId?: string };
    const rows = await prisma.proposal.findMany({
      where: dealId ? { dealId } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { data: rows };
  });

  app.post('/proposals', async (request, reply) => {
    const input = sendProposalSchema.parse(request.body);

    const deal = await prisma.deal.findFirst({ where: { id: input.dealId } });
    if (!deal) throw notFound('Deal');

    const signer = await prisma.contact.findFirst({ where: { id: input.signerContactId } });
    if (!signer) throw notFound('Signer contact');

    const provider = getESignProvider();
    const sent = await provider.send({
      title: input.title,
      body: input.body,
      signerEmail: signer.email,
      signerName: displayName(signer.firstName, signer.lastName, signer.email),
    });

    const proposal = await prisma.proposal.create({
      data: {
        organizationId: orgId(),
        dealId: input.dealId,
        title: input.title,
        body: input.body,
        signerContactId: signer.id,
        externalRef: sent.externalRef,
        status: sent.status,
        sentAt: new Date(),
      },
    });

    return reply.status(201).send(proposal);
  });

  app.post('/proposals/:id/refresh', async (request) => {
    const { id } = request.params as { id: string };
    const proposal = await prisma.proposal.findFirst({ where: { id } });
    if (!proposal) throw notFound('Proposal');
    if (!proposal.externalRef) return proposal;

    const status = await getESignProvider().status(proposal.externalRef);
    return prisma.proposal.update({
      where: { id },
      data: { status: status.status, signedAt: status.signedAt },
    });
  });

};

/**
 * Provider webhook — registered outside the authenticated scope, since the
 * e-signature provider has no session.
 *
 * Tolerant by design: an event for a proposal whose deal has since been
 * deleted is acknowledged and dropped rather than erroring the integration
 * into a retry loop (Epic E edge case).
 */
export const proposalWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.post('/proposals/webhook', async (request, reply) => {
    const body = (request.body ?? {}) as {
      signature_request?: { signature_request_id?: string; is_complete?: boolean };
      externalRef?: string;
      status?: string;
    };

    const externalRef = body.signature_request?.signature_request_id ?? body.externalRef;
    if (!externalRef) return reply.status(200).send({ ok: true });

    const proposal = await prisma.proposal.findFirst({ where: { externalRef } });
    if (!proposal) {
      // Logged and acknowledged. Returning non-200 here would make the
      // provider retry an event that can never succeed.
      request.log.info({ externalRef }, 'Signature event for unknown proposal — ignoring');
      return reply.status(200).send({ ok: true, matched: false });
    }

    const complete = body.signature_request?.is_complete ?? body.status === 'SIGNED';
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: complete ? 'SIGNED' : (body.status ?? proposal.status),
        signedAt: complete ? new Date() : proposal.signedAt,
      },
    });

    return reply.status(200).send({ ok: true });
  });
};
