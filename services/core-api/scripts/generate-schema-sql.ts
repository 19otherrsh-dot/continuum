/**
 * Regenerates prisma/schema.sql from the applied migrations.
 *
 * schema.sql is a companion document to the PRD (Appendix B) — a readable,
 * vendor-neutral view of the data model for anyone who wants the DDL without
 * reading Prisma. It is derived, never hand-edited: the Prisma schema stays the
 * single source of truth, so a hand-patch here would silently diverge.
 *
 *   npm run db:sql
 */

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const prismaDir = resolve(here, '../prisma');

const HEADER = `-- ---------------------------------------------------------------------------
-- Continuum CRM — PostgreSQL schema
--
-- Companion document to the PRD (Part Five, §24 / Appendix B). Generated from
-- the Prisma schema in services/core-api/prisma/schema.prisma, which is the
-- source of truth — regenerate rather than hand-editing:
--
--   npm run db:sql
--
-- Validated against PostgreSQL 16.
--
-- Two properties are load-bearing and must survive any future change:
--
--   1. Provenance is first-class. Every field the agent can infer carries a
--      \`source\`; Deal."stageSource" is stored separately from "stageId" so the
--      UI can always answer "human or agent?" without audit-log archaeology.
--
--   2. "Activity" and "AgentAction" are separate structured objects. An
--      Activity records what happened; an AgentAction records what the AI
--      proposed to do about it.
--
-- Row-level security policies ship separately in row-level-security.sql and are
-- deliberately not applied by default — see that file for the rationale and the
-- enable procedure.
-- ---------------------------------------------------------------------------

`;

async function main(): Promise<void> {
  const migrationsDir = join(prismaDir, 'migrations');
  const entries = await readdir(migrationsDir, { withFileTypes: true });

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const chunks: string[] = [];
  for (const name of directories) {
    const sql = await readFile(join(migrationsDir, name, 'migration.sql'), 'utf8');
    chunks.push(`-- ===== migration: ${name} =====\n${sql.trim()}\n`);
  }

  const output = HEADER + chunks.join('\n');
  await writeFile(join(prismaDir, 'schema.sql'), output, 'utf8');

  const tables = (output.match(/CREATE TABLE/g) ?? []).length;
  console.log(
    `schema.sql regenerated — ${directories.length} migration(s), ${tables} tables, ${output.split('\n').length} lines`,
  );
}

main().catch((error) => {
  console.error('Could not regenerate schema.sql:', error);
  process.exit(1);
});
