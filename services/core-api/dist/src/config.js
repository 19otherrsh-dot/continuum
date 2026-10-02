import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The repo keeps a single .env at the root so the API, the worker, and the
// Prisma CLI all read the same values.
const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, '../../../.env') });
function str(key, fallback = '') {
    return process.env[key]?.trim() || fallback;
}
function int(key, fallback) {
    const parsed = Number.parseInt(process.env[key] ?? '', 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
export const config = {
    env: str('NODE_ENV', 'development'),
    isProduction: str('NODE_ENV', 'development') === 'production',
    port: int('PORT', 3001),
    databaseUrl: str('DATABASE_URL'),
    jwtSecret: str('JWT_SECRET', 'dev-only-change-me'),
    webOrigin: str('WEB_ORIGIN', 'http://localhost:5173'),
    publicBaseUrl: str('PUBLIC_BASE_URL', `http://localhost:${int('PORT', 3001)}`),
    /**
     * `simulator` runs the whole product against deterministic fixture providers
     * with no credentials. `live` selects the real Google/Microsoft/Twilio/e-sign
     * adapters. Both implement the same interfaces, so nothing above the adapter
     * layer knows which is active.
     */
    providerMode: (str('PROVIDER_MODE', 'simulator') === 'live'
        ? 'live'
        : 'simulator'),
    google: {
        clientId: str('GOOGLE_CLIENT_ID'),
        clientSecret: str('GOOGLE_CLIENT_SECRET'),
        redirectUri: str('GOOGLE_REDIRECT_URI', 'http://localhost:3001/api/v1/integrations/google/callback'),
    },
    microsoft: {
        clientId: str('MICROSOFT_CLIENT_ID'),
        clientSecret: str('MICROSOFT_CLIENT_SECRET'),
        tenantId: str('MICROSOFT_TENANT_ID', 'common'),
        redirectUri: str('MICROSOFT_REDIRECT_URI', 'http://localhost:3001/api/v1/integrations/microsoft/callback'),
    },
    twilio: {
        accountSid: str('TWILIO_ACCOUNT_SID'),
        authToken: str('TWILIO_AUTH_TOKEN'),
        fromNumber: str('TWILIO_FROM_NUMBER'),
    },
    slack: {
        botToken: str('SLACK_BOT_TOKEN'),
    },
    esign: {
        apiKey: str('DROPBOX_SIGN_API_KEY'),
    },
    ai: {
        apiKey: str('ANTHROPIC_API_KEY'),
        model: str('CONTINUUM_AI_MODEL', 'claude-opus-5'),
        /**
         * With no key the product falls back to a deterministic local summarizer.
         * That fallback is intentionally conservative rather than fake-smart: it
         * produces extractive summaries and low confidence scores, so the agent
         * stays silent instead of guessing.
         */
        get enabled() {
            return str('ANTHROPIC_API_KEY').length > 0;
        },
    },
    tokenEncryptionKey: str('TOKEN_ENCRYPTION_KEY', 'ZGV2LW9ubHktaW5zZWN1cmUta2V5LTMyLWJ5dGVzISE='),
};
export function assertConfig() {
    if (!config.databaseUrl) {
        throw new Error('DATABASE_URL is not set. Copy .env.example to .env at the repo root.');
    }
    if (config.isProduction && config.jwtSecret === 'dev-only-change-me') {
        throw new Error('JWT_SECRET must be set to a real value in production.');
    }
}
