import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead, markAllRead } from '../services/api';

const TYPE_META = {
  invoice_created: {
    short: 'INV',
    label: 'Invoice',
    bg: 'bg-brand-muted text-brand border border-brand/25',
    border: 'border-l-brand',
  },
  reminder_sent: {
    short: 'RMD',
    label: 'Reminder',
    bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    border: 'border-l-amber-500',
  },
  escalation: {
    short: 'ESC',
    label: 'Escalation',
    bg: 'bg-red-500/10 text-red-400 border border-red-500/20',
    border: 'border-l-red-500',
  },
  payment_received: {
    short: 'PAY',
    label: 'Payment',
    bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    border: 'border-l-emerald-500',
  },
};

const PRIORITY_BADGE = {
  high: 'bg-red-500/15 text-red-400 border border-red-500/25',
  medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  low: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/25',
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getNotifications()
      .then(({ data }) => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id) => {
    await markNotificationRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAll = async () => {
    await markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'high') return n.priority === 'high';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <main className="p-5 md:p-7 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Notifications</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            className="text-sm text-brand hover:text-indigo-300 font-medium border border-brand/30 px-4 py-2 rounded-lg transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          { key: 'high', label: 'High priority' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filter === key
                ? 'bg-brand border-brand text-white shadow-brand-md'
                : 'bg-app-raised border-line-subtle text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-app-raised border border-line-subtle rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-app-raised border border-line-subtle rounded-xl p-12 text-center">
          <p className="text-zinc-400 text-sm font-medium">No notifications</p>
          <p className="text-zinc-600 text-xs mt-1">
            {filter === 'unread'
              ? 'Everything has been read.'
              : filter === 'high'
                ? 'No high-priority items.'
                : 'Activity will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.invoice_created;
            return (
              <button
                key={n._id}
                type="button"
                onClick={() => !n.read && handleMarkRead(n._id)}
                className={`w-full text-left bg-app-raised border rounded-xl px-4 py-4 transition-colors hover:border-zinc-600 border-l-4 ${
                  n.read ? 'border-line-subtle opacity-75' : `border-line-subtle ${meta.border}`
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-brand shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-brand-muted border border-brand/20">
                    {meta.short}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className={`text-sm font-medium ${n.read ? 'text-zinc-400' : 'text-zinc-100'}`}>{n.title}</p>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />}
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${meta.bg}`}>{meta.label}</span>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border ${PRIORITY_BADGE[n.priority] || PRIORITY_BADGE.low}`}
                      >
                        {n.priority}
                      </span>
                      <span className="text-[11px] text-zinc-600 ml-auto">{timeAgo(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
