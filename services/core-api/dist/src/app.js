import cors from '@fastify/cors';
import Fastify from 'fastify';
import { config } from './config.js';
import authPlugin from './plugins/auth.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import { activityRoutes } from './modules/activities/routes.js';
import { agentActionRoutes } from './modules/agent-actions/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { callRoutes } from './modules/calls/routes.js';
import { companyRoutes } from './modules/companies/routes.js';
import { contactRoutes } from './modules/contacts/routes.js';
import { dealRoutes } from './modules/deals/routes.js';
import { integrationRoutes } from './modules/integrations/routes.js';
import { mcpRoutes } from './modules/mcp/routes.js';
import { notificationRoutes } from './modules/notifications/routes.js';
import { pipelineRoutes } from './modules/pipelines/routes.js';
import { projectRoutes } from './modules/projects/routes.js';
import { proposalRoutes, proposalWebhookRoutes } from './modules/proposals/routes.js';
import { metricsRoutes } from './modules/reports/metrics.js';
import { reportRoutes } from './modules/reports/routes.js';
import { searchRoutes } from './modules/search/routes.js';
import { settingsRoutes } from './modules/settings/routes.js';
import { taskRoutes } from './modules/tasks/routes.js';
function safeJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return {};
    }
}
export async function buildApp() {
    const app = Fastify({
        logger: {
            level: config.env === 'test' ? 'silent' : 'info',
            transport: config.env === 'development'
                ? {
                    target: 'pino-pretty',
                    options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
                }
                : undefined,
        },
        // Call transcripts and provider webhooks can be large.
        bodyLimit: 10 * 1024 * 1024,
    });
    await app.register(errorHandlerPlugin);
    await app.register(cors, { origin: [config.webOrigin], credentials: true });
    /**
     * Telephony providers post status callbacks as form-encoded data, not JSON,
     * so the webhook needs its own parser.
     */
    app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_request, body, done) => {
        try {
            done(null, Object.fromEntries(new URLSearchParams(body)));
        }
        catch (error) {
            done(error, undefined);
        }
    });
    /**
     * Action endpoints that take no body (sync-now, mark-read, confirm) are
     * legitimately called with an empty request. Treating that as an empty object
     * rather than 415 keeps them usable from any HTTP client.
     */
    app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
        const text = body?.trim();
        if (!text)
            return done(null, {});
        try {
            done(null, JSON.parse(text));
        }
        catch {
            done(Object.assign(new Error('Request body is not valid JSON'), { statusCode: 400 }), undefined);
        }
    });
    // A POST with no Content-Type at all reaches the default parser, which would
    // otherwise reject it as unsupported media.
    app.addContentTypeParser('text/plain', { parseAs: 'string' }, (_request, body, done) => {
        const text = body?.trim();
        done(null, text ? safeJson(text) : {});
    });
    await app.register(authPlugin);
    app.get('/health', async () => ({
        status: 'ok',
        providerMode: config.providerMode,
        ai: config.ai.enabled ? 'claude' : 'local-fallback',
    }));
    await app.register(async (api) => {
        // Unauthenticated: signup, login, provider callbacks and webhooks.
        await api.register(authRoutes);
        await api.register(integrationRoutes);
        await api.register(callRoutes);
        await api.register(proposalWebhookRoutes);
        await api.register(notificationRoutes);
        // Authenticated resource routes. Each registers its own auth hook so the
        // few public endpoints above stay genuinely public.
        await api.register(companyRoutes);
        await api.register(contactRoutes);
        await api.register(dealRoutes);
        await api.register(activityRoutes);
        await api.register(taskRoutes);
        await api.register(projectRoutes);
        await api.register(agentActionRoutes);
        await api.register(pipelineRoutes);
        await api.register(reportRoutes);
        await api.register(metricsRoutes);
        await api.register(searchRoutes);
        await api.register(settingsRoutes);
        await api.register(proposalRoutes);
        await api.register(mcpRoutes);
    }, { prefix: '/api/v1' });
    return app;
}
