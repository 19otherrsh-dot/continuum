# Continuum CRM

An AI-native CRM that fills itself in. Rather than asking reps to log every call
and email, Continuum captures customer interactions automatically, structures
them into a trustworthy record, and proposes the resulting pipeline changes for
a human to confirm.

Built to the Continuum CRM PRD v2.0. Every **P0** requirement across Epics A–M
is implemented and verified; P1/P2 scope is listed at the end.

---

## Quick start

```powershell
docker compose up -d          # Postgres :5434, Redis :6380
Copy-Item .env.example .env   # every value has a working default
npm install
npm run db:migrate
npm run db:seed
npm run dev                   # API :3001, capture worker, web :5173
```

Open <http://localhost:5173> and sign in:

| Account | Password | Workspace |
|---|---|---|
| `alex@continuum.test` | `password123` | Northwind Sales — sales motion, admin |
| `sam@continuum.test` | `password123` | Northwind Sales — member (scoped visibility) |
| `nina@harbor.test` | `password123` | Harbor Studio — agency motion, admin |

**No credentials are required.** With `PROVIDER_MODE=simulator` (the default) a
fixture mailbox drives the whole capture pipeline, and with no
`ANTHROPIC_API_KEY` the AI layer falls back to a deterministic local
summarizer. Both are real code paths, not stubs — see *Providers* and *The AI
layer* below.

### Verify it

```powershell
npm test                 # 33 unit tests
npm run verify:journeys  # walks PRD Journeys 1–5, prints pass/fail per FR-ID
```

`verify:journeys` needs the API running and the database freshly seeded.

---

## What was built

### Automatic capture (Epic A)

The differentiator, and the highest-risk component, so it runs in its own
process with the deepest test coverage. The pipeline is a fixed sequence and
the order is load-bearing:

```
noise filter → exclusions → dedupe → matching engine → write → summarize → propose
```

- **Noise filtering runs before matching.** A newsletter from a customer's own
  domain is indistinguishable from a real reply until you read the headers.
  Filtering first means it never mints a contact proposal and never costs a
  summarization call.
- **The Activity write never blocks on the AI step.** Participants, timestamp,
  subject and an excerpt are persisted with `summaryStatus = PENDING`. If the
  model is down the product degrades to *a well-organized timeline*, never to
  *a wrong pipeline*.
- **Summarization runs off the poll entirely.** Ingestion does deterministic
  work only — write the record, derive rule-based contact proposals — and a
  separate worker drains the PENDING queue with bounded concurrency. Model
  calls used to run inline and sequentially, which is invisible with the local
  fallback and catastrophic with a real model: a 200-message backfill became
  200 sequential round-trips holding the connection open. The full message text
  is held in a transient column for the worker and purged the moment it is
  consumed, so deferring the summary costs nothing in quality and nothing in
  retention.
- **Dedupe is a unique constraint, not a read-then-write check** — a message
  redelivered by a retried poll costs one index lookup.
- **A failed write hands the claim back.** The idempotency row is inserted
  before the Activity so concurrent redelivery is safe, which means a failed
  write must release it — otherwise the retry sees the ledger row, calls the
  message a duplicate, and drops it permanently with no error anywhere. That
  was a live defect; `tests/ingestion-durability.test.ts` now pins it.
- **A rescheduled calendar event updates in place** (matched on `externalRef`)
  rather than appearing twice.
- **Backoff is per connection.** One workspace's rate limit cannot stall
  anyone else's capture. A revoked token is distinguished from a transient
  failure: it stops polling, sets `REAUTH_REQUIRED`, and prompts the user
  specifically — not a generic sync error.

The matching engine resolves a message onto records by most-recent context:
the deal this thread already lives on → any open deal for the company → the
company's active project → the company itself. That last step is why
post-signature conversation flows onto the delivery record with no re-linking.

### Trust model (Epic F)

No AI-proposed change ever mutates a record. Proposals are written to an
append-only log with a confidence score and the activity that triggered them.

Three tiers, configurable per workspace:

