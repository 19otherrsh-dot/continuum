-- ---------------------------------------------------------------------------
-- Continuum CRM — Postgres row-level security
--
-- Status: SHIPPED BUT NOT APPLIED. This file is deliberately not a Prisma
-- migration, so nothing here is enabled by accident.
--
-- Why it exists: at V1, tenant isolation is enforced in the application by the
-- Prisma client extension in src/db/client.ts, which injects `organization_id`
-- into every query. That is sound for traffic that goes through the API, but it
-- does nothing for a direct database connection — a psql session, an analytics
-- tool, or a compromised credential. RLS closes that gap by moving the boundary
-- into the database itself.
--
-- The PRD calls for this before production launch (Part Five, §24
-- production-hardening note). It is left un-applied at V1 because it requires
-- an application role that is NOT the table owner (owners bypass RLS unless
-- FORCE is set), which is a deployment change rather than a code change.
--
-- ---------------------------------------------------------------------------
-- How to enable
-- ---------------------------------------------------------------------------
--   1. Create a non-owner application role and point DATABASE_URL at it:
--
--        CREATE ROLE continuum_app LOGIN PASSWORD '...';
--        GRANT USAGE ON SCHEMA public TO continuum_app;
--        GRANT SELECT, INSERT, UPDATE, DELETE
--          ON ALL TABLES IN SCHEMA public TO continuum_app;
--        ALTER DEFAULT PRIVILEGES IN SCHEMA public
--          GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO continuum_app;
--
--   2. Run this file as the table owner.
--
--   3. Set the tenant on every connection checkout, before any query:
--
--        SELECT set_config('continuum.organization_id', $1, true);
--
--      `true` scopes it to the transaction, so a pooled connection can never
--      leak one tenant's setting into another tenant's request. Wire this into
--      the Prisma extension alongside the existing filter injection.
--
--   4. Verify: connect as continuum_app WITHOUT setting the GUC and confirm
--      that `SELECT * FROM "Deal"` returns zero rows.
-- ---------------------------------------------------------------------------

-- Current tenant for this transaction. Returns NULL when unset, and because
-- `organization_id = NULL` is never true, an unset tenant sees nothing rather
-- than everything — the safe direction to fail.
CREATE OR REPLACE FUNCTION continuum_current_org() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('continuum.organization_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
  t text;
  -- Tables carrying organization_id directly. Others (Stage, DealContact,
  -- ActivityLink, Milestone, ProcessedMessage, …) are reachable only through a
  -- protected parent and inherit the boundary via their foreign keys.
  tenant_tables text[] := ARRAY[
    'Team', 'User', 'Pipeline', 'Company', 'Contact', 'Deal', 'Activity',
    'AgentAction', 'AgentCorrection', 'Project', 'Task',
    'IntegrationConnection', 'CaptureExclusion', 'Proposal', 'CustomFieldDef',
    'Tag', 'AuditLog', 'FieldPermission', 'Notification', 'ApiToken',
    'ExportJob'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- FORCE makes the policy apply to the table owner too, so an accidental
    -- owner connection does not silently bypass isolation.
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING ("organizationId" = continuum_current_org())
         WITH CHECK ("organizationId" = continuum_current_org())',
      t
    );
  END LOOP;
END
$$;

-- Organization itself is scoped to the caller's own row.
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Organization";
CREATE POLICY tenant_isolation ON "Organization"
  USING (id = continuum_current_org())
  WITH CHECK (id = continuum_current_org());
