import { useState } from 'react';
import type { IntegrationConnectionDTO, UserDTO } from '@continuum/shared';
import { AlertCircle, Check, Copy, Download, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { useSession } from '../lib/session';
import { Field, Spinner, TimeAgo } from '../components/ui';

const TABS = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'billing', label: 'Billing' },
  { key: 'team', label: 'Team' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'fields', label: 'Custom fields' },
  { key: 'api', label: 'API & MCP' },
  { key: 'data', label: 'Your data' },
] as const;

export function Settings() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('workspace');

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="tabs">
        {TABS.map((option) => (
          <button
            key={option.key}
            className={`tab ${tab === option.key ? 'active' : ''}`}
            onClick={() => setTab(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === 'workspace' && <WorkspaceTab />}
      {tab === 'billing' && <BillingTab />}
      {tab === 'team' && <TeamTab />}
      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'fields' && <CustomFieldsTab />}
      {tab === 'api' && <ApiTab />}
      {tab === 'data' && <DataTab />}
    </>
  );
}

function WorkspaceTab() {
  const { refresh } = useSession();
  const settings = useFetch<{
    name: string;
    motion: string;
    showProjectsUi: boolean;
    stallingThresholdDays: number;
    agentHighThreshold: number;
    agentMediumThreshold: number;
  }>('/settings/organization');
  const [saving, setSaving] = useState(false);

  if (!settings.data) return <Spinner />;
  const data = settings.data;

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      await api.patch('/settings/organization', patch);
      await settings.reload();
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="col" style={{ maxWidth: 620, gap: 18 }}>
      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ marginBottom: 12 }}>Motion</h2>
        <div className="small muted" style={{ marginBottom: 10 }}>
          Decides the default pipeline and whether delivery projects are shown at all.
        </div>
        <div className="row wrap">
          {(['SALES', 'AGENCY', 'HYBRID'] as const).map((motion) => (
            <button
              key={motion}
              className={`btn btn-sm ${data.motion === motion ? 'btn-primary' : ''}`}
              onClick={() => save({ motion })}
              disabled={saving}
            >
              {motion.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ marginBottom: 12 }}>When a deal counts as quiet</h2>
        <Field
          label="Days without captured activity"
          hint="Applies from the next check onwards — existing flags are not rewritten."
        >
          <input
            type="number"
            min={1}
            max={365}
            defaultValue={data.stallingThresholdDays}
            onBlur={(event) =>
              save({ stallingThresholdDays: Number(event.target.value) || 5 })
            }
          />
        </Field>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ marginBottom: 4 }}>How confident the agent must be</h2>
        <div className="small muted" style={{ marginBottom: 12 }}>
          Below the lower threshold nothing is recorded at all — the agent stays silent rather than
          guessing. Between the two, a suggestion appears only in the agent log. Above the upper
          threshold it is surfaced on the record itself.
        </div>
        <div className="row" style={{ gap: 14 }}>
          <Field label="Surface prominently at">
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              defaultValue={data.agentHighThreshold}
              onBlur={(event) => save({ agentHighThreshold: Number(event.target.value) })}
            />
          </Field>
          <Field label="Stay silent below">
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              defaultValue={data.agentMediumThreshold}
              onBlur={(event) => save({ agentMediumThreshold: Number(event.target.value) })}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