| Confidence | Behaviour |
|---|---|
| ≥ 0.80 | Pending proposal, surfaced on the record itself |
| 0.50 – 0.79 | Pending proposal, visible in the Agent Action Log only |
| < 0.50 | **No row is created at all** |

That bottom tier is the important one. A suggestion that exists but is hidden
still costs the user attention the moment they open the log, so silence means
silence.

Confidence is **never shown as a percentage**. "86%" implies a calibration the
model does not have and invites users to reason about a gap between 86 and 84
that carries no information, so the UI shows *Strong signal* or *Worth
checking* (§25.3). The raw score is retained for auditing and exposed on the
API, but the interface does not traffic in false precision.

Users can **correct a proposal before accepting it**. The corrected value —
not the original — is what gets written, and the delta is retained as context
for future inference on that account. Nothing auto-expires, and rejected
proposals are kept: a log you can only see part of tells you nothing about
what the agent does when you are not looking.

### Guardrails and autonomy (§25.4, §25.5)

Guardrails run **before** confidence gating and are not overridable by it. A
high score says the model read the message correctly; a guardrail says that
even a correct reading does not justify this shape of change.

| Action | Guardrail |
|---|---|
| Stage change | Never advances more than one stage. "Let's sign" on a New Lead deal proposes *Contacted*, not *Won* — and is clamped rather than dropped, since the signal was probably real. Backward moves and *Lost* are unrestricted: neither inflates the pipeline. |
| Create contact / company | Always requires confirmation, at any confidence and in any future phase. A wrong edit is visible on a record someone watches; a wrong new record is clutter nobody watches, and it poisons matching for every later message from that address. |
| Enrichment | Fills blanks only. Never overwrites a human-entered value, at any confidence — that value is a statement of intent the agent has no standing to contradict. |
| Draft email | Never sends. Drafting is assistance; sending is an irreversible act on the user's behalf. |
| Task suggestion | Lowest consequence, and therefore first in line for Phase 2 auto-apply. |

`src/ai/autonomy.ts` encodes the phase roadmap as enforced policy rather than a
comment. At V1 `evaluateAutonomy` returns false for everything, so
`AUTO_APPLIED` is unreachable. Enabling Phase 2 is one deliberate change in one
file — not something reachable by tuning a threshold elsewhere.

**The single-path property matters more than any individual rule.**
`recordProposals` is the only way a proposal is ever created. The MCP interface
routes through it rather than inserting rows. The journey harness caught this
during the build — MCP was creating proposals directly and bypassing the
stage guardrail, which is exactly the "point a different model at the API"
bypass the spec warns about.

One decision worth flagging: **new-contact proposals are generated
deterministically, not by the model.** "This address is on the thread, its
domain belongs to a company we know, and we have no contact for it" is a fact,
so it should not depend on an LLM being available. The model's judgement is
reserved for things that genuinely require reading the content.

### Data model

`schema.prisma` is the load-bearing artifact. Two properties must survive
future changes:

1. **Provenance is first-class.** Every inferable field carries a `source`;
   `Deal.stageSource` is stored separately from `stageId` so the UI can always
   answer "human or agent?" without audit-log archaeology. Adding this later
   would mean backfilling every historical row.
2. **Activity and AgentAction are separate structured objects.** An Activity
   records *what happened*; an AgentAction records *what the AI proposed to do
   about it*. Because Activity is structured rather than a log line, the
   timeline is queryable in ways an append-only feed is not.

Activity links are rows, not a foreign key — which is what makes deal →
project conversion a re-pointing operation rather than a copy.

### Instrumentation (§38, §39)

Every named product event is instrumented from the first deployment rather than
added once a problem is already visible to a user — by then the data that would
explain it does not exist. `signup_completed`, `integration_connected`,
`first_activity_captured`, `activity_captured`, `agent_action_created`,
`agent_action_resolved`, `deal_stage_changed`, `deal_converted_to_project`,
`capture_coverage`, `export_requested`, `stalling_deal_flagged` /
`_resolved`.

