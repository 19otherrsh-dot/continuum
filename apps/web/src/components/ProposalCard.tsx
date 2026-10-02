import { useState } from 'react';
import type { AgentActionDTO } from '@continuum/shared';
import { Bot, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import { Confidence, ConfirmButtons, TimeAgo } from './ui';

/** Human-readable summary of what a proposal would do. */
function describe(action: AgentActionDTO): string {
  const payload = action.proposedPayload as Record<string, unknown>;
  switch (action.type) {
    case 'CREATE_CONTACT':
      return `Add ${String(payload.email ?? 'contact')} as a contact`;
    case 'UPDATE_CONTACT':
      return 'Update contact details';
    case 'CHANGE_DEAL_STAGE':
      return `Move this deal to ${String(payload.stageName ?? 'a new stage')}`;
    case 'UPDATE_DEAL':
      return 'Update deal details';
    case 'CREATE_TASK':
      return `Create task: ${String(payload.title ?? 'follow up')}`;
    case 'LINK_CONTACT_TO_DEAL':
      return 'Add this contact to the deal';
    default:
      return action.type;
  }
}

/** Fields a user may correct before accepting, per proposal type. */
const EDITABLE: Record<string, { key: string; label: string }[]> = {
  CREATE_CONTACT: [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'title', label: 'Job title' },
  ],
  UPDATE_CONTACT: [
    { key: 'firstName', label: 'First name' },
    { key: 'lastName', label: 'Last name' },
    { key: 'title', label: 'Job title' },
  ],
  CHANGE_DEAL_STAGE: [{ key: 'stageName', label: 'Stage' }],
  CREATE_TASK: [{ key: 'title', label: 'Task' }],
};

export function ProposalCard({
  action,
  onResolved,
}: {
  action: AgentActionDTO;
  onResolved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const payload = action.proposedPayload as Record<string, unknown>;
    const fields = EDITABLE[action.type] ?? [];
    return Object.fromEntries(
      fields.map((field) => [field.key, payload[field.key] == null ? '' : String(payload[field.key])]),
    );
  });
  const [error, setError] = useState<string | null>(null);

  const editable = EDITABLE[action.type] ?? [];

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      // Only fields the user actually changed are sent as corrections, so an
      // untouched proposal is applied exactly as proposed.
      const payload = action.proposedPayload as Record<string, unknown>;
      const corrections: Record<string, unknown> = {};
      for (const field of editable) {
        const original = payload[field.key] == null ? '' : String(payload[field.key]);
        const current = draft[field.key] ?? '';
        if (current !== original) corrections[field.key] = current === '' ? null : current;
      }

      await api.post(`/agent-actions/${action.id}/confirm`, {
        ...(Object.keys(corrections).length > 0 ? { correctedPayload: corrections } : {}),
      });
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply that');
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/agent-actions/${action.id}/reject`, {});
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject that');
      setBusy(false);
    }
  }

  return (
    <div className={`proposal ${action.tier === 'MEDIUM' ? 'medium' : ''}`}>
      <div className="spread" style={{ alignItems: 'flex-start' }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Bot size={16} color="var(--agent)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600 }}>{describe(action)}</div>
            {action.rationale && (
              <div className="small muted" style={{ marginTop: 2 }}>
                {action.rationale}
              </div>
            )}
          </div>
        </div>
        <Confidence tier={action.tier} />
      </div>

      {/*
        The source activity is always one click away. A suggestion you cannot
        trace is a suggestion you cannot evaluate (FR-AGENT-02).
      */}
      {action.sourceActivity && (
        <div className="small subtle" style={{ marginTop: 8 }}>
          From {action.sourceActivity.type.toLowerCase()}
          {action.sourceActivity.subject ? ` “${action.sourceActivity.subject}”` : ''} ·{' '}
          <TimeAgo iso={action.sourceActivity.occurredAt} />
        </div>
      )}

      {editing && editable.length > 0 && (
        <div className="col" style={{ marginTop: 10 }}>
          {editable.map((field) => (
            <label key={field.key} className="col" style={{ gap: 3 }}>
              <span className="small" style={{ fontWeight: 500 }}>
                {field.label}
              </span>
              <input
                value={draft[field.key] ?? ''}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
              />
            </label>
          ))}
          <div className="small subtle">
            Corrections are remembered and used to improve future suggestions on this account.
          </div>
        </div>
      )}

      {error && (
        <div className="small" style={{ color: 'var(--negative)', marginTop: 8 }}>
          {error}
        </div>
      )}

      <div className="spread" style={{ marginTop: 12 }}>
        <ConfirmButtons
          onConfirm={confirm}
          onReject={reject}
          busy={busy}
          confirmLabel={editing ? 'Apply correction' : 'Confirm'}
        />
        {editable.length > 0 && !editing && (
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            <Pencil size={13} /> Edit first
          </button>
        )}
      </div>
    </div>
  );
}
