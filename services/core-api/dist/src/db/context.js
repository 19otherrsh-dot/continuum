import { AsyncLocalStorage } from 'node:async_hooks';
const storage = new AsyncLocalStorage();
/**
 * Enters the tenant scope for `fn`.
 *
 * Kept synchronous because the Fastify `onRequest` hook enters the store by
 * calling `done()` inside it — that is what propagates the context through the
 * rest of the request.
 *
 * Pass an `async` function for anything that touches the database. Handing back
 * a bare Prisma promise would defer the query until after the store exited,
 * because Prisma promises do not execute until awaited.
 */
export function runWithContext(ctx, fn) {
    return storage.run(ctx, fn);
}
export function getContext() {
    return storage.getStore();
}
/** Throws when called outside a request/job scope — a bug, not a user error. */
export function requireContext() {
    const ctx = storage.getStore();
    if (!ctx) {
        throw new Error('No request context. Wrap this call in runWithContext() — every query must be tenant-scoped.');
    }
    return ctx;
}
/**
 * Convenience for the many `create` calls that must name `organizationId` to
 * satisfy Prisma's generated types. The value is re-applied by the client
 * extension regardless, so this is for the type checker's benefit — it can
 * never be the thing that decides which tenant a row lands in.
 */
export function orgId() {
    return requireContext().organizationId;
}
/**
 * Escape hatch for the few genuinely cross-tenant operations: login lookups
 * and the ingestion scheduler selecting due connections across all workspaces.
 * Deliberately explicit and rare, so it shows up in review.
 */
const unscoped = new AsyncLocalStorage();
/**
 * The `await` inside the store is load-bearing. Prisma promises are lazy — the
 * query (and therefore the client extension) does not run until `.then()` is
 * called. Returning the promise out of `run()` and awaiting it at the call site
 * would execute the query *after* the store had exited, and the extension would
 * refuse it for lack of context.
 */
export async function runUnscoped(fn) {
    return unscoped.run(true, async () => await fn());
}
export function isUnscoped() {
    return unscoped.getStore() === true;
}
