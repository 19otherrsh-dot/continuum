-- Transient full message text, held only until the enrichment worker consumes
-- it. `body` keeps a permanent excerpt (data minimization); this column exists
-- so summarization can run off the ingestion path without losing long threads.
ALTER TABLE "Activity" ADD COLUMN     "rawBodyTransient" TEXT;

-- Notification deduplication key. Previously smuggled through `body`, which
-- meant any notification that also carried human-readable text silently lost
-- its deduplication.
ALTER TABLE "Notification" ADD COLUMN     "dedupeKey" TEXT;

-- The enrichment worker claims pending summaries across all tenants, oldest
-- first.
CREATE INDEX "Activity_summaryStatus_createdAt_idx" ON "Activity"("summaryStatus", "createdAt");

-- Enforces deduplication in the database rather than via a read-then-write
-- check, which two concurrent workers would both pass. NULLs stay distinct in
-- Postgres, so notifications without a dedupe key are unaffected.
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");
