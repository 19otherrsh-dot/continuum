import { useEffect, type ReactNode } from 'react';
import type { RecordSource, Sentiment } from '@continuum/shared';
import { Bot, Check, Download, Sparkles, User, X } from 'lucide-react';

/**
 * Provenance badge.
 *
 * Every field the agent can set renders one of these. The product's central
 * claim is that inferred data is trustworthy *because* you can always see it
 * is inferred — a value that silently looks human-entered would undo that.
 */
export function SourceBadge({ source, compact }: { source: RecordSource; compact?: boolean }) {
  if (source === 'HUMAN') {
    if (compact) return null;
    return (
      <span className="chip chip-human" title="Entered by a person">
        <User size={11} /> Entered
      </span>
    );
  }
  if (source === 'AGENT_INFERRED') {
    return (
      <span className="chip chip-agent" title="Captured automatically and confirmed">
        <Bot size={11} /> {compact ? 'Auto' : 'Auto-captured'}
      </span>
    );
  }
  if (source === 'ENRICHED') {
    return (
      <span className="chip chip-accent" title="Enriched from an external source">
        <Sparkles size={11} /> Enriched
      </span>
    );
  }
  return (
    <span className="chip chip-human" title="Imported">
      <Download size={11} /> Imported
    </span>
  );
}

export function SentimentBadge({ sentiment }: { sentiment: Sentiment | null }) {
  if (!sentiment) return null;
  const cls =
    sentiment === 'POSITIVE' ? 'chip-positive' : sentiment === 'NEGATIVE' ? 'chip-negative' : 'chip-human';
  const label =
    sentiment === 'POSITIVE' ? 'Positive' : sentiment === 'NEGATIVE' ? 'Negative' : 'Neutral';
  return <span className={`chip ${cls}`}>{label}</span>;
}

/**
 * Confidence, shown qualitatively (§25.3, tenet 38).
 *
 * Deliberately not a percentage. "86%" implies a calibration the model does
 * not have and invites users to reason about a gap between 86 and 84 that
 * carries no information. Two tiers and a filled indicator convey what is
 * actually actionable: whether this is worth a glance or worth a check.
 *
 * Low-confidence proposals never reach the UI at all — they are not persisted
 * (FR-AGENT-06) — so there is no third state to render.
 */
export function Confidence({ tier }: { tier: 'HIGH' | 'MEDIUM' }) {
  const strong = tier === 'HIGH';
  return (
    <span
      className="row small muted"
      title={
        strong
          ? 'The message states this outright.'
          : 'This was inferred rather than stated — worth a look before confirming.'
      }
    >
      <span className="confidence-bar" aria-hidden="true">
        <span
          className="confidence-fill"
          style={{
            width: strong ? '100%' : '55%',
            background: strong ? 'var(--agent)' : 'var(--text-subtle)',
          }}
        />
      </span>
      {strong ? 'Strong signal' : 'Worth checking'}
    </span>
  );
}

export function Money({ cents, currency = 'USD' }: { cents: number | null; currency?: string }) {
  if (cents === null || cents === undefined) return <span className="subtle">—</span>;
  return (
    <>
      {new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }).format(cents / 100)}
    </>
  );
}

/** Relative time — "3 days ago" is what a rep actually reasons about. */
export function TimeAgo({ iso }: { iso: string | null }) {
  if (!iso) return <span className="subtle">never</span>;

  const then = new Date(iso).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  const absolute = new Date(iso).toLocaleString();

  const label =
    seconds < 60
      ? 'just now'
      : seconds < 3600
        ? `${Math.floor(seconds / 60)}m ago`
        : seconds < 86_400
          ? `${Math.floor(seconds / 3600)}h ago`
          : seconds < 2_592_000
            ? `${Math.floor(seconds / 86_400)}d ago`
            : new Date(iso).toLocaleDateString();

  return <span title={absolute}>{label}</span>;
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div style={{ fontWeight: 500, color: 'var(--text)' }}>{title}</div>
      {hint && <div className="small" style={{ marginTop: 4 }}>{hint}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="row muted small" style={{ padding: 16 }}>
      <span className="spinner" /> {label ?? 'Loading…'}
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head spread">
          <div className="grow">
            <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
            {subtitle && <div className="small muted">{subtitle}</div>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}

export function ConfirmButtons({
  onConfirm,
  onReject,
  busy,
  confirmLabel = 'Confirm',
}: {
  onConfirm: () => void;
  onReject: () => void;
  busy?: boolean;
  confirmLabel?: string;
}) {
  return (
    <div className="row">
      <button className="btn btn-agent btn-sm" onClick={onConfirm} disabled={busy}>
        <Check size={14} /> {confirmLabel}
      </button>
      <button className="btn btn-sm" onClick={onReject} disabled={busy}>
        <X size={14} /> Reject
      </button>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="col" style={{ gap: 4 }}>
      <span className="small" style={{ fontWeight: 500 }}>
        {label}
      </span>
      {children}
      {hint && <span className="small subtle">{hint}</span>}
    </label>
  );
}
