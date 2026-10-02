import bcrypt from 'bcryptjs';
import { loginSchema, signupSchema } from '@continuum/shared';
import { track } from '../../analytics/events.js';
import { prisma } from '../../db/client.js';
import { runUnscoped, runWithContext } from '../../db/context.js';
import { conflict, rateLimited, unauthorized } from '../../lib/errors.js';
import { checkLoginAttempts, clearLoginAttempts } from '../../plugins/auth.js';
import { serializeUser } from '../common/serializers.js';
import { createDefaultPipeline, showProjectsFor } from '../workspace/bootstrap.js';
export const authRoutes = async (app) => {
    /**
     * Signup creates the workspace, its first admin, and a usable default
     * pipeline in one transaction. The user lands on a working product, not a
     * setup wizard.
     */
    app.post('/auth/signup', async (request, reply) => {
        const input = signupSchema.parse(request.body);
        // Cross-tenant check: is this email already registered anywhere?
        const existing = await runUnscoped(() => prisma.user.findFirst({ where: { email: input.email.toLowerCase() } }));
        if (existing)
            throw conflict('An account with that email already exists');
        const organization = await runUnscoped(() => prisma.organization.create({
            data: {
                name: input.organizationName,
                motion: input.motion,
                showProjectsUi: showProjectsFor(input.motion),
                seatCount: 1,
            },
        }));
        const passwordHash = await bcrypt.hash(input.password, 10);
        const user = await runWithContext({
            organizationId: organization.id,
            userId: null,
            userName: input.name,
            role: 'ADMIN',
            actorType: 'SYSTEM',
        }, async () => {
            const created = await prisma.user.create({
                data: {
                    organizationId: organization.id,
                    email: input.email.toLowerCase(),
                    passwordHash,
                    name: input.name,
                    role: 'ADMIN',
                },
            });
            await createDefaultPipeline(input.motion);
            await track('signup_completed', { motion: input.motion });
            return created;
        });
        const token = app.jwt.sign({
            sub: user.id,
            org: organization.id,
            role: user.role,
            name: user.name,
        });
        return reply.status(201).send({
            token,
            user: serializeUser(user),
            organization: {
                id: organization.id,
                name: organization.name,
                motion: organization.motion,
                showProjectsUi: organization.showProjectsUi,
            },
        });
    });
    app.post('/auth/login', async (request, reply) => {
        const input = loginSchema.parse(request.body);
        // Guessing a password is the one unauthenticated operation worth rate
        // limiting, and it was previously ungated entirely.
        const attempts = checkLoginAttempts(request.ip, input.email);
        if (!attempts.allowed) {
            const retryAfter = Math.ceil((attempts.resetAt - Date.now()) / 1000);
            reply.header('Retry-After', String(retryAfter));
            throw rateLimited('Too many sign-in attempts. Try again shortly.');
        }
        const user = await runUnscoped(() => prisma.user.findFirst({
            where: { email: input.email.toLowerCase() },
            include: { organization: true },
        }));
        // Same error for unknown email and wrong password — the response must not
        // reveal whether an account exists.
        if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
            throw unauthorized('Incorrect email or password');
        }
        clearLoginAttempts(input.email);
        const token = app.jwt.sign({
            sub: user.id,
            org: user.organizationId,
            role: user.role,
            name: user.name,
        });
        return {
            token,
            user: serializeUser(user),
            organization: {
                id: user.organization.id,
                name: user.organization.name,
                motion: user.organization.motion,
                showProjectsUi: user.organization.showProjectsUi,
            },
        };
    });
    /** Current session — used by the web app to rehydrate on load. */
    app.get('/auth/me', { preHandler: [app.requireAuth] }, async (request) => {
        const ctx = request.ctx;
        const organization = await prisma.organization.findUniqueOrThrow({
            where: { id: ctx.organizationId },
        });
        const user = ctx.userId
            ? await prisma.user.findUnique({ where: { id: ctx.userId } })
            : null;
        return {
            user: user ? serializeUser(user) : null,
            organization: {
                id: organization.id,
                name: organization.name,
                motion: organization.motion,
                showProjectsUi: organization.showProjectsUi,
                stallingThresholdDays: organization.stallingThresholdDays,
                agentHighThreshold: organization.agentHighThreshold,
                agentMediumThreshold: organization.agentMediumThreshold,
                planName: organization.planName,
                seatCount: organization.seatCount,
                pricePerSeatCents: organization.pricePerSeatCents,
            },
        };
    });
};
