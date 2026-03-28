import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { getUnreadCount, getNotifications, markAllRead, markNotificationRead } from '../services/api';

const Icon = ({ path, path2 }) => (
  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    {path2 && <path strokeLinecap="round" strokeLinejoin="round" d={path2} />}
  </svg>
);

const NAV = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    to: '/invoices',
    label: 'Invoices',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    to: '/customers',
    label: 'Customers',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    to: '/reminders',
    label: 'Reminders',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    to: '/notifications',
    label: 'Notifications',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    icon2: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

// ── Type icon + colors ────────────────────────────────────────────────────────

const TYPE_META = {
  invoice_created:  { icon: '🧾', color: 'text-indigo-400',  border: 'border-indigo-500/40' },
  reminder_sent:    { icon: '📨', color: 'text-amber-400',   border: 'border-amber-500/40' },
  escalation:       { icon: '🚨', color: 'text-red-400',     border: 'border-red-500/40' },
  payment_received: { icon: '✅', color: 'text-emerald-400', border: 'border-emerald-500/40' },
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── Bell dropdown component ───────────────────────────────────────────────────

function BellDropdown({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotifications()
      .then(({ data }) => setItems(data.slice(0, 10)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAll = async () => {
    await markAllRead().catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClick = async (id) => {
    await markNotificationRead(id).catch(() => {});
    setItems(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="absolute bottom-full left-full ml-2 mb-2 w-80 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252525]">
        <p className="text-sm font-semibold text-white">Notifications</p>
        <button
          type="button"
          onClick={handleMarkAll}
          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
        >
          Mark all read
        </button>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-[#252525] rounded-lg animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">No notifications yet</div>
        ) : (
          items.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.invoice_created;
            return (
              <button
                key={n._id}
                onClick={() => handleClick(n._id)}
                className={`w-full text-left px-4 py-3 hover:bg-[#222] transition-all border-l-2 ${n.read ? 'border-transparent' : meta.border}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-base shrink-0 mt-0.5">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${n.read ? 'text-gray-400' : 'text-white'}`}>{n.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[#252525]">
        <Link
          to="/notifications"
          onClick={onClose}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
        >
          View all notifications →
        </Link>
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  // Poll unread count every 30 seconds
  useEffect(() => {
    const fetch = () => getUnreadCount().then(({ data }) => setUnread(data.count || 0)).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen]);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      {/* Overlay on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-60 flex flex-col bg-[#111111] border-r border-[#232323]
          transition-transform duration-300 lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="px-5 py-5 border-b border-[#232323]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
              SI
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Smart Invoicing</p>
              <p className="text-[10px] text-gray-500 leading-tight">Powered by AI</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon, icon2 }) => {
            const active = location.pathname === to;
            const isNotifNav = to === '/notifications';
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium group transition-all
                  ${active
                    ? 'bg-indigo-600/20 text-indigo-400 ring-accent'
                    : 'text-gray-400 hover:bg-[#1e1e1e] hover:text-white'
                  }`}
              >
                <span className={active ? 'text-indigo-400' : 'text-gray-500 group-hover:text-white'}>
                  <Icon path={icon} path2={icon2} />
                </span>
                {label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                {isNotifNav && unread > 0 && !active && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-[#232323]">
          <div className="flex items-center gap-3 mb-3">
            <div ref={bellRef} className="relative">
              <button
                type="button"
                onClick={() => setBellOpen(v => !v)}
                className="relative w-8 h-8 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white hover:border-[#444] transition-all shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {bellOpen && <BellDropdown onClose={() => setBellOpen(false)} />}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-xs text-gray-500 hover:text-red-400 border border-[#2a2a2a] hover:border-red-900 px-3 py-1.5 rounded-lg font-medium text-left flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
