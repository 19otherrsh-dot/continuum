import { Prisma } from '@prisma/client';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
const errorHandlerPlugin = async (app) => {
    app.setErrorHandler((error, request, reply) => {
        if (error instanceof AppError) {
            return reply
                .status(error.statusCode)
                .send({ error: { code: error.code, message: error.message, details: error.details } });
        }
        if (error instanceof ZodError) {
            return reply.status(400).send({
                error: {
                    code: 'validation_failed',
                    message: 'Request validation failed',
                    details: error.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message,
                    })),
                },
            });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // P2002 = unique violation. Several of these are load-bearing business
            // rules (one project per deal, one contact per email), so surface them
            // as conflicts rather than 500s.
            if (error.code === 'P2002') {
                const target = error.meta?.target?.join(', ') ?? 'field';
                return reply.status(409).send({
                    error: { code: 'conflict', message: `A record with that ${target} already exists` },
                });
            }
            if (error.code === 'P2025') {
                return reply
                    .status(404)
                    .send({ error: { code: 'not_found', message: 'Record not found' } });
            }
            if (error.code === 'P2003') {
                return reply.status(400).send({
                    error: { code: 'bad_request', message: 'Referenced record does not exist' },
                });
            }
        }
        const fallback = error;
        if (fallback.statusCode === 429) {
            return reply
                .status(429)
                .send({ error: { code: 'rate_limited', message: fallback.message ?? 'Rate limited' } });
        }
        request.log.error({ err: error }, 'Unhandled error');
        return reply
            .status(500)
            .send({ error: { code: 'internal_error', message: 'Something went wrong' } });
    });
    app.setNotFoundHandler((request, reply) => {
        reply
            .status(404)
            .send({
            error: { code: 'not_found', message: `No route for ${request.method} ${request.url}` },
        });
    });
};
export default fp(errorHandlerPlugin, { name: 'error-handler' });
