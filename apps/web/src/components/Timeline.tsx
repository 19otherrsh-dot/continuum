import { useState } from 'react';
import type { ActivityDTO } from '@continuum/shared';
import { AlertCircle, CalendarDays, Mail, MessageSquare, Phone, PhoneOff } from 'lucide-react';
import { SentimentBadge, SourceBadge, TimeAgo } from './ui';

function iconFor(activity: ActivityDTO) {
  if (activity.type === 'CALL') {
    return activity.callOutcome === 'CONNECTED' ? <Phone size={14} /> : <PhoneOff size={14} />;
  }
  if (activity.type === 'MEETING') return <CalendarDays size={14} />;
  if (activity.type === 'NOTE') return <MessageSquare size={14} />;
  return <Mail size={14} />;
}

function headline(activity: ActivityDTO): string {
  if (activity.subject) return activity.subject;
  if (activity.type === 'CALL') return 'Call';
  if (activity.type === 'NOTE') return 'Note';
  return 'Activity';
}

/**
 * The Signal Thread (§27.4) — the product's name for the unified activity
 * timeline shown on Contact, Company, Deal and Project records (FR-AC-05).
 *
 * Captured email, calls, meetings and manual notes appear in one chronological
 * list connected by a continuous line, so a relationship reads as a single
 * ongoing thread. Entries are visually equal regardless of origin; the source
 * badge is informational, never a signal that an auto-captured entry is worth
 * less than a typed one.
 */
export function SignalThread({ activities }: { activities: ActivityDTO[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (activities.length === 0) {
    return (
      <div className="empty small">
        Nothing captured yet. Connect a mailbox and activity will appear here on its own.
      </div>
    );
  }

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="timeline">
      {activities.map((activity) => {
        const open = expanded.has(activity.id);
        const body = activity.transcript || activity.body || '';

        return (
          <div key={activity.id} className="timeline-item">
            <div
              className={`timeline-icon ${activity.source === 'AGENT_INFERRED' ? 'captured' : ''}`}
            >
              {iconFor(activity)}
            </div>

            <div className="grow">
              <div className="spread">
                <div className="row wrap" style={{ gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>{headline(activity)}</span>
                  <SourceBadge source={activity.source} compact />
                  <SentimentBadge sentiment={activity.sentiment} />
                  {activity.callOutcome && activity.callOutcome !== 'CONNECTED' && (
                    <span className="chip chip-warn">
                      {activity.callOutcome === 'ATTEMPTED_NO_CONNECT'
                        ? 'No answer'
                        : activity.callOutcome === 'VOICEMAIL'
                          ? 'Voicemail'
                          : 'Failed'}
                    </span>
                  )}
                </div>
                <span className="small subtle" style={{ whiteSpace: 'nowrap' }}>
                  <TimeAgo iso={activity.occurredAt} />
                </span>
              </div>

              {/*
                A missing summary is stated plainly rather than hidden. The
                activity itself is still complete and correct — only the AI
                step failed, and saying so is more useful than a blank space.
              */}
              {activity.summaryStatus === 'FAILED' && (
                <div className="row small muted" style={{ marginTop: 4 }}>
                  <AlertCircle size={12} /> Summary unavailable — the interaction itself was
                  captured, with participants and timing intact.
                </div>
              )}
              {activity.summaryStatus === 'PENDING' && (
                <div className="small subtle" style={{ marginTop: 4 }}>
                  Summarizing…
                </div>
              )}

              {activity.aiSummary && (
                <div style={{ marginTop: 5 }}>{activity.aiSummary}</div>
              )}

              {activity.nextStep && (
                <div className="small" style={{ marginTop: 6 }}>
                  <span style={{ fontWeight: 500 }}>Next step:</span>{' '}
                  <span className="muted">{activity.nextStep}</span>
                </div>
              )}

              {activity.participants.length > 0 && (
                <div className="small subtle" style={{ marginTop: 5 }}>
                  {activity.participants.map((p) => p.fullName).join(', ')}
                  {activity.durationSeconds
                    ? ` · ${Math.round(activity.durationSeconds / 60)} min`
                    : ''}
                </div>
              )}

              {body && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 6, paddingLeft: 0 }}
                  onClick={() => toggle(activity.id)}
                >
                  {open
                    ? 'Hide'
                    : activity.transcript
                      ? 'Show transcript'
                      : // Captured messages are stored as an excerpt (§30), so
                        // the label should not promise the full original.
                        activity.source === 'AGENT_INFERRED'
                        ? 'Show captured excerpt'
                        : 'Show full note'}
                </button>
              )}

              {open && body && (
                <pre
                  className="small"
                  style={{
                    marginTop: 6,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    background: 'var(--surface-2)',
                    padding: 10,
                    borderRadius: 6,
                    color: 'var(--text-muted)',
                  }}
                >
                  {body}
                </pre>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Retained alias: the component is referred to as the Signal Thread throughout the product. */
export { SignalThread as Timeline };
