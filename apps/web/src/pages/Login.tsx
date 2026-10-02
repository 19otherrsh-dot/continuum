import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useSession } from '../lib/session';
import { Field } from '../components/ui';

export function Login() {
  const { login, signup } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [motion, setMotion] = useState<'SALES' | 'AGENCY' | 'HYBRID'>('SALES');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/pipeline');
      } else {
        await signup({ email, password, name, organizationName, motion });
        // Straight to connecting a mailbox — the only setup step there is.
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="card auth-card" onSubmit={submit}>
        <div className="row" style={{ marginBottom: 18 }}>
          <Zap size={20} color="var(--accent)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: 17, letterSpacing: '-0.02em' }}>Continuum</div>
            <div className="small muted">The CRM that fills itself in</div>
          </div>
        </div>

        <div className="col">
          {mode === 'signup' && (
            <>
              <Field label="Your name">
                <input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Company">
                <input
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                />
              </Field>
              <Field
                label="What does your team do?"
                hint="Sets your default pipeline. You can change it later."
              >
                <select
                  value={motion}
                  onChange={(e) => setMotion(e.target.value as typeof motion)}
                >
                  <option value="SALES">Outbound sales</option>
                  <option value="AGENCY">Agency or consultancy</option>
                  <option value="HYBRID">Both</option>
                </select>
              </Field>
            </>
          )}

          <Field label="Work email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </Field>

          {error && (
            <div className="small" style={{ color: 'var(--negative)' }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create workspace'}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Create a workspace instead' : 'I already have an account'}
          </button>
        </div>

        {mode === 'login' && (
          <div className="small subtle" style={{ marginTop: 16, lineHeight: 1.6 }}>
            Demo accounts:
            <br />
            <code className="mono">alex@continuum.test</code> — sales team
            <br />
            <code className="mono">nina@harbor.test</code> — agency
            <br />
            password <code className="mono">password123</code>
          </div>
        )}
      </form>
    </div>
  );
}