Analytics lives in its own table with its own retention, and **carries record
IDs, enums and durations only** — never subjects, bodies, summaries or
addresses (§38.1). A `sanitize` step strips content-bearing keys rather than
trusting call sites, and the journey harness asserts against the *stored* rows
that nothing leaked.

`GET /reports/success-metrics` computes the §39 KPI framework with each target
stated alongside its measured value, so a number reads as pass/fail rather than
as a figure you have to remember the goal for. Retention is named but not
computed — it comes from the billing system, and faking it in product code
would be worse than leaving the gap visible.

### Security and privacy (§30)

- **Envelope encryption.** Each organization has its own 256-bit data key,
  stored wrapped under the application master key. Provider OAuth tokens are
  sealed with the tenant key, never with one static application secret — so one
  tenant's key can be rotated, or one tenant's compromise contained, without
  touching anyone else's credentials.
- **Data minimization.** Captured messages are stored as an **excerpt**, not in
  full. The complete text lives in the user's own mailbox, which is the right
  system of record; a second complete copy enlarges the blast radius of a
  breach for no product benefit. The excerpt does not cost summary quality —
  the full text is passed to the model in memory and only the excerpt is
  persisted.
- **Least privilege.** Read-only provider scopes; tokens never logged.
- **Consent specificity.** The connect screen states what is captured *and what
  is not* — the second list is what earns the permission.
- **Call-recording consent.** Jurisdiction-aware, failing safe on numbers it
  cannot classify.

### Accessibility (§28)

- The Kanban board has a **genuine list-view equivalent**, not a degraded
  fallback: stage changes go through a native `<select>`, which is
  keyboard-operable and announced correctly, where a drag handle is neither.
  The preference persists, because someone who needs it needs it every time.
- Confirm / reject / edit on an Agent Action are ordinary buttons — among the
  most frequent interactions in the product, so they must be reachable and
  obvious by keyboard alone.
- Visible `:focus-visible` outlines throughout; a skip-to-content link.
- **Colour is never the sole signal.** Every source badge and status chip pairs
  its colour with an icon and a text label.
- `prefers-reduced-motion` respected.

### Tenancy

Every query is scoped by a Prisma client extension reading the tenant from
`AsyncLocalStorage`, so no route can forget to filter. The ambient tenant is
applied *last*, so a wrong or hostile `organizationId` in a request body can
never take effect.

Two sharp edges are worth knowing about, because both produced real bugs:

- **`Organization` cannot be scoped by `organizationId` — it *is* the tenant.**
  A bare `organization.findFirst()` therefore returns an arbitrary workspace
  and reads like perfectly ordinary code. The extension now rejects any
  `Organization` read that does not pin `id` to the ambient tenant, turning a
  silent leak into a loud failure.
- **Join tables carry no `organizationId`** (`Tagging`, `CustomFieldValue`,
  `ActivityLink`), so the extension cannot scope them. Their deletes are
  filtered through the owning relation by hand. `purgeAttributes` previously
  deleted by bare `entityId` across every tenant — safe only because entity ids
  are UUIDs, which is not the standard a delete should be held to.

`tests/tenancy.test.ts` exercises this against a real database: cross-tenant
read, update and delete attempts, the smuggled-`organizationId` create, the
unfiltered-`Organization` guard, and the join-table delete under a deliberately
colliding entity id.

Postgres RLS policies ship in
[`prisma/row-level-security.sql`](services/core-api/prisma/row-level-security.sql),
**deliberately not applied**. They close the gap the application layer cannot
— a direct database connection — but require a non-owner application role,
which is a deployment change rather than a code change. The file documents the
full enable procedure.

### Everything else

