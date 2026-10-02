import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ActivityDTO, DealDTO, ProjectDTO } from '@continuum/shared';
import { ArrowRight, Check, Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useFetch } from '../lib/hooks';
import { Timeline } from '../components/Timeline';
import { Drawer, Empty, Money, Spinner, TimeAgo } from '../components/ui';

/**
 * Journey 3 — delivery.
 *
 * The page leads with won deals that have not been converted yet, because the
 * moment a deal closes is exactly when a relationship goes quiet in an ordinary
 * CRM. Conversion carries the company, the contacts, and the entire sales
 * conversation across in one action.
 */
export function Projects() {
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get('focus'));
  const [converting, setConverting] = useState<string | null>(null);
  const [confirmDeal, setConfirmDeal] = useState<DealDTO | null>(null);

  const projects = useFetch<{ data: ProjectDTO[] }>('/projects?pageSize=100');
  const wonDeals = useFetch<{ data: DealDTO[] }>('/deals?status=WON&pageSize=100');

  const convertible = (wonDeals.data?.data ?? []).filter((deal) => !deal.convertedProjectId);

  async function convert(dealId: string) {
    setConverting(dealId);
    try {
      const project = await api.post<ProjectDTO>(`/deals/${dealId}/convert-to-project`, {});
      await Promise.all([projects.reload(), wonDeals.reload()]);
      setConfirmDeal(null);
      // Land directly on the populated Project — the visual proof of the
      // promise, not a blank record waiting to be filled in (§27.6).
      setOpenId(project.id);
    } finally {
      setConverting(null);
    }
  }

  if (projects.loading && !projects.data) return <Spinner />;

  return (
    <>
      <div className="page-header">
        <h1>Delivery</h1>
        <div className="small muted">
          Client work after the sale — with the conversation that led to it still attached.
        </div>
      </div>

      {convertible.length > 0 && (
        <div className="card" style={{ padding: 14, marginBottom: 18 }}>
          <h3 style={{ marginBottom: 8 }}>Won and ready to start</h3>
          <div className="col">
            {convertible.map((deal) => (
              <div key={deal.id} className="spread">
                <div>
                  <div style={{ fontWeight: 500 }}>{deal.name}</div>
                  <div className="small muted">
                    {deal.company?.name} · <Money cents={deal.valueCents} />
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setConfirmDeal(deal)}
                  disabled={converting === deal.id}
                >
                  Convert to project <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="small subtle" style={{ marginTop: 10 }}>
            Contacts, company details and the full email history come across. Nothing is re-entered.
          </div>
        </div>
      )}

      {(projects.data?.data.length ?? 0) === 0 ? (
        <Empty
          title="No projects yet"
          hint="Convert a won deal and its whole history follows it into delivery."
        />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Client</th>
                <th>Status</th>
                <th>Milestones</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {projects.data?.data.map((project) => {
                const done = project.milestones.filter((m) => m.completedAt).length;
                return (
                  <tr
                    key={project.id}
                    className="clickable"
                    onClick={() => {
                      setOpenId(project.id);
                      setParams({ focus: project.id });
                    }}
                  >
                    <td style={{ fontWeight: 500 }}>{project.name}</td>
                    <td className="muted">{project.company?.name ?? '—'}</td>
                    <td>
                      <span
                        className={`chip ${project.status === 'ACTIVE' ? 'chip-accent' : 'chip-human'}`}
                      >
                        {project.status.toLowerCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="small muted">
                      {project.milestones.length === 0
                        ? '—'
                        : `${done}/${project.milestones.length}`}
                    </td>
                    <td className="small muted">
                      <TimeAgo iso={project.startedAt} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmDeal && (
        <ConvertModal
          deal={confirmDeal}
          busy={converting === confirmDeal.id}
          onCancel={() => setConfirmDeal(null)}
          onConfirm={() => convert(confirmDeal.id)}
        />
      )}

      <ProjectDrawer
        projectId={openId}
        onClose={() => {
          setOpenId(null);
          setParams({});
          void projects.reload();
        }}
      />
    </>
  );
}

/**
 * The conversion moment (§27.6).
 *
 * A single confirmation, not a wizard — and it states what carries over
 * *explicitly* rather than leaving the user to hope. The whole anxiety this
 * screen addresses is "will I lose the context we built during the sale?", so
 * answering it in words before the click is the point.
 */
function ConvertModal({
  deal,
  busy,
  onCancel,
  onConfirm,
}: {
  deal: DealDTO;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const activities = useFetch<{ data: unknown[] }>(`/deals/${deal.id}/activities`, [deal.id]);
  const activityCount = activities.data?.data.length ?? 0;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="convert-title"
        onClick={(event) => event.stopPropagation()}
        style={{ padding: 20 }}
      >
        <h2 id="convert-title" style={{ marginBottom: 6 }}>
          Convert to a project
        </h2>
        <div className="small muted" style={{ marginBottom: 14 }}>
          {deal.name}
        </div>

        <div className="card" style={{ padding: 14, marginBottom: 16 }}>
          <div className="small" style={{ fontWeight: 600, marginBottom: 8 }}>
            What comes across
          </div>
          <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.9 }}>
            <li>
              <strong>{deal.company?.name ?? 'The company'}</strong> and its details
            </li>
            <li>
              <strong>
                {deal.contacts.length} contact{deal.contacts.length === 1 ? '' : 's'}
              </strong>
              {deal.contacts.length > 0 && (
                <span className="muted">
                  {' '}
                  — {deal.contacts.map((c) => c.contact.fullName).join(', ')}
                </span>
              )}
            </li>
            <li>
              <strong>
                {activityCount} captured interaction{activityCount === 1 ? '' : 's'}
              </strong>{' '}
              <span className="muted">— the whole conversation that led to the sale</span>
            </li>
          </ul>
          <div className="small subtle" style={{ marginTop: 10 }}>
            Capture keeps running on the same people. New email from this client lands on the
            project automatically — nothing to re-link.
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={busy} autoFocus>
            {busy ? 'Converting…' : 'Convert to Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectDrawer({
  projectId,
  onClose,
}: {
  projectId: string | null;
  onClose: () => void;
}) {
  const project = useFetch<ProjectDTO>(projectId ? `/projects/${projectId}` : null, [projectId]);
  const activities = useFetch<{ data: ActivityDTO[] }>(
    projectId ? `/projects/${projectId}/activities` : null,
    [projectId],
  );
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');

  const reload = useCallback(() => {
    void project.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function addMilestone() {
    if (!title.trim() || !projectId) return;
    await api.post(`/projects/${projectId}/milestones`, {
      title,
      dueDate: due ? new Date(due).toISOString() : null,
    });
    setTitle('');
    setDue('');
    reload();
  }

  async function toggle(milestoneId: string, completed: boolean) {
    if (!projectId) return;
    await api.patch(`/projects/${projectId}/milestones/${milestoneId}`, { completed });
    reload();
  }

  async function setStatus(status: string) {
    if (!projectId) return;
    await api.patch(`/projects/${projectId}`, { status });
    reload();
  }

  if (!projectId) return null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={project.data?.name ?? 'Project'}
      subtitle={project.data?.company?.name}
    >
      {project.loading && !project.data && <Spinner />}

      {project.data && (
        <>
          <div className="row wrap">
            {(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
              <button
                key={status}
                className={`btn btn-sm ${project.data!.status === status ? 'btn-primary' : ''}`}
                onClick={() => setStatus(status)}
              >
                {status.toLowerCase().replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="col">
            <h3>Milestones</h3>
            {project.data.milestones.length === 0 && (
              <div className="small subtle">
                No milestones yet. Client details already came across from the deal — you only need
                the dates.
              </div>
            )}
            {project.data.milestones.map((milestone) => (
              <div key={milestone.id} className="spread card" style={{ padding: 10 }}>
                <div className="row">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggle(milestone.id, !milestone.completedAt)}
                    aria-label="Toggle complete"
                  >
                    <Check
                      size={15}
                      color={milestone.completedAt ? 'var(--positive)' : 'var(--text-subtle)'}
                    />
                  </button>
                  <div>
                    <div
                      style={{
                        fontWeight: 500,
                        textDecoration: milestone.completedAt ? 'line-through' : undefined,
                        color: milestone.completedAt ? 'var(--text-muted)' : undefined,
                      }}
                    >
                      {milestone.title}
                    </div>
                    {milestone.dueDate && (
                      <div className="small muted">
                        due {new Date(milestone.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="row">
              <input
                placeholder="Add a milestone…"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void addMilestone()}
              />
              <input
                type="date"
                value={due}
                onChange={(event) => setDue(event.target.value)}
                style={{ width: 150 }}
              />
              <button className="btn btn-sm" onClick={addMilestone} disabled={!title.trim()}>
                <Plus size={13} />
              </button>
            </div>
          </div>

          <div className="col">
            <h3>People</h3>
            {project.data.contacts.map((pc) => (
              <div key={pc.contactId} className="card" style={{ padding: 10 }}>
                <div style={{ fontWeight: 500 }}>{pc.contact.fullName}</div>
                <div className="small muted">{pc.contact.title ?? pc.contact.email}</div>
              </div>
            ))}
          </div>

          <div className="col">
            <h3>Full history</h3>
            {/*
              This includes everything captured before the sale. It is the
              reason a client relationship does not go quiet after signature —
              the conversation explaining what they wanted is still right here.
            */}
            <div className="small muted">
              Everything from the original deal, plus anything captured since.
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
