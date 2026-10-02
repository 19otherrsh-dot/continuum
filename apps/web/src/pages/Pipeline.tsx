import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type {
  ActivityDTO,
  AgentActionDTO,
  DealDTO,
  PipelineDTO,
} from '@continuum/shared';
import { AlertTriangle, Bot, Columns3, List, Phone, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { useSession } from '../lib/session';
import { ProposalCard } from '../components/ProposalCard';
import { Timeline } from '../components/Timeline';
import { Drawer, Empty, Money, SourceBadge, Spinner, TimeAgo } from '../components/ui';

export function Pipeline() {
  const { workspace } = useSession();
  const [params, setParams] = useSearchParams();
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [openDealId, setOpenDealId] = useState<string | null>(params.get('focus'));
  const [creating, setCreating] = useState(false);

  /**
   * Board / list toggle (§28).
   *
   * Drag-and-drop is not reliably operable by keyboard or screen reader, so the
   * list view is a genuine equivalent — every stage change available on the
   * board is available there through a native select. The preference persists,
   * because a user who needs the list view needs it every time.
   */
  const [view, setView] = useState<'board' | 'list'>(
    () => (localStorage.getItem('continuum.pipelineView') as 'board' | 'list') ?? 'board',
  );
  useEffect(() => {
    localStorage.setItem('continuum.pipelineView', view);
  }, [view]);

  // Which deals have a suggestion waiting, so the board can flag them without
  // the user opening each record (§27.2).
  const pendingActions = useFetch<{ data: { targetEntityId: string | null }[] }>(
    '/agent-actions/pending?entityType=DEAL',
  );
  const dealsWithPending = useMemo(
    () => new Set((pendingActions.data?.data ?? []).map((a) => a.targetEntityId).filter(Boolean)),
    [pendingActions.data],
  );

  const pipelines = useFetch<{ data: PipelineDTO[] }>('/pipelines');
  const activePipeline = useMemo(() => {
    const list = pipelines.data?.data ?? [];
    return list.find((p) => p.id === pipelineId) ?? list[0] ?? null;
  }, [pipelines.data, pipelineId]);

  const deals = useFetch<{ data: DealDTO[] }>(
    activePipeline ? `/deals?pipelineId=${activePipeline.id}&pageSize=200` : null,
    [activePipeline?.id],
  );

  const byStage = useMemo(() => {
    const map = new Map<string, DealDTO[]>();
    for (const deal of deals.data?.data ?? []) {
      const bucket = map.get(deal.stageId) ?? [];
      bucket.push(deal);
      map.set(deal.stageId, bucket);
    }
    return map;
  }, [deals.data]);

  /**
   * Dropping a card sets the stage with `stageSource: HUMAN` server-side. A
   * dedicated endpoint rather than a generic PATCH, so the provenance can
   * never be set by accident (FR-PIPE-01).
   */
  const move = useCallback(
    async (dealId: string, stageId: string) => {
      const current = deals.data?.data.find((d) => d.id === dealId);
      if (!current || current.stageId === stageId) return;

      // Optimistic: dragging should feel instant.
      deals.setData((prev) =>
        prev
          ? {
              data: prev.data.map((d) =>
                d.id === dealId ? { ...d, stageId, stageSource: 'HUMAN' as const } : d,
              ),
            }
          : prev,
      );

      try {
        await api.post(`/deals/${dealId}/stage`, { stageId });
      } finally {
        await deals.reload();
      }
    },
    [deals],
  );

  if (pipelines.loading && !pipelines.data) return <Spinner />;
  if (!activePipeline) {
    return <Empty title="No pipeline yet" hint="A default pipeline is created with your workspace." />;
  }

  return (
    <>
      <div className="page-header spread">
        <div>
          <h1>Pipeline</h1>
          <div className="small muted">
            {(deals.data?.data ?? []).filter((d) => d.status === 'OPEN').length} open ·{' '}
            {workspace?.name}
          </div>
        </div>

        <div className="row">
          <div className="row" role="group" aria-label="Pipeline view" style={{ gap: 2 }}>
            <button
              className={`btn btn-sm ${view === 'board' ? 'btn-primary' : ''}`}
              onClick={() => setView('board')}
              aria-pressed={view === 'board'}
            >
              <Columns3 size={14} /> Board
            </button>
            <button
              className={`btn btn-sm ${view === 'list' ? 'btn-primary' : ''}`}
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              title="Keyboard-accessible alternative to drag and drop"
            >
              <List size={14} /> List
            </button>
          </div>

          {(pipelines.data?.data.length ?? 0) > 1 && (
            <select
              value={activePipeline.id}
              onChange={(event) => setPipelineId(event.target.value)}
              style={{ width: 'auto' }}
            >
              {pipelines.data?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> New deal
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <PipelineList
          deals={deals.data?.data ?? []}
          stages={activePipeline.stages}
          pendingIds={dealsWithPending}
          onMove={move}
          onOpen={(id) => {
            setOpenDealId(id);
            setParams({ focus: id });
          }}
        />
      ) : (
      <div className="board">
        {activePipeline.stages.map((stage) => {
          const stageDeals = byStage.get(stage.id) ?? [];
          const total = stageDeals.reduce((sum, d) => sum + (d.valueCents ?? 0), 0);

          return (
            <div
              key={stage.id}
              className={`column ${dragOver === stage.id ? 'drag-over' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(stage.id);
              }}
              onDragLeave={() => setDragOver((s) => (s === stage.id ? null : s))}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(null);
                if (dragging) void move(dragging, stage.id);
                setDragging(null);
              }}
            >
              <div className="column-head">
                <span>{stage.name}</span>
                <span className="small muted">
                  {stageDeals.length} · <Money cents={total} />
                </span>
              </div>

              {stageDeals.map((deal) => (
                <div
                  key={deal.id}
                  className={`deal-card ${dragging === deal.id ? 'dragging' : ''} ${
                    deal.stallingSince ? 'stalling' : ''
                  }`}
                  draggable
                  onDragStart={() => setDragging(deal.id)}
                  onDragEnd={() => setDragging(null)}
                  onClick={() => {
                    setOpenDealId(deal.id);
                    setParams({ focus: deal.id });
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: 3 }}>{deal.name}</div>
                  {deal.company && <div className="small muted">{deal.company.name}</div>}

                  <div className="spread" style={{ marginTop: 8 }}>
                    <strong className="small">
                      <Money cents={deal.valueCents} currency={deal.currency} />
                    </strong>
                    <span className="row" style={{ gap: 4 }}>
                      {/*
                        A suggestion waiting on this deal is flagged here, so a
                        rep scanning the board can see there is something to
                        review without opening every record (§27.2).
                      */}
                      {dealsWithPending.has(deal.id) && (
                        <span className="chip chip-agent" title="A suggestion is waiting on this deal">
                          <Bot size={10} /> review
                        </span>
                      )}
                      {/*
                        Whether the agent or a person put this deal in this stage
                        is visible on the card itself.
                      */}
                      {deal.stageSource === 'AGENT_INFERRED' && !dealsWithPending.has(deal.id) && (
                        <span
                          className="chip chip-agent"
                          title="Stage set by a confirmed suggestion"
                        >
                          <Bot size={10} /> agent
                        </span>
                      )}
                    </span>
                  </div>

                  {deal.stallingSince && (
                    <div className="row small" style={{ color: 'var(--warn)', marginTop: 6 }}>
                      <AlertTriangle size={12} /> quiet since{' '}
                      <TimeAgo iso={deal.lastActivityAt} />
                    </div>
                  )}
                </div>
              ))}

              {stageDeals.length === 0 && (
                <div className="small subtle" style={{ padding: '8px 2px' }}>
                  Nothing here
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      <DealDrawer
        dealId={openDealId}
        onClose={() => {
          setOpenDealId(null);
          setParams({});
          void deals.reload();
        }}
      />

      {creating && (
        <NewDealModal
          pipeline={activePipeline}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void deals.reload();
          }}
        />
      )}
    </>
  );
}

/**
 * The accessible equivalent of the Kanban board (§28).
 *
 * Not a degraded fallback — every operation the board offers is here. Stage
 * changes go through a native `<select>`, which is keyboard-operable and
 * announced correctly by screen readers, where a drag handle is neither.
 */
function PipelineList({
  deals,
  stages,
  pendingIds,
  onMove,
  onOpen,
}: {
  deals: DealDTO[];
  stages: PipelineDTO['stages'];
  pendingIds: Set<string | null>;
  onMove: (dealId: string, stageId: string) => Promise<void>;
  onOpen: (dealId: string) => void;
}) {
  if (deals.length === 0) {
    return <Empty title="No deals in this pipeline yet" />;
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="table">
        <caption className="small muted" style={{ captionSide: 'top', padding: '10px 12px', textAlign: 'left' }}>
          Change a deal's stage using the stage menu on its row.
        </caption>
        <thead>
          <tr>
            <th>Deal</th>
            <th>Company</th>
            <th>Value</th>
            <th>Stage</th>
            <th>Last activity</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id}>
              <td>
                {/* A button, not a click handler on the row — focusable and
                    activatable by keyboard. */}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ paddingLeft: 0, fontWeight: 500 }}
                  onClick={() => onOpen(deal.id)}
                >
                  {deal.name}
                </button>
                <span className="row" style={{ gap: 4 }}>
                  {pendingIds.has(deal.id) && (
                    <span className="chip chip-agent">
                      <Bot size={10} /> suggestion waiting
                    </span>
                  )}
                  {deal.stallingSince && (
                    <span className="chip chip-warn">
                      <AlertTriangle size={10} /> gone quiet
                    </span>
                  )}
                </span>
              </td>
              <td className="muted">{deal.company?.name ?? '—'}</td>
              <td>
                <Money cents={deal.valueCents} currency={deal.currency} />
              </td>
              <td>
                <select
                  value={deal.stageId}
                  aria-label={`Stage for ${deal.name}`}
                  onChange={(event) => void onMove(deal.id, event.target.value)}
                  style={{ width: 150 }}
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="small muted">
                <TimeAgo iso={deal.lastActivityAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DealDrawer({ dealId, onClose }: { dealId: string | null; onClose: () => void }) {
  const deal = useFetch<DealDTO>(dealId ? `/deals/${dealId}` : null, [dealId]);
  const activities = useFetch<{ data: ActivityDTO[] }>(
    dealId ? `/deals/${dealId}/activities` : null,
    [dealId],
  );
  const proposals = useFetch<{ data: AgentActionDTO[] }>(
    dealId ? `/agent-actions/pending?entityType=DEAL&entityId=${dealId}` : null,
    [dealId],
  );
  const [calling, setCalling] = useState(false);
  const [note, setNote] = useState('');

  const reloadAll = useCallback(() => {
    void deal.reload();
    void activities.reload();
    void proposals.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  async function placeCall(contactId: string) {
    setCalling(true);
    try {
      await api.post('/calls', { contactId, dealId });
      reloadAll();
    } finally {
      setCalling(false);
    }
  }

  async function addNote() {
    if (!note.trim() || !dealId) return;
    await api.post('/activities/notes', {
      body: note,
      entityType: 'DEAL',
      entityId: dealId,
      clientRequestId: `${dealId}-${Date.now()}`,
    });
    setNote('');
    void activities.reload();
  }

  if (!dealId) return null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={deal.data?.name ?? 'Deal'}
      subtitle={deal.data?.company?.name}
    >
      {deal.loading && !deal.data && <Spinner />}

      {deal.data && (
        <>
          {deal.data.needsReview && (
            <div className="banner small">
              <strong>Needs review.</strong> {deal.data.reviewReason}
            </div>
          )}

          <div className="card" style={{ padding: 14 }}>
            <div className="row wrap" style={{ gap: 16 }}>
              <div>
                <div className="small muted">Value</div>
                <strong>
                  <Money cents={deal.data.valueCents} currency={deal.data.currency} />
                </strong>
              </div>
              <div>
                <div className="small muted">Status</div>
                <strong>{deal.data.status}</strong>
              </div>
              <div>
                <div className="small muted">Last activity</div>
                <strong>
                  <TimeAgo iso={deal.data.lastActivityAt} />
                </strong>
              </div>
              <div>
                <div className="small muted">Stage set by</div>
                <SourceBadge source={deal.data.stageSource} />
              </div>
            </div>
          </div>

          {/*
            Pending proposals sit inline on the record they affect, so the rep
            reviews them where the context already is (Journey 2, step 4).
          */}
          {(proposals.data?.data.length ?? 0) > 0 && (
            <div className="col">
              <h3>Waiting for you</h3>
              {proposals.data?.data.map((action) => (
                <ProposalCard key={action.id} action={action} onResolved={reloadAll} />
              ))}
            </div>
          )}

          <div className="col">
            <div className="spread">
              <h3>People</h3>
            </div>
            {deal.data.contacts.length === 0 && (
              <div className="small subtle">No contacts linked yet.</div>
            )}
            {deal.data.contacts.map((dc) => (
              <div key={dc.contactId} className="spread card" style={{ padding: 10 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{dc.contact.fullName}</div>
                  <div className="small muted">
                    {[dc.contact.title, dc.role].filter(Boolean).join(' · ') || dc.contact.email}
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  onClick={() => placeCall(dc.contactId)}
                  disabled={calling}
                >
                  <Phone size={13} /> Call
                </button>
              </div>
            ))}
          </div>

          <div className="col">
            <h3>Timeline</h3>
            <div className="row">
              <input
                value={note}
                placeholder="Add a note…"
                onChange={(event) => setNote(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void addNote()}
              />
              <button className="btn btn-sm" onClick={addNote} disabled={!note.trim()}>
                Add
              </button>
            </div>
            {activities.loading && !activities.data ? (
              <Spinner />
            ) : (
              <Timeline activities={activities.data?.data ?? []} />
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}

function NewDealModal({
  pipeline,
  onClose,
  onCreated,
}: {
  pipeline: PipelineDTO;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [stageId, setStageId] = useState(pipeline.stages[0]?.id ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.post('/deals', {
        name,
        pipelineId: pipeline.id,
        stageId,
        valueCents: value ? Math.round(Number(value) * 100) : null,
      });
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()} style={{ padding: 18 }}>
        <h2 style={{ marginBottom: 14 }}>New deal</h2>
        <div className="col">
          <input
            autoFocus
            placeholder="Deal name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            placeholder="Value (optional)"
            type="number"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <select value={stageId} onChange={(event) => setStageId(event.target.value)}>
            {pipeline.stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submit} disabled={busy || !name.trim()}>
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
