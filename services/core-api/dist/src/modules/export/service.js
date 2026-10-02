import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../../db/client.js';
import { requireContext } from '../../db/context.js';
const here = dirname(fileURLToPath(import.meta.url));
export const EXPORT_ROOT = resolve(here, '../../../../../exports');
/** Minimal, dependency-free CSV writer. Quotes everything that needs it. */
function toCsv(rows) {
    if (rows.length === 0)
        return '';
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const cell = (value) => {
        if (value === null || value === undefined)
            return '';
        const text = value instanceof Date
            ? value.toISOString()
            : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
        return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    return [
        columns.join(','),
        ...rows.map((row) => columns.map((column) => cell(row[column])).join(',')),
    ].join('\n');
}
/**
 * Full workspace export (FR-DATA-09, Journey 5).
 *
 * Three commitments this implementation has to keep:
 *
 *   - **Complete.** Every object type, not a contacts CSV. If a record exists
 *     in the product it exists in the export.
 *   - **Sourced.** Agent-inferred values are exported alongside human-entered
 *     ones and tagged with their provenance, so the exported record is exactly
 *     as trustworthy as the in-app one.
 *   - **Ungated.** No plan tier, no usage fee, no support ticket. Reduced
 *     switching cost is the trust signal.
 */
export async function runExport(jobId) {
    const { organizationId } = requireContext();
    await prisma.exportJob.update({ where: { id: jobId }, data: { status: 'RUNNING' } });
    try {
        const [organization, users, teams, pipelines, companies, contacts, deals, dealContacts, activities, activityParticipants, activityLinks, agentActions, agentCorrections, projects, projectContacts, milestones, tasks, connections, exclusions, proposals, customFieldDefs, customFieldValues, tags, taggings, auditLogs, notifications,] = await Promise.all([
            prisma.organization.findUniqueOrThrow({ where: { id: organizationId } }),
            prisma.user.findMany(),
            prisma.team.findMany(),
            prisma.pipeline.findMany({ include: { stages: true } }),
            prisma.company.findMany(),
            prisma.contact.findMany(),
            prisma.deal.findMany(),
            prisma.dealContact.findMany({ where: { deal: { organizationId } } }),
            prisma.activity.findMany(),
            prisma.activityParticipant.findMany({ where: { activity: { organizationId } } }),
            prisma.activityLink.findMany({ where: { activity: { organizationId } } }),
            prisma.agentAction.findMany(),
            prisma.agentCorrection.findMany(),
            prisma.project.findMany(),
            prisma.projectContact.findMany({ where: { project: { organizationId } } }),
            prisma.milestone.findMany({ where: { project: { organizationId } } }),
            prisma.task.findMany(),
            prisma.integrationConnection.findMany(),
            prisma.captureExclusion.findMany(),
            prisma.proposal.findMany(),
            // Archived definitions are included on purpose: a deleted custom field
            // must not silently remove recorded values from the export.
            prisma.customFieldDef.findMany(),
            prisma.customFieldValue.findMany({ where: { def: { organizationId } } }),
            prisma.tag.findMany(),
            prisma.tagging.findMany({ where: { tag: { organizationId } } }),
            prisma.auditLog.findMany(),
            prisma.notification.findMany(),
        ]);
        // Secrets are never exported. Connection metadata is, so the user knows
        // what was connected — but the tokens themselves stay behind.
        const safeConnections = connections.map(({ accessToken: _a, refreshToken: _r, ...rest }) => rest);
        const safeUsers = users.map(({ passwordHash: _p, ...rest }) => rest);
        const datasets = {
            organizations: [organization],
            users: safeUsers,
            teams,
            pipelines,
            stages: pipelines.flatMap((p) => p.stages),
            companies,
            contacts,
            deals,
            deal_contacts: dealContacts,
            activities,
            activity_participants: activityParticipants,
            activity_links: activityLinks,
            agent_actions: agentActions,
            agent_corrections: agentCorrections,
            projects,
            project_contacts: projectContacts,
            milestones,
            tasks,
            integration_connections: safeConnections,
            capture_exclusions: exclusions,
            proposals,
            custom_field_definitions: customFieldDefs,
            custom_field_values: customFieldValues,
            tags,
            taggings,
            audit_log: auditLogs,
            notifications,
        };
        const dir = join(EXPORT_ROOT, jobId);
        await mkdir(join(dir, 'csv'), { recursive: true });
        await mkdir(join(dir, 'json'), { recursive: true });
        for (const [name, rows] of Object.entries(datasets)) {
            await writeFile(join(dir, 'json', `${name}.json`), JSON.stringify(rows, null, 2), 'utf8');
            await writeFile(join(dir, 'csv', `${name}.csv`), toCsv(rows), 'utf8');
        }
        await writeFile(join(dir, 'MANIFEST.md'), buildManifest(organization.name, datasets), 'utf8');
        await prisma.exportJob.update({
            where: { id: jobId },
            data: { status: 'READY', filePath: dir, completedAt: new Date() },
        });
    }
    catch (error) {
        await prisma.exportJob.update({
            where: { id: jobId },
            data: {
                status: 'FAILED',
                error: error instanceof Error ? error.message : String(error),
                completedAt: new Date(),
            },
        });
        throw error;
    }
}
function buildManifest(orgName, datasets) {
    const rows = Object.entries(datasets)
        .map(([name, list]) => `| \`${name}\` | ${list.length} |`)
        .join('\n');
    return `# Continuum export — ${orgName}

Generated ${new Date().toISOString()}

Every object type in the workspace is included. Each record is provided in two
formats: \`json/\` preserves exact types and nesting; \`csv/\` is a flat
spreadsheet-friendly view of the same rows.

| Dataset | Records |
|---|---:|
${rows}

## Reading the data

**Provenance.** Records that can be inferred by the AI agent carry a \`source\`
column with one of \`HUMAN\`, \`AGENT_INFERRED\`, \`IMPORTED\`, or \`ENRICHED\`.
Deals additionally carry \`stageSource\`, recording whether the current stage
was set by a person or by a confirmed agent proposal. Agent-inferred values are
exported the same as human-entered ones — the exported record is exactly as
trustworthy as the one in the product.

**Agent history.** \`agent_actions\` is the complete log of every change the AI
proposed, whether it was confirmed, rejected, or is still pending, along with
the confidence score and the activity that triggered it.
\`agent_corrections\` records where a user edited a proposal before accepting it.

**Timeline.** \`activities\` holds emails, calls, meetings, and notes.
\`activity_links\` attaches each one to a contact, company, deal, or project;
\`activity_participants\` maps them to contacts. Joining those three
reconstructs any record's timeline exactly as the product displays it.

**Custom fields.** \`custom_field_definitions\` includes archived definitions so
that values in \`custom_field_values\` remain interpretable after a field has
been removed from the UI.

## Not included

Provider OAuth tokens and user password hashes are omitted deliberately. All
other data is present.

## Terms

This export is available on every plan with no tier restriction and no usage
fee. It is yours.
`;
}