| Epic | What shipped |
|---|---|
| **B — Data model** | CRUD, audit trail with prior values, tags, custom fields (no migration needed), record source everywhere, full export |
| **C — Pipeline & calling** | Kanban with drag-to-stage, default templates, native dialler, **consent-aware recording**, stalling detection |
| **D — Delivery** | One-click deal→project conversion carrying full history, milestones, motion-gated visibility |
| **E — Integrations** | Google Workspace, Microsoft 365, Twilio, Slack, Dropbox Sign — plus simulators for all |
| **G — Permissions** | Member / Manager / Team / Admin scoping, multi-pipeline, last-admin guard, field-permission model present |
| **H — Reporting** | Dashboard, **capture coverage as a first-class metric**, team health, forecast, project reporting |
| **I — API & MCP** | REST API with rate-limit headers, tokens, and an MCP interface whose writes create proposals |
| **K/L/M** | SSE notifications, global search (including inside activity summaries), settings |

Two details worth calling out:

**Call consent (FR-PIPE-04).** Numbers are resolved to a consent regime by
area code and country prefix. Two-party jurisdictions get a spoken notice, and
recording begins in the TwiML verb *after* it — so someone who hangs up during
the notice is never recorded. Anything unrecognised is treated as two-party.

**MCP writes cannot mutate records.** `propose_stage_change` and
`propose_contact` create pending proposals and return an id. The trust
guarantee would be worth nothing if it could be bypassed by pointing a
different model at the API.

---

## Providers

Each family is an interface with a real implementation and a deterministic
simulator, selected by `PROVIDER_MODE`. Nothing above the adapter layer knows
which is active.

```
providers/
  email/       google.ts · microsoft.ts · simulator.ts
  telephony/   twilio.ts · simulator.ts
  misc/        live.ts (Slack, Dropbox Sign) · simulator.ts
```

The simulator's fixture inbox is not decoration — it is Epic A's acceptance
fixture, containing exactly the cases the pipeline must get right: a normal
thread, an unrecognised sender at a known domain, a newsletter from that same
domain, a no-reply notification, a cross-company CC, a calendar event that is
later rescheduled, and an explicit buying signal.

To go live, set `PROVIDER_MODE=live` and fill in the relevant credentials in
`.env`. The adapters are complete (OAuth, incremental sync via Gmail history
and Graph delta queries, token refresh with revocation detection); they have
not been exercised against the real services in this build.

## The AI layer

Uses `claude-opus-5` with adaptive thinking and `output_config.format` to
constrain output to a schema. Summarization runs at `effort: medium` (high
volume, bounded task); agent proposals at `effort: high`, because a bad
proposal costs user trust rather than a few tokens. The system prompt is a
cached block; volatile activity content goes after it.

`nextStep` is nullable in the schema on purpose — making "no suggestion"
representable is what stops the model inventing one to fill a required field.

**Without an API key** the local fallback takes over: extractive summaries
(real sentences from the message, so nothing can be wrong about what was said),
lexicon sentiment, regex next-step detection, and a scorer that only clears the
threshold for unambiguous signals. That is the honest degradation — the
alternative would be a pipeline full of confident guesses.

> **Verification note:** the local fallback path is fully verified. The live
> Claude path is implemented and typechecked but was **not** exercised against
> the API during this build, as no credentials were available in this
> environment. Set `ANTHROPIC_API_KEY` and re-run `npm run verify:journeys` to
> confirm it end to end.

---

## Layout

```
Continuum/
  packages/shared/         types, zod schemas, constants shared FE↔BE
  services/core-api/
    prisma/                schema, migrations, seed
      schema.sql           generated DDL companion doc (npm run db:sql)
      row-level-security.sql   RLS policies, ready to enable
    continuum_api_spec.yaml    OpenAPI 3.0 spec (swagger-parser validated)
    src/
      ai/                  claude client, summarizer, proposer,
                           confidence gate, guardrails, autonomy policy, fallback
      analytics/           product event instrumentation
      ingestion/           noise filter, matching engine, pipeline, scheduler
      providers/           email, telephony, slack, e-sign (live + simulator)
      modules/             one Fastify plugin per resource
      db/                  tenant-scoped Prisma client + async context
    scripts/               journey harness, schema.sql generator
    tests/                 unit tests
  apps/web/                React 19 + Vite SPA
```

### Companion documents (Appendix B)

