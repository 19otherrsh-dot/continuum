import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Check, Mail, ShieldCheck, X } from 'lucide-react';
import { api } from '../lib/api';
import { useSession } from '../lib/session';
import { Spinner } from '../components/ui';

interface Disclosure {
  captured: string[];
  notCaptured: string[];
  controls: string[];
}

interface SyncResult {
  polled: number;
  created: number;
  filtered: number;
  duplicates: number;
}

/**
 * Journey 1 — the first five minutes.
 *
 * Two steps and no configuration screen: connect a mailbox, watch real records
 * appear. Schema customisation exists but is never in the way, because the
 * product's claim is that it fills itself in — asking someone to design a
 * pipeline before they have seen a single captured email undercuts that.
 */
export function Onboarding() {
  const navigate = useNavigate();
  const { workspace } = useSession();
  const [disclosure, setDisclosure] = useState<Disclosure | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'connect' | 'capturing' | 'done'>('connect');

  useEffect(() => {
    api
      .get<Disclosure>('/integrations/disclosure')
      .then(setDisclosure)
      .catch(() => undefined);
  }, []);

  async function connect(provider: 'google' | 'microsoft') {
    setConnecting(true);
    setError(null);
    try {
      const start = await api.post<{ authorizationUrl: string; simulated: boolean }>(
        `/integrations/${provider}/connect`,
      );

      if (!start.simulated) {
        // Real providers take the user through their own consent screen.
        window.location.href = start.authorizationUrl;
        return;
      }

      // Simulator mode: the callback can be hit directly.
      await fetch(start.authorizationUrl, { credentials: 'include' });
      setStep('capturing');

      const sync = await api.post<SyncResult>('/integrations/sync-now');
      setResult(sync);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect that account');
      setStep('connect');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="card auth-card" style={{ width: 'min(620px, 100%)' }}>
        <div className="stepper">
          <span className="step-dot done" />
          <span className={`step-dot ${step !== 'connect' ? 'done' : ''}`} />
        </div>

        {step === 'done' && result ? (
          <>
            <h1>Continuum is already filling itself in</h1>
            <p className="muted">
              We looked at the last 30 days of mail and calendar for{' '}
              {workspace?.name ?? 'your workspace'}. Nothing was typed in by hand.
            </p>

            <div className="metric-grid" style={{ margin: '18px 0' }}>
              <div className="card metric">
                <div className="metric-value">{result.created}</div>
                <div className="metric-label">activities captured</div>
              </div>
              <div className="card metric">
                <div className="metric-value">{result.filtered}</div>
                <div className="metric-label">newsletters &amp; bots filtered out</div>
              </div>
            </div>

            <p className="small muted">
              Anything the system inferred rather than read directly is waiting for you to confirm
              — it has not changed a single record on its own.
            </p>

            <button
              className="btn btn-primary"
              style={{ marginTop: 8 }}
              onClick={() => navigate('/pipeline')}
            >
              Go to my pipeline
            </button>
          </>
        ) : step === 'capturing' ? (
          <>
            <h1>Reading your last 30 days…</h1>
            <p className="muted">
              Matching senders to companies, building the timeline, and summarizing what was said.
            </p>
            <Spinner label="Capturing" />
          </>
        ) : (
          <>
            <h1>Connect a mailbox</h1>
            <p className="muted">
              This is the only setup step. Once a mailbox is connected, your pipeline stays current
              without anyone logging anything.
            </p>

            {disclosure && (
              <div className="card" style={{ padding: 14, margin: '16px 0' }}>
                <div className="row" style={{ marginBottom: 10 }}>
                  <ShieldCheck size={16} color="var(--positive)" />
                  <strong className="small">Exactly what this does</strong>
                </div>

                <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>
                  Captured
                </div>
                <ul className="small muted" style={{ margin: '0 0 12px', paddingLeft: 18 }}>
                  {disclosure.captured.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                {/*
                  Stating what is *not* captured is the part that earns consent.
                  A vague permission prompt is why people distrust automatic
                  capture in the first place.
                */}
                <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>
                  Never captured
                </div>
                <ul className="small muted" style={{ margin: '0 0 12px', paddingLeft: 18 }}>
                  {disclosure.notCaptured.map((item) => (
                    <li key={item}>
                      <X size={11} style={{ verticalAlign: -1 }} /> {item}
                    </li>
                  ))}
                </ul>

                <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>
                  You stay in control
                </div>
                <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                  {disclosure.controls.map((item) => (
                    <li key={item}>
                      <Check size={11} style={{ verticalAlign: -1 }} /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && (
              <div className="banner small" style={{ marginBottom: 12 }}>
                {error}
              </div>
            )}

            <div className="col">
              <button
                className="btn btn-primary"
                onClick={() => connect('google')}
                disabled={connecting}
              >
                <Mail size={15} /> Connect Google Workspace
              </button>
              <button className="btn" onClick={() => connect('microsoft')} disabled={connecting}>
                <Mail size={15} /> Connect Microsoft 365
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/pipeline')}>
                Skip for now
              </button>
            </div>

            <div className="row small subtle" style={{ marginTop: 14 }}>
              <Bot size={13} /> Gmail and Calendar connect together — one action, both synced.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Landing page after a real OAuth redirect. */
export function OnboardingConnected() {
  const navigate = useNavigate();
  const [result, setResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    api
      .post<SyncResult>('/integrations/sync-now')
      .then(setResult)
      .catch(() => undefined);
  }, []);

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1>Mailbox connected</h1>
        {result ? (
          <>
            <p className="muted">
              {result.created} activities captured, {result.filtered} newsletters and automated
              messages filtered out.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/pipeline')}>
              Go to my pipeline
            </button>
          </>
        ) : (
          <Spinner label="Pulling your recent history" />
        )}
      </div>
    </div>
  );
}
