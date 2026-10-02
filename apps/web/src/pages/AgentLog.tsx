import { useState } from 'react';
import type { AgentActionDTO } from '@continuum/shared';
import { Bot } from 'lucide-react';
import { useFetch } from '../lib/hooks';
import { ProposalCard } from '../components/ProposalCard';
import { Confidence, Empty, Spinner, TimeAgo } from '../components/ui';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'REJECTED', label: 'Rejected' },
] as const;

function statusChip(status: AgentActionDTO['status']) {
  if (status === 'CONFIRMED') return 'chip-positive';
  if (status === 'REJECTED') return 'chip-human';
  if (status === 'FAILED') return 'chip-negative';
  return 'chip-agent';
}

/**
 * The Agent Action Log (FR-AGENT-05).
 *
 * Everything the system has ever proposed, whatever became of it, with its
 * confidence score and the activity that triggered it. Nothing is hidden and
 * nothing expires — that completeness is the whole point: a log you can only
 * see part of tells you nothing about what the agent is doing when you are not
 * looking.
 */
export function AgentLog() {
  const [filter, setFilter] = useState<string>('');
  const actions = useFetch<{ data: AgentActionDTO[]; total: number }>(
    `/agent-actions?pageSize=200${filter ? `&status=${filter}` : ''}`,
    [filter],
  );
  const corrections = useFetch<{ data: { id: string; fieldPath: string; originalValue: string | null; correctedValue: string | null; company?: { name: string } | null }[] }>(
    '/agent-actions/corrections',
  );

  const rows = actions.data?.data ?? [];
  const pending = rows.filter((a) => a.status === 'PENDING');

  return (
    <>
      <div className="page-header">
        <h1>Agent activity</h1>
        <div className="small muted">
          Every suggestion the system has made, confirmed or not. Nothing here changed a record on
          its own.
        </div>
      </div>

      <div className="tabs">
        {FILTERS.map((option) => (
          <button
            key={option.key}
            className={`tab ${filter === option.key ? 'active' : ''}`}
            onClick={() => setFilter(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {actions.loading && !actions.data && <Spinner />}

      {!actions.loading && rows.length === 0 && (
        <Empty
          title="Nothing proposed yet"
          hint="Suggestions appear here as email and calls are captured. When the system is not confident, it stays quiet rather than guessing."
        />
      )}

      {filter !== 'PENDING' && pending.length > 0 && (
        <div className="col" style={{ marginBottom: 22 }}>
          <h3>Waiting for you</h3>
          {pending.map((action) => (
            <ProposalCard key={action.id} action={action} onResolved={() => void actions.reload()} />
          ))}
        </div>
      )}

      {filter === 'PENDING' ? (
        <div className="col">
          {rows.map((action) => (
            <ProposalCard key={action.id} action={action} onResolved={() => void actions.reload()} />
          ))}
        </div>
      ) : (
        rows.length > 0 && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Proposal</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Reviewed by</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((action) => (
                  <tr key={action.id}>
                    <td>
                      <div className="row">
                        <Bot size={13} color="var(--agent)" />
                        <div>
                          <div style={{ fontWeight: 500 }}>{action.type.replace(/_/g, ' ').toLowerCase()}</div>
                          {action.rationale && (
                            <div className="small muted">{action.rationale}</div>
                          )}
                          {/*
                            Where a user corrected the proposal before accepting
                            it, both versions stay on the record.
                          */}
                          {action.appliedPayload &&
                            JSON.stringify(action.appliedPayload) !==
                              JSON.stringify(action.proposedPayload) && (
                              <div className="small" style={{ color: 'var(--accent)' }}>
                                corrected before applying
                              </div>
                            )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <Confidence tier={action.tier} />
                    </td>
                    <td>
                      <span className={`chip ${statusChip(action.status)}`}>
                        {action.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="small muted">{action.reviewedByName ?? '—'}</td>
                    <td className="small muted">
                      <TimeAgo iso={action.createdAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {(corrections.data?.data.length ?? 0) > 0 && (
        <div style={{ marginTop: 26 }}>
          <h3>Corrections you have made</h3>
          <div className="small muted" style={{ marginBottom: 8 }}>
            These are fed back into future suggestions on the same account, so the same mistake is
            not repeated.
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Field</th>
                  <th>Proposed</th>
                  <th>Corrected to</th>
                </tr>
              </thead>
              <tbody>
                {corrections.data?.data.map((correction) => (
                  <tr key={correction.id}>
                    <td className="small">{correction.company?.name ?? '—'}</td>
                    <td className="small mono">{correction.fieldPath}</td>
                    <td className="small muted">{correction.originalValue ?? '—'}</td>
                    <td className="small">{correction.correctedValue ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
