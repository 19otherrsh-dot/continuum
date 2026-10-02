import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { config } from '../config.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

function key(): Buffer {
  const raw = Buffer.from(config.tokenEncryptionKey, 'base64');
  if (raw.length !== 32) {
    // Accept a short dev key by stretching it rather than failing to boot,
    // but never in production where a weak key is a real exposure.
    if (config.isProduction) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be exactly 32 bytes, base64-encoded.');
    }
    return createHash('sha256').update(config.tokenEncryptionKey).digest();
  }
  return raw;
}

/**
 * Encrypt under an explicitly supplied key. Format: iv.tag.ciphertext (base64).
 *
 * Used by the envelope-encryption path below, where the key is a per-tenant
 * data key rather than the application master key.
 */
export function encryptWith(plaintext: string, dataKey: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, dataKey, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptWith(payload: string, dataKey: Buffer): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed encrypted value');
  }
  const decipher = createDecipheriv(ALGORITHM, dataKey, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** Mints a fresh 256-bit data key for a new organization. */
export function generateDataKey(): Buffer {
  return randomBytes(32);
}

/** Seals a tenant's data key under the application master key for storage. */
export function wrapDataKey(dataKey: Buffer): string {
  return encryptWith(dataKey.toString('base64'), key());
}

export function unwrapDataKey(wrapped: string): Buffer {
  return Buffer.from(decryptWith(wrapped, key()), 'base64');
}

/** Encrypt a provider OAuth token for storage. Format: iv.tag.ciphertext (base64). */
export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed encrypted value');
  }
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** API tokens are stored as hashes; the plaintext is shown once at creation. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateApiToken(): { token: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString('base64url');
  const token = `ctm_${secret}`;
  return { token, prefix: token.slice(0, 11), hash: hashToken(token) };
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
