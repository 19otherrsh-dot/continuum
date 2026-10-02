import { prisma } from '../db/client.js';
import { requireContext } from '../db/context.js';
import { decryptWith, encryptWith, generateDataKey, unwrapDataKey, wrapDataKey, } from './crypto.js';
/**
 * Envelope encryption for provider credentials (PRD §30).
 *
 * Each organization gets its own 256-bit data key, stored wrapped under the
 * application master key. OAuth tokens are sealed with the tenant's data key,
 * never with a single static application secret.
 *
 * The property this buys: one tenant's key can be rotated, or one tenant's
 * compromise contained, without touching anyone else's stored credentials. It
 * also means a leaked database row is not decryptable without also holding the
 * master key, and a leaked master key still requires per-tenant unwrapping
 * rather than handing over every token at once.
 *
 * Keys are cached in memory for the process lifetime — they change only on
 * explicit rotation.
 */
const cache = new Map();
async function dataKeyFor(organizationId) {
    const cached = cache.get(organizationId);
    if (cached)
        return cached;
    const org = await prisma.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { encryptedDataKey: true },
    });
    let key;
    if (org.encryptedDataKey) {
        key = unwrapDataKey(org.encryptedDataKey);
    }
    else {
        // Lazily minted on first use, so existing workspaces upgrade in place.
        key = generateDataKey();
        await prisma.organization.update({
            where: { id: organizationId },
            data: { encryptedDataKey: wrapDataKey(key) },
        });
    }
    cache.set(organizationId, key);
    return key;
}
export async function sealForTenant(plaintext) {
    const { organizationId } = requireContext();
    return encryptWith(plaintext, await dataKeyFor(organizationId));
}
export async function openForTenant(payload) {
    const { organizationId } = requireContext();
    return decryptWith(payload, await dataKeyFor(organizationId));
}
/**
 * Re-wraps a tenant's data key under the current master key. The data key
 * itself is unchanged, so stored ciphertext stays readable — this is master-key
 * rotation, not data re-encryption.
 */
export async function rewrapDataKey(organizationId) {
    const key = await dataKeyFor(organizationId);
    await prisma.organization.update({
        where: { id: organizationId },
        data: { encryptedDataKey: wrapDataKey(key) },
    });
    cache.set(organizationId, key);
}
export function forgetCachedKeys() {
    cache.clear();
}
