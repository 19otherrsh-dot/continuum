import type { DashboardDTO } from '@continuum/shared';
import { AlertTriangle, Bot, TrendingUp } from 'lucide-react';
import { useFetch } from '../lib/hooks';
import { useSession } from '../lib/session';
import { Money, Spinner } from '../components/ui';

interface TeamHealthRow {
  userId: string;
  name: string;
  openDeals: number;
  dealsWithRecentActivity: number;
  captureCoverage: number;
  stallingDeals: number;
}

export function Dashboard() {
  const { workspace } = useSession();
  const dashboard = useFetch<DashboardDTO>('/reports/dashboard');
  const health = useFetch<{ data: TeamHealthRow[]; thresholdDays: number }>('/reports/team-health');

  if (dashboard.loading && !dashboard.data) return <Spinner />;
  const data = dashboard.data;
  if (!data) return null;

  const maxStageValue = Math.max(
    1,
    ...data.pipelineValueByStage.map((stage) => stage.valueCents),
  );

  return (
    <>
      <div className="page-header">
        <h1>Overview</h1>
        <div className="small muted">{workspace?.name}</div>
      </div>

      <div className="metric-grid" style={{ marginBottom: 18 }}>
        {/*
          Capture coverage leads the dashboard rather than hiding in an admin
          view (FR-REPORT-04). It is the number that answers "can I trust the
          rest of this screen?", which makes it the most important one here.
        */}
        <div className="card metric">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="metric-value">{data.captureCoverage.percentage}%</div>
            <Bot size={16} color="var(--agent)" />
          </div>
          <div className="metric-label">
            capture coverage — {data.captureCoverage.withRecentActivity} of{' '}
            {data.captureCoverage.totalOpenDeals} open deals have recent activity
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${data.captureCoverage.percentage}%`,
                background:
                  data.captureCoverage.percentage >= 80
                    ? 'var(--positive)'
                    : data.captureCoverage.percentage >= 50
                      ? 'var(--warn)'
                      : 'var(--negative)',
              }}
            />
          </div>
        </div>

        <div className="card metric">
          <div className="metric-value">
            <Money
              cents={data.pipelineValueByStage.reduce((sum, s) => sum + s.valueCents, 0)}
            />
          </div>
          <div className="metric-label">open pipeline value</div>
        </div>

        <div className="card metric">
          <div className="metric-value">{data.wonCount}</div>
          <div className="metric-label">
            won this period · <Money cents={data.wonValueCents} />
          </div>
        </div>

        <div className="card metric">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="metric-value">{data.stallingDeals}</div>
            {data.stallingDeals > 0 && <AlertTriangle size={16} color="var(--warn)" />}
          </div>
          <div className="metric-label">deals gone quiet</div>
        </div>

        <div className="card metric">
          <div className="metric-value">{data.autoCapturedShare}%</div>
          <div className="metric-label">
            of {data.activitiesLast30Days} activities captured automatically
          </div>
        </div>

        <div className="card metric">
          <div className="metric-value">{data.pendingAgentActions}</div>
          <div className="metric-label">suggestions awaiting review</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 18 }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <TrendingUp size={15} />
          <h2>Pipeline by stage</h2>
        </div>

        <div className="col" style={{ gap: 10 }}>
          {data.pipelineValueByStage.map((stage) => (
            <div key={stage.stageId}>
              <div className="spread small">
                <span style={{ fontWeight: 500 }}>{stage.stageName}</span>
                <span className="muted">
                  {stage.count} · <Money cents={stage.valueCents} />
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(stage.valueCents / maxStageValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {(health.data?.data.length ?? 0) > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 0' }}>
            <h2>Team health</h2>
            <div className="small muted">
              Deals with captured activity in the last {health.data?.thresholdDays} days. You should
              not have to ask anyone whether they updated the CRM.
            </div>
          </div>
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Open deals</th>
                <th>Coverage</th>
                <th>Gone quiet</th>
              </tr>
            </thead>
            <tbody>
              {health.data?.data.map((row) => (
                <tr key={row.userId}>
                  <td style={{ fontWeight: 500 }}>{row.name}</td>
                  <td>{row.openDeals}</td>
                  <td>
                    <div className="row">
                      <span className="bar-track" style={{ width: 70, marginTop: 0 }}>
                        <span
                          className="bar-fill"
                          style={{
                            width: `${row.captureCoverage}%`,
                            background:
                              row.captureCoverage >= 80 ? 'var(--positive)' : 'var(--warn)',
                          }}
                        />
                      </span>
                      <span className="small muted">{row.captureCoverage}%</span>
                    </div>
                  </td>
                  <td>
                    {row.stallingDeals > 0 ? (
                      <span className="chip chip-warn">{row.stallingDeals}</span>
                    ) : (
                      <span className="subtle">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
