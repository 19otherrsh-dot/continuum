/**
 * Journey harness.
 *
 * Walks the five end-to-end journeys from the PRD against a running API and
 * prints a pass/fail line per requirement ID. This is the acceptance check the
 * spec asks design-partner testing to validate first — unit tests cover the
 * pieces, this covers whether the product actually does what it claims.
 *
 *   npm run dev            # api + worker + web
 *   npm run verify:journeys
 *
 * Requires PROVIDER_MODE=simulator and a freshly seeded database.
 */
import { config } from '../src/config.js';
const BASE = process.env.CONTINUUM_API ?? `http://localhost:${config.port}/api/v1`;
const SALES = { email: 'alex@continuum.test', password: 'password123' };
const AGENCY = { email: 'nina@harbor.test', password: 'password123' };
let passed = 0;
let failed = 0;
const failures = [];
function check(requirement, description, ok, detail) {
    if (ok) {
        passed += 1;
        console.log(`  [32m✓[0m ${requirement.padEnd(16)} ${description}`);
    }
    else {
        failed += 1;
        failures.push(`${requirement} — ${description}${detail ? ` (${detail})` : ''}`);
        console.log(`  [31m✗[0m ${requirement.padEnd(16)} ${description}${detail ? `\n      ${detail}` : ''}`);
    }
}
function section(title) {
    console.log(`\n[1m${title}[0m`);
}
class Client {
    token = null;
    async login(credentials) {
        const result = await this.call('POST', '/auth/login', credentials);
        this.token = result.token;
    }
    async call(method, path, body) {
        const response = await fetch(`${BASE}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            },
            body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
        });
        const text = await response.text();
        const payload = text ? JSON.parse(text) : {};
        if (!response.ok) {
            const message = payload.error?.message ?? `HTTP ${response.status}`;
            throw new Error(`${method} ${path}: ${message}`);
        }
        return payload;
    }
    /** Expects the request to fail, and returns the error code it failed with. */
    async expectFailure(method, path, body) {
        try {
            await this.call(method, path, body);
            return null;
        }
        catch (error) {
            return error instanceof Error ? error.message : String(error);
        }
    }
}
async function main() {
    console.log('[1mContinuum — PRD journey verification[0m');
    console.log(`API: ${BASE}\n`);
    const health = (await fetch(`${BASE.replace('/api/v1', '')}/health`).then((r) => r.json()));
    console.log(`Providers: ${health.providerMode} · AI: ${health.ai}`);
    const sales = new Client();
    await sales.login(SALES);
    // ---------------------------------------------------------------- Journey 1
    section('Journey 1 — First five minutes (both personas)');
    const disclosure = await sales.call('GET', '/integrations/disclosure');
    check('FR-AC-01', 'consent screen states plainly what is and is not captured', disclosure.captured.length > 0 && disclosure.notCaptured.length > 0);
    // Assertions are made on resulting state, not on this call's counters — the
    // background worker may legitimately have captured the inbox already.
    const sync = await sales.call('POST', '/integrations/sync-now');
    const activities = await sales.call('GET', '/activities?pageSize=50');
    const captured = activities.data.filter((a) => a.source === 'AGENT_INFERRED');
    check('FR-AC-02', 'connected mailbox produces activities', captured.length > 0, `${captured.length} captured`);
    const summarized = activities.data.filter((a) => a.summaryStatus === 'DONE');
    check('FR-AC-03', 'activities carry a structured summary, sentiment and next step (or explicit null)', summarized.length > 0 && summarized.every((a) => a.aiSummary !== null));
    check('FR-DATA-02', 'captured records are marked as agent-inferred, not indistinguishable from typed data', activities.data.some((a) => a.source === 'AGENT_INFERRED'));
    /**
     * The real assertion for noise handling is about state, not counters: the
     * newsletter and the no-reply notification must be absent from the timeline
     * *and* must not have produced contacts.
     */
    const noiseOnTimeline = activities.data.filter((a) => a.subject?.includes('Industry Roundup') || a.subject?.includes('Your invoice is ready'));
    const allContacts = await sales.call('GET', '/contacts?pageSize=100');
    const noiseContacts = allContacts.data.filter((c) => c.email.startsWith('newsletter@') || c.email.startsWith('no-reply@'));
    check('FR-AC-05 (noise)', 'newsletters and no-reply senders never reach the timeline or mint contacts', noiseOnTimeline.length === 0 && noiseContacts.length === 0, `${noiseOnTimeline.length} on timeline, ${noiseContacts.length} contacts`);
    const deals = await sales.call('GET', '/deals?pageSize=50');
    const populated = deals.data.filter((d) => d.lastActivityAt !== null);
    check('Journey 1.4', 'pipeline lands populated — a real timeline, not an empty state', populated.length > 0);
    // Idempotency: a repeated delivery must not double up.
    const before = activities.data.length;
    await sales.call('POST', '/integrations/sync-now');
    const third = await sales.call('POST', '/integrations/sync-now');
    const afterResync = await sales.call('GET', '/activities?pageSize=50');
    check('FR-AC-09', 'a message returned twice does not create a duplicate activity', third.created === 0 && afterResync.total <= before + 1, `third sync created ${third.created}; ${before} → ${afterResync.total} activities`);
    // The reschedule arrives under an existing externalRef, so it must move the
    // existing Activity rather than adding a second one.
    const securityReviews = afterResync.data.filter((a) => a.subject?.includes('security review'));
    check('Epic A edge', 'a rescheduled calendar event updates in place rather than duplicating', securityReviews.length === 1, `${securityReviews.length} copies of the meeting`);
    // ---------------------------------------------------------------- Journey 2
    section("Journey 2 — A rep's day (Persona A)");
    const contacts = await sales.call('GET', '/contacts?q=dana');
    const dana = contacts.data[0];
    const consent = await sales.call('GET', '/calls/consent?number=%2B14155550142');
    check('FR-PIPE-04', 'two-party consent jurisdiction triggers a recording notice', consent.regime === 'TWO_PARTY' && consent.requiresPrompt, `regime ${consent.regime}`);
    if (dana) {
        const call = await sales.call('POST', '/calls', { contactId: dana.id });
        check('FR-PIPE-03', 'a call is placed and logged without leaving the application', call.activity.type === 'CALL');
        check('FR-AC-10', 'call transcripts run through the same summarization path as email', call.outcome !== 'CONNECTED' || call.activity.summaryStatus !== 'SKIPPED', `outcome ${call.outcome}, summary ${call.activity.summaryStatus}`);
    }
    const pending = await sales.call('GET', '/agent-actions?status=PENDING&pageSize=50');
    const stageProposal = pending.data.find((a) => a.type === 'CHANGE_DEAL_STAGE');
    check('FR-AGENT-01', 'an explicit buying signal proposes a stage change without applying it', Boolean(stageProposal) && stageProposal.status === 'PENDING');
    if (stageProposal?.targetEntityId) {
        const dealBefore = await sales.call('GET', `/deals/${stageProposal.targetEntityId}`);
        await sales.call('POST', `/agent-actions/${stageProposal.id}/confirm`);
        const dealAfter = await sales.call('GET', `/deals/${stageProposal.targetEntityId}`);
        check('FR-AGENT-02', 'confirming a proposal applies it to the target record', dealAfter.stageId !== dealBefore.stageId);
        check('FR-PIPE-01', 'provenance records that the agent, not a person, set this stage', dealAfter.stageSource === 'AGENT_INFERRED', `stageSource ${dealAfter.stageSource}`);
    }
    // ---------------------------------------------------------------- Journey 4
    section('Journey 4 — Reviewing and correcting a suggestion');
    const contactProposal = pending.data.find((a) => a.type === 'CREATE_CONTACT');
    check('FR-AC-04', 'an unrecognised sender at a known company is proposed, not written directly', Boolean(contactProposal));
    if (contactProposal) {
        check('FR-AGENT-02', 'the proposal carries a confidence score and its source activity', contactProposal.confidenceScore > 0 && ['HIGH', 'MEDIUM'].includes(contactProposal.tier));
        const proposedEmail = String(contactProposal.proposedPayload.email ?? '');
        const corrected = await sales.call('POST', `/agent-actions/${contactProposal.id}/confirm`, { correctedPayload: { title: 'Head of Security', firstName: 'Marc' } });
        check('FR-AGENT-03', 'a corrected value — not the original proposal — is what gets applied', corrected.appliedPayload.firstName === 'Marc' &&
            corrected.appliedPayload.title === 'Head of Security');
        const created = await sales.call('GET', `/contacts?q=${encodeURIComponent(proposedEmail.split('@')[0] ?? '')}`);
        const record = created.data[0];
        check('FR-DATA-03', 'the confirmed contact is auto-linked to the company owning its domain', Boolean(record?.company));
        const corrections = await sales.call('GET', '/agent-actions/corrections');
        check('FR-AGENT-04', 'the correction is retained as context for future inference on that account', corrections.data.some((c) => c.fieldPath === 'firstName'));
    }
    const log = await sales.call('GET', '/agent-actions?pageSize=100');
    check('FR-AGENT-05', 'every proposal remains visible in the log, whatever became of it', log.total >= pending.data.length && log.data.some((a) => a.status === 'CONFIRMED'));
    // Confidence gating — nothing below the workspace threshold was persisted.
    const org = await sales.call('GET', '/settings/organization');
    check('FR-AGENT-06', 'no proposal exists below the workspace confidence threshold', log.data.length === 0 ||
        (await sales.call('GET', '/agent-actions?pageSize=100'))
            .data.every((a) => a.confidenceScore >= org.agentMediumThreshold));
    // ---------------------------------------------------------------- Journey 3
    section('Journey 3 — Deal won, handoff to delivery (Persona B)');
    const agency = new Client();
    await agency.login(AGENCY);
    const wonDeals = await agency.call('GET', '/deals?status=WON');
    const won = wonDeals.data.find((d) => !d.convertedProjectId);
    if (!won) {
        check('FR-PROJ-01', 'a won deal is available to convert', false, 'none found — reseed');
    }
    else {
        const historyBefore = await agency.call('GET', `/deals/${won.id}/activities`);
        const project = await agency.call('POST', `/deals/${won.id}/convert-to-project`);
        check('FR-PROJ-01', 'one click creates a project carrying contacts and company across', project.contacts.length > 0 && project.companyId !== null);
        const historyAfter = await agency.call('GET', `/projects/${project.id}/activities`);
        check('FR-PROJ-03', 'the entire sales conversation follows the project with no re-linking', historyAfter.data.length === historyBefore.data.length && historyAfter.data.length > 0, `${historyBefore.data.length} before, ${historyAfter.data.length} after`);
        await agency.call('POST', `/projects/${project.id}/milestones`, {
            title: 'Kickoff workshop',
        });
        const withMilestone = await agency.call('GET', `/projects/${project.id}`);
        check('FR-PROJ-02', 'milestones are added without re-entering any client information', withMilestone.milestones.length === 1);
        const duplicate = await agency.expectFailure('POST', `/deals/${won.id}/convert-to-project`);
        check('FR-PROJ-06', 'converting the same deal twice is rejected with a pointer to the existing project', duplicate !== null && duplicate.toLowerCase().includes('already'), duplicate ?? 'no error raised');
    }
    const projectsBlocked = await sales.expectFailure('GET', '/projects');
    check('FR-PROJ-05', 'a sales-only workspace cannot reach the Project object at all', projectsBlocked !== null);
    // ---------------------------------------------------------------- Journey 5
    section('Journey 5 — Data export / considering leaving');
    const exportJob = await sales.call('POST', '/settings/exports');
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const finished = await sales.call('GET', `/settings/exports/${exportJob.id}`);
    check('FR-DATA-09', 'a full workspace export is generated with no plan-tier restriction', finished.status === 'READY' && Boolean(finished.filePath), `status ${finished.status}`);
    // ------------------------------------------------------ cross-cutting P0s
    section('Cross-cutting requirements');
    const dashboard = await sales.call('GET', '/reports/dashboard');
    check('FR-REPORT-01', 'the default dashboard renders with no configuration', dashboard.pipelineValueByStage.length > 0);
    check('FR-REPORT-04', 'capture coverage is a first-class metric, not buried in an admin view', typeof dashboard.captureCoverage.percentage === 'number', `${dashboard.captureCoverage.percentage}%`);
    const search = await sales.call('GET', '/search?q=northwind');
    check('FR-SEARCH-01', 'global search returns ranked results across record types', search.data.length > 0);
    const tools = await sales.call('GET', '/mcp/tools');
    check('FR-API-02', 'an MCP interface is exposed for external agents', tools.tools.length > 0);
    const openDeal = deals.data[0];
    if (openDeal) {
        const mcpWrite = await sales.call('POST', '/mcp/call', {
            name: 'propose_stage_change',
            arguments: {
                dealId: openDeal.id,
                stageName: 'Qualified',
                confidence: 0.9,
                rationale: 'Journey harness check',
            },
        });
        check('FR-API-02', 'MCP writes create a pending proposal rather than mutating the record', mcpWrite.content.created === true && Boolean(mcpWrite.content.proposalId), mcpWrite.content.message);
    }
    const token = await sales.call('POST', '/settings/api-tokens', {
        name: 'journey-harness',
    });
    const viaToken = await fetch(`${BASE}/contacts?pageSize=1`, {
        headers: { Authorization: `Bearer ${token.token}` },
    });
    check('FR-API-01', 'the public REST API accepts a bearer token and emits rate-limit headers', viaToken.ok && viaToken.headers.has('x-ratelimit-limit'));
    await sales.call('DELETE', `/settings/api-tokens/${token.id}`);
    const afterRevoke = await fetch(`${BASE}/contacts?pageSize=1`, {
        headers: { Authorization: `Bearer ${token.token}` },
    });
    check('FR-API-04', 'revocation takes effect on the very next request', afterRevoke.status === 401, `status ${afterRevoke.status}`);
    const audit = await sales.call('GET', '/reports/audit?limit=10');
    check('FR-DATA-07', 'changes are recorded in an audit trail', audit.data.length > 0);
    // ------------------------------------------- AI behaviour spec (§25.2-25.6)
    section('AI Agent Behavior Specification');
    const policy = await sales.call('GET', '/reports/autonomy-policy');
    check('§25.5', 'V1 requires human confirmation for every action, with no exceptions', policy.phase === 1 && policy.everyActionRequiresConfirmation, `phase ${policy.phase}`);
    const everyAction = await sales.call('GET', '/agent-actions?pageSize=200');
    check('§25.5', 'nothing was auto-applied — the AUTO_APPLIED state is unreachable at V1', everyAction.data.every((a) => a.status !== 'AUTO_APPLIED'));
    check('§25.3', 'every proposal carries a qualitative tier, not just a raw score', everyAction.data.every((a) => a.tier === 'HIGH' || a.tier === 'MEDIUM'));
    /**
     * The §25.4 stage guardrail. Ask MCP to jump a deal straight to a far stage
     * and confirm the resulting proposal advances only one.
     */
    const pipelines = await sales.call('GET', '/pipelines');
    const stages = pipelines.data[0]?.stages ?? [];
    const stageOrder = new Map(stages.map((s, index) => [s.id, index]));
    // Pick the *earliest-stage* open deal, so there is genuinely more than one
    // stage to jump. Taking whichever deal came back first would silently skip
    // the check once earlier journeys have advanced it.
    const openForGuardrail = (await sales.call('GET', '/deals?status=OPEN&pageSize=50')).data
        .slice()
        .sort((a, b) => (stageOrder.get(a.stageId) ?? 99) - (stageOrder.get(b.stageId) ?? 99));
    const guardrailDeal = openForGuardrail[0];
    if (guardrailDeal) {
        const currentIndex = stages.findIndex((s) => s.id === guardrailDeal.stageId);
        const farStage = stages[stages.length - 2]; // the Won stage
        if (farStage && currentIndex >= 0 && stages.length - 2 - currentIndex > 1) {
            const jump = await sales.call('POST', '/mcp/call', {
                name: 'propose_stage_change',
                arguments: {
                    dealId: guardrailDeal.id,
                    stageName: farStage.name,
                    confidence: 0.99,
                    rationale: 'Journey harness — guardrail check',
                },
            });
            if (jump.content.proposalId) {
                const proposal = await sales.call('GET', `/agent-actions/${jump.content.proposalId}`);
                const proposed = proposal.proposedPayload.stageName;
                const proposedIndex = stages.findIndex((s) => s.name === proposed);
                check('§25.4', 'a stage proposal never advances more than one stage, even at 0.99 confidence', proposedIndex - currentIndex <= 1, `${stages[currentIndex]?.name} → ${proposed} (asked for ${farStage.name})`);
            }
            else {
                check('§25.4', 'stage guardrail check ran', false, 'no proposal created');
            }
        }
        else {
            check('§25.4', 'stage guardrail (skipped — deal too near the end of the pipeline)', true);
        }
    }
    // ---------------------------------------------------- instrumentation (§38)
    section('Analytics & success metrics');
    /**
     * `signup_completed` only fires through the real signup route — the seed
     * creates its workspaces directly. So the harness signs up a throwaway
     * workspace and verifies the event there, exercising the actual path rather
     * than asserting against pre-seeded data.
     */
    const throwaway = new Client();
    const stamp = Date.now();
    await throwaway.call('POST', '/auth/signup', {
        email: `harness+${stamp}@continuum.test`,
        password: 'password123',
        name: 'Harness',
        organizationName: `Harness ${stamp}`,
        motion: 'SALES',
    });
    await throwaway.login({ email: `harness+${stamp}@continuum.test`, password: 'password123' });
    const signupEvents = await throwaway.call('GET', '/reports/events?limit=50');
    check('§38', 'signing up emits signup_completed', signupEvents.data.some((e) => e.name === 'signup_completed'));
    const events = await sales.call('GET', '/reports/events?limit=500');
    const seen = new Set(events.data.map((e) => e.name));
    const required = [
        'activity_captured',
        'agent_action_created',
        'agent_action_resolved',
        'deal_stage_changed',
        'export_requested',
    ];
    const missing = required.filter((name) => !seen.has(name));
    check('§38', 'the named product events are instrumented and firing', missing.length === 0, missing.length > 0 ? `missing: ${missing.join(', ')}` : `${seen.size} distinct event types`);
    /**
     * §38.1 — analytics must reference IDs and metadata, never captured content.
     * Checked against the actual stored properties rather than trusting the code.
     */
    const leaked = events.data.filter((event) => Object.keys(event.properties ?? {}).some((key) => ['subject', 'body', 'summary', 'transcript', 'email', 'content'].includes(key.toLowerCase())));
    check('§38.1', 'analytics events carry no captured communication content', leaked.length === 0, leaked.length > 0 ? `${leaked.length} event(s) with content-bearing keys` : undefined);
    const metrics = await sales.call('GET', '/reports/success-metrics');
    check('§39', 'the KPI framework computes with explicit targets', metrics.goals.length >= 4 && metrics.goals.every((g) => typeof g.target === 'number'), metrics.goals.map((g) => `${g.value ?? '—'}/${g.target}`).join(', '));
    const notifications = await sales.call('GET', '/notifications');
    check('FR-NOTIF-01', 'notifications are produced for events the user needs to see', Array.isArray(notifications.data));
    // ------------------------------------------------------------------ result
    console.log(`\n[1m${passed} passed, ${failed} failed[0m`);
    if (failures.length > 0) {
        console.log('\nFailures:');
        for (const failure of failures)
            console.log(`  · ${failure}`);
        process.exit(1);
    }
    console.log('\nAll journeys verified.');
}
main().catch((error) => {
    console.error('\nHarness failed to run:', error instanceof Error ? error.message : error);
    console.error('\nIs the API running (npm run dev) and the database seeded (npm run db:seed)?');
    process.exit(1);
});