/** Billing that explains itself — the category's trust problem is opacity here. */
function BillingTab() {
  const billing = useFetch<{
    planName: string;
    seats: number;
    pricePerSeatCents: number;
    lineItems: { description: string; quantity: number; unitPriceCents: number; totalCents: number }[];
    nextInvoiceCents: number;
    nextInvoiceDate: string;
    notes: string[];
  }>('/settings/billing');

  if (!billing.data) return <Spinner />;
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="col" style={{ maxWidth: 620, gap: 18 }}>
      <div className="card" style={{ padding: 16 }}>
        <div className="spread" style={{ marginBottom: 14 }}>
          <div>
            <h2>{billing.data.planName}</h2>
            <div className="small muted">
              {billing.data.seats} seat{billing.data.seats === 1 ? '' : 's'} ·{' '}
              {money(billing.data.pricePerSeatCents)} each per month
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="metric-value">{money(billing.data.nextInvoiceCents)}</div>
            <div className="small muted">
              next invoice {new Date(billing.data.nextInvoiceDate).toLocaleDateString()}
            </div>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Line item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {billing.data.lineItems.map((item) => (
              <tr key={item.description}>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{money(item.unitPriceCents)}</td>
                <td style={{ textAlign: 'right' }}>{money(item.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 8 }}>What you are not charged for</h3>
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
          {billing.data.notes.map((note) => (
            <li key={note} style={{ marginBottom: 3 }}>
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TeamTab() {
  const users = useFetch<{ data: UserDTO[] }>('/settings/users');
  const [error, setError] = useState<string | null>(null);

  async function changeRole(userId: string, role: string) {
    setError(null);
    try {
      await api.patch(`/settings/users/${userId}`, { role });
      await users.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change that role');
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      {error && (
        <div className="banner small" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.data.map((user) => (
              <tr key={user.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{user.name}</div>
                  <div className="small muted">{user.email}</div>
                </td>
                <td>
                  <select
                    value={user.role}
                    onChange={(event) => changeRole(user.id, event.target.value)}
                    style={{ width: 140 }}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="small muted" style={{ marginTop: 10 }}>
        Members see their own deals, managers see their team's, admins see the whole workspace.
        Role-based access is part of every plan.
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const status = useFetch<{
    data: (IntegrationConnectionDTO & { needsAttention: boolean; message: string | null })[];
    capturedActivities: number;
  }>('/integrations/status');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  async function syncNow() {
    setSyncing(true);
    try {
      const result = await api.post<{ created: number; filtered: number; duplicates: number }>(
        '/integrations/sync-now',
      );
      setLastSync(
        `${result.created} new, ${result.filtered} filtered as noise, ${result.duplicates} already seen`,
      );
      await status.reload();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="col" style={{ maxWidth: 680, gap: 14 }}>
      <div className="spread">
        <div className="small muted">
          {status.data?.capturedActivities ?? 0} activities captured automatically so far.
        </div>
        <button className="btn btn-sm" onClick={syncNow} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>
      {lastSync && <div className="small muted">{lastSync}</div>}

      {(status.data?.data.length ?? 0) === 0 && (
        <div className="card" style={{ padding: 16 }}>
          <div className="small muted">Nothing connected yet.</div>
        </div>
      )}

      {status.data?.data.map((connection) => (
        <div key={connection.id} className="card" style={{ padding: 14 }}>
          <div className="spread">
            <div>
              <div style={{ fontWeight: 500 }}>{connection.provider}</div>
              <div className="small muted">{connection.accountEmail ?? '—'}</div>
            </div>
            <span
              className={`chip ${
                connection.status === 'CONNECTED'
                  ? 'chip-positive'
                  : connection.needsAttention
                    ? 'chip-negative'
                    : 'chip-warn'
              }`}
            >
              {connection.status.toLowerCase().replace('_', ' ')}
            </span>
          </div>

          {/*
            A revoked token gets a specific, actionable prompt rather than a
            generic sync error — the user needs to know what to do about it.
          */}
          {connection.message && (
            <div className="row small" style={{ marginTop: 8, color: 'var(--warn)' }}>
              <AlertCircle size={13} /> {connection.message}
            </div>
          )}

          <div className="small subtle" style={{ marginTop: 6 }}>
            last synced <TimeAgo iso={connection.lastSyncedAt} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomFieldsTab() {
  const fields = useFetch<{
    data: { id: string; entityType: string; key: string; label: string; type: string }[];
  }>('/settings/custom-fields');
  const [label, setLabel] = useState('');
  const [entityType, setEntityType] = useState('DEAL');

  async function create() {
    if (!label.trim()) return;
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    await api.post('/settings/custom-fields', { entityType, key, label, type: 'TEXT' });
    setLabel('');
    await fields.reload();
  }

  async function remove(id: string) {
    await api.delete(`/settings/custom-fields/${id}`);
    await fields.reload();
  }

  return (
    <div className="col" style={{ maxWidth: 640, gap: 14 }}>
      <div className="row">
        <select
          value={entityType}
          onChange={(event) => setEntityType(event.target.value)}
          style={{ width: 140 }}
        >
          <option value="DEAL">Deal</option>
          <option value="CONTACT">Contact</option>
          <option value="COMPANY">Company</option>
          <option value="PROJECT">Project</option>
        </select>
        <input
          placeholder="Field name"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && void create()}
        />
        <button className="btn btn-sm" onClick={create} disabled={!label.trim()}>
          <Plus size={14} />
        </button>
      </div>
      <div className="small muted">
        New fields are available on every record of that type immediately — no migration, no
        waiting on engineering.
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table">
          <tbody>
            {fields.data?.data.map((field) => (
              <tr key={field.id}>
                <td style={{ fontWeight: 500 }}>{field.label}</td>
                <td className="small muted mono">{field.key}</td>
                <td className="small muted">{field.entityType.toLowerCase()}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-ghost btn-sm btn-danger" onClick={() => remove(field.id)}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(fields.data?.data.length ?? 0) === 0 && (
          <div className="empty small">No custom fields yet.</div>
        )}
      </div>
      <div className="small subtle">
        Removing a field hides it from the interface but keeps recorded values, so your exports stay
        complete.
      </div>
    </div>
  );
}

function ApiTab() {
  const tokens = useFetch<{
    data: { id: string; name: string; prefix: string; lastUsedAt: string | null; revokedAt: string | null }[];
  }>('/settings/api-tokens');
  const [name, setName] = useState('');
  const [created, setCreated] = useState<string | null>(null);

  async function create() {
    if (!name.trim()) return;
    const result = await api.post<{ token: string }>('/settings/api-tokens', { name });
    setCreated(result.token);
    setName('');
    await tokens.reload();
  }

  return (
    <div className="col" style={{ maxWidth: 680, gap: 14 }}>
      <div className="row">
        <input
          placeholder="Token name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button className="btn btn-sm" onClick={create} disabled={!name.trim()}>
          Create token
        </button>
      </div>

      {created && (
        <div className="card" style={{ padding: 14, borderColor: 'var(--accent)' }}>
          <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>
            Copy this now — it is not shown again.
          </div>
          <div className="row">
            <code className="mono grow truncate">{created}</code>
            <button
              className="btn btn-sm"
              onClick={() => void navigator.clipboard.writeText(created)}
            >
              <Copy size={13} />
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="table">
          <tbody>
            {tokens.data?.data.map((token) => (
              <tr key={token.id}>
                <td style={{ fontWeight: 500 }}>{token.name}</td>
                <td className="mono small muted">{token.prefix}…</td>
                <td className="small muted">
                  {token.revokedAt ? 'revoked' : <TimeAgo iso={token.lastUsedAt} />}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {!token.revokedAt && (
                    <button
                      className="btn btn-ghost btn-sm btn-danger"
                      onClick={async () => {
                        await api.delete(`/settings/api-tokens/${token.id}`);
                        await tokens.reload();
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(tokens.data?.data.length ?? 0) === 0 && (
          <div className="empty small">No tokens yet.</div>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 6 }}>Model Context Protocol</h3>
        <div className="small muted">
          External AI agents can read your CRM at <code className="mono">/api/v1/mcp</code> using
          the same tokens. Write tools deliberately cannot change records — they create a pending
          suggestion that a person confirms here, exactly like Continuum's own agent.
        </div>
      </div>
    </div>
  );
}

/** Data portability, stated as plainly as it is implemented (FR-DATA-09, Journey 5). */
function DataTab() {
  const exports = useFetch<{
    data: { id: string; status: string; filePath: string | null; createdAt: string }[];
  }>('/settings/exports');
  const [busy, setBusy] = useState(false);

  async function requestExport() {
    setBusy(true);
    try {
      await api.post('/settings/exports');
      // The job runs asynchronously; give it a moment before showing status.
      setTimeout(() => void exports.reload(), 1200);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col" style={{ maxWidth: 640, gap: 14 }}>
      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ marginBottom: 6 }}>Export everything</h2>
        <div className="small muted" style={{ marginBottom: 12 }}>
          Every object type, in JSON and CSV, with a written manifest explaining the format.
          Agent-inferred values are included and tagged as such, so the export is exactly as
          trustworthy as what you see here. No plan restriction and no fee — your data is yours.
        </div>
        <button className="btn btn-primary btn-sm" onClick={requestExport} disabled={busy}>
          <Download size={14} /> Export my workspace
        </button>
      </div>

      {(exports.data?.data.length ?? 0) > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <tbody>
              {exports.data?.data.map((job) => (
                <tr key={job.id}>
                  <td className="small">
                    <TimeAgo iso={job.createdAt} />
                  </td>
                  <td>
                    <span
                      className={`chip ${job.status === 'READY' ? 'chip-positive' : 'chip-human'}`}
                    >
                      {job.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="small muted mono truncate">{job.filePath ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {job.status === 'READY' && <Check size={14} color="var(--positive)" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
