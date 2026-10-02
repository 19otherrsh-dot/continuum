import fastifyJwt from '@fastify/jwt';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { UserRole } from '@continuum/shared';
import { API_RATE_LIMIT_PER_MINUTE } from '@continuum/shared';
import { config } from '../config.js';
import { prisma } from '../db/client.js';
import { runUnscoped, runWithContext, type RequestContext } from '../db/context.js';
import { hashToken } from '../lib/crypto.js';
import { forbidden, rateLimited, unauthorized } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Present once the request has been authenticated. */
    ctx?: RequestContext;
    rateLimitInfo?: { remaining: number; resetAt: number };
  }
  interface FastifyInstance {
    /** Route guard: 401 unless the request carries a valid session or API token. */
    requireAuth: (request: FastifyRequest) => Promise<void>;
  }
}

interface JwtPayload {
  sub: string;
  org: string;
  role: UserRole;
  name: string;
}

/**
 * In-process token bucket for the public API (FR-API-01). Standard headers are
 * always emitted; requests below the limit are never throttled.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Expired windows are swept lazily rather than left to accumulate. Without
 * this the map grows one entry per distinct token or client address for the
 * process lifetime.
 */
function sweepExpired(now: number): void {
  if (buckets.size < 1_000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function consumeRateLimit(key: string, limit = API_RATE_LIMIT_PER_MINUTE, windowMs = 60_000) {
  const now = Date.now();
  sweepExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

/**
 * Login attempt limiting.
 *
 * The API rate limiter only ever engaged for `ctm_` tokens, which left the one
 * unauthenticated endpoint that guesses a secret completely ungated.
 *
 * Counted per client address *and* per account: address alone lets a botnet
 * spread attempts across IPs, and account alone lets one attacker lock out a
 * real user. A failure trips both counters; a success clears the account's.
 */
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60_000;

export function checkLoginAttempts(ip: string, email: string): { allowed: boolean; resetAt: number } {
  const byIp = consumeRateLimit(`login-ip:${ip}`, LOGIN_MAX_ATTEMPTS * 3, LOGIN_WINDOW_MS);
  const byAccount = consumeRateLimit(
    `login-account:${email.toLowerCase()}`,
    LOGIN_MAX_ATTEMPTS,
    LOGIN_WINDOW_MS,
  );

  return {
    allowed: byIp.allowed && byAccount.allowed,
    resetAt: Math.max(byIp.resetAt, byAccount.resetAt),
  };
}

/** Clears an account's counter after a successful sign-in. */
export function clearLoginAttempts(email: string): void {
  buckets.delete(`login-account:${email.toLowerCase()}`);
}

/**
 * `lastUsedAt` is a coarse "is this token still in use?" signal, not an audit
 * log — the audit trail is a separate table. Writing it on every call put a
 * database write in front of every API request and hammered one row at the
 * documented 300 req/min. Once a minute is ample for the question it answers.
 */
const LAST_USED_WRITE_INTERVAL_MS = 60_000;

async function resolveApiToken(raw: string): Promise<RequestContext | null> {
  // Runs unscoped: the tenant is unknown until the token resolves.
  const record = await runUnscoped(() =>
    prisma.apiToken.findUnique({ where: { tokenHash: hashToken(raw) } }),
  );
  if (!record || record.revokedAt) return null;

  const stale =
    !record.lastUsedAt ||
    Date.now() - record.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS;

  if (stale) {
    await runUnscoped(() =>
      prisma.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }),
    );
  }

  return {
    organizationId: record.organizationId,
    userId: null,
    userName: `API token: ${record.name}`,
    role: 'ADMIN',
    actorType: 'HUMAN',
  };
}

const authPlugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: '30d' },
  });

  /**
   * Resolve the caller. Unauthenticated requests are allowed through here and
   * rejected later by `requireAuth` on the routes that need it, so public
   * endpoints (signup, login, health, provider webhooks) stay simple.
   */
  app.addHook('onRequest', async (request, reply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return;
    const token = header.slice('Bearer '.length).trim();

    if (token.startsWith('ctm_')) {
      const limit = consumeRateLimit(token.slice(0, 16));
      reply.header('X-RateLimit-Limit', String(API_RATE_LIMIT_PER_MINUTE));
      reply.header('X-RateLimit-Remaining', String(limit.remaining));
      reply.header('X-RateLimit-Reset', String(Math.ceil(limit.resetAt / 1000)));
      if (!limit.allowed) {
        reply.header('Retry-After', String(Math.ceil((limit.resetAt - Date.now()) / 1000)));
        throw rateLimited(`Rate limit of ${API_RATE_LIMIT_PER_MINUTE} requests/minute exceeded`);
      }
      const ctx = await resolveApiToken(token);
      if (!ctx) throw unauthorized('Invalid or revoked API token');
      request.ctx = ctx;
      return;
    }

    try {
      const payload = await request.jwtVerify<JwtPayload>();
      request.ctx = {
        organizationId: payload.org,
        userId: payload.sub,
        userName: payload.name,
        role: payload.role,
        actorType: 'HUMAN',
      };
    } catch {
      throw unauthorized('Invalid or expired session');
    }
  });

  /**
   * Enter the tenant-scoped async context for the remainder of the request.
   *
   * This hook is deliberately callback-style: calling `done()` *inside*
   * AsyncLocalStorage.run() is what makes the store propagate through every
   * subsequent hook and the route handler. An async hook would exit the store
   * as soon as it returned, and the Prisma extension would then refuse every
   * query for lack of context.
   */
  app.addHook('onRequest', (request, _reply, done) => {
    if (!request.ctx) {
      done();
      return;
    }
    runWithContext(request.ctx, () => done());
  });

  app.decorate('requireAuth', async (request: FastifyRequest) => {
    if (!request.ctx) throw unauthorized();
  });
};

const RANK: Record<UserRole, number> = { MEMBER: 0, MANAGER: 1, ADMIN: 2 };

/** Route guard for role-gated actions (FR-PERM-02). */
export function requireRole(minimum: UserRole) {
  return async (request: FastifyRequest) => {
    if (!request.ctx) throw unauthorized();
    const role = request.ctx.role;
    if (!role || RANK[role] < RANK[minimum]) {
      throw forbidden(`This action requires the ${minimum.toLowerCase()} role or higher`);
    }
  };
}

export function hasAtLeast(role: UserRole | null, minimum: UserRole): boolean {
  return role !== null && RANK[role] >= RANK[minimum];
}

export default fp(authPlugin, { name: 'auth' });