| Document | Status |
|---|---|
| [`prisma/schema.sql`](services/core-api/prisma/schema.sql) | Generated from the migrations — 32 tables. Regenerate with `npm run db:sql`; never hand-edit, the Prisma schema is the source of truth. |
| [`continuum_api_spec.yaml`](services/core-api/continuum_api_spec.yaml) | OpenAPI 3.0, 31 paths / 38 operations / 15 schemas. Validated with `@apidevtools/swagger-parser`. |
| `continuum_prototype.jsx` | Superseded — the running web app in `apps/web` *is* the Pipeline view and Signal Thread the prototype demonstrated. |

Two processes share one workspace: `server.ts` (HTTP) and `worker.ts`
(capture). The split is operational — a wedged provider poll cannot consume
API request capacity.

---

## Test coverage

Aimed at the requirements where a regression is invisible by inspection.

**Unit (50):** noise classification in both directions, exclusion rules,
confidence gating and threshold configuration, correction-vs-confirmation
weighting, source-reliability and trajectory signals, the stage-hop clamp,
enrichment's refusal to overwrite, the autonomy policy across all three phases,
address parsing, consent-regime resolution, and the fallback summarizer's
refusal to invent a next step.

**Integration (15), against a real database:** tenant isolation across read,
update, delete and create; the `Organization` guard; join-table deletes under a
colliding entity id; and ingestion durability — capture, redelivery, recovery
from an orphaned ledger row, noise claimed-but-not-stored, and the assertion
that ingestion leaves activities `PENDING` rather than summarizing inline.

These exist because their absence is what let two cross-tenant defects and a
silent-data-loss bug through the first pass. Pure-function tests cannot observe
a Prisma client extension.

**Journeys (44 checks):** the five PRD journeys end to end — capture and
filtering, dedupe and reschedule, consent-gated calling, proposal → confirm →
provenance, correction retention, conversion with history intact and double
conversion rejected, motion gating, export, MCP write-as-proposal, token
revocation — plus the AI behaviour spec (V1 confirmation lock, `AUTO_APPLIED`
unreachable, qualitative tiers, the stage guardrail holding at 0.99 confidence
*through the MCP path*) and instrumentation (named events firing, no content in
analytics rows, KPI framework computing).

Two harness checks earned their keep by failing: the §25.4 guardrail exposed a
real bypass in the MCP write path, and the FR-AC-04 check caught contact
proposals being lost when summarization moved off the ingestion path — the
unrecognised addresses live only in the incoming message, so that work had to
stay on the fast path rather than follow the model call.

---

## Not in this build

**P1** — sequences, round-robin assignment, weighted-forecast UI, record merge,
custom report builder, webhooks, accounting integration, automatic e-signature
status reflection on the deal (sending ships; the status sync does not),
notification channel routing.

**P2** — limited autonomous agent actions. The policy, phase gates and
eligibility rules are written and unit-tested; `CURRENT_PHASE` is pinned to 1,
so nothing auto-applies. Moving it requires the acceptance-rate data §37.1 asks
for. Also deferred: digest mode.

**Epic J (mobile)** — needs a separate React Native app; Phase 2 in the PRD.

**Explicit PRD non-goals** — marketing automation, CPQ, broad integration
marketplace, full agentic autonomy, SOC 2 (Phase 3 per §32).

**Deliberately not faked** — a few PRD items are organizational or operational
rather than code, and are called out rather than stubbed: the 99.9% uptime
target (§31), SOC 2 readiness and GDPR DSAR/erasure tooling (§32, Phase 2),
gross-logo retention (§39, billing system), and the qualitative design-partner
validation (§39). Data residency is not implemented, but nothing in the schema
or tenancy model precludes regional storage later.

---

## Notes for whoever picks this up

- `git` is not installed on this machine, so the repo is not initialized. A
  `.gitignore` is in place for when it is.
- Postgres runs on **5434** and Redis on **6380** to avoid colliding with other
  local instances.
- Redis is in the compose file but not yet used — it is there for when the
  in-process rate limiter and SSE fan-out need to span more than one API
  process.
- The name "Continuum" is the PRD's placeholder. Replace it before anything
  goes outside the team.
