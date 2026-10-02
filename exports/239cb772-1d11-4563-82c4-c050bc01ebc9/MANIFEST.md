# Continuum export — Northwind Sales

Generated 2026-08-05T18:28:12.563Z

Every object type in the workspace is included. Each record is provided in two
formats: `json/` preserves exact types and nesting; `csv/` is a flat
spreadsheet-friendly view of the same rows.

| Dataset | Records |
|---|---:|
| `organizations` | 1 |
| `users` | 2 |
| `teams` | 1 |
| `pipelines` | 1 |
| `stages` | 6 |
| `companies` | 2 |
| `contacts` | 3 |
| `deals` | 2 |
| `deal_contacts` | 3 |
| `activities` | 8 |
| `activity_participants` | 6 |
| `activity_links` | 16 |
| `agent_actions` | 2 |
| `agent_corrections` | 2 |
| `projects` | 0 |
| `project_contacts` | 0 |
| `milestones` | 0 |
| `tasks` | 0 |
| `integration_connections` | 1 |
| `capture_exclusions` | 0 |
| `proposals` | 0 |
| `custom_field_definitions` | 1 |
| `custom_field_values` | 0 |
| `tags` | 0 |
| `taggings` | 0 |
| `audit_log` | 4 |
| `notifications` | 2 |

## Reading the data

**Provenance.** Records that can be inferred by the AI agent carry a `source`
column with one of `HUMAN`, `AGENT_INFERRED`, `IMPORTED`, or `ENRICHED`.
Deals additionally carry `stageSource`, recording whether the current stage
was set by a person or by a confirmed agent proposal. Agent-inferred values are
exported the same as human-entered ones — the exported record is exactly as
trustworthy as the one in the product.

**Agent history.** `agent_actions` is the complete log of every change the AI
proposed, whether it was confirmed, rejected, or is still pending, along with
the confidence score and the activity that triggered it.
`agent_corrections` records where a user edited a proposal before accepting it.

**Timeline.** `activities` holds emails, calls, meetings, and notes.
`activity_links` attaches each one to a contact, company, deal, or project;
`activity_participants` maps them to contacts. Joining those three
reconstructs any record's timeline exactly as the product displays it.

**Custom fields.** `custom_field_definitions` includes archived definitions so
that values in `custom_field_values` remain interpretable after a field has
been removed from the UI.

## Not included

Provider OAuth tokens and user password hashes are omitted deliberately. All
other data is present.

## Terms

This export is available on every plan with no tier restriction and no usage
fee. It is yours.
