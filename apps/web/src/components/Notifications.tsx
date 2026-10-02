import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationDTO } from '@continuum/shared';
import { Bell } from 'lucide-react';
import { api, openEventStream } from '../lib/api';
import { TimeAgo } from './ui';

/**
 * Notification centre.
 *
 * Backed by the SSE stream, so a stalling flag or a new agent proposal appears
 * while the user is looking at the page — no refresh (FR-NOTIF-01).
 */
export function Notifications() {
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; title: string }[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: NotificationDTO[]; unread: number }>('/notifications');
      setItems(response.data);
      setUnread(response.unread);
    } catch {
      /* a failed poll should not break the page */
    }
  }, []);

  useEffect(() => {
    void load();
    const close = openEventStream((_type, data) => {
      const notification = data as NotificationDTO;
      setItems((prev) => [notification, ...prev].slice(0, 50));
      setUnread((n) => n + 1);
      setToasts((prev) => [...prev, { id: notification.id, title: notification.title }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== notification.id)),
        6000,
      );
    });
    return close;
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function markAllRead() {
    await api.post('/notifications/read-all', {});
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
  }

  return (
    <>
      <div style={{ position: 'relative' }} ref={panelRef}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setOpen((v) => !v)}
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unread > 0 && (
            <span className="chip chip-agent" style={{ padding: '0 5px' }}>
              {unread}
            </span>
          )}
        </button>

        {open && (
          <div
            className="card"
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              width: 330,
              zIndex: 70,
              maxHeight: 420,
              overflow: 'auto',
            }}
          >
            <div className="spread" style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
              <strong className="small">Notifications</strong>
              {unread > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>

            {items.length === 0 && <div className="empty small">Nothing yet.</div>}

            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border)',
                  background: item.readAt ? undefined : 'var(--accent-soft)',
                }}
              >
                <div style={{ fontWeight: 500 }}>{item.title}</div>
                {item.body && <div className="small muted">{item.body}</div>}
                <div className="small subtle" style={{ marginTop: 2 }}>
                  <TimeAgo iso={item.createdAt} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast small">
            {toast.title}
          </div>
        ))}
      </div>
    </>
  );
}
