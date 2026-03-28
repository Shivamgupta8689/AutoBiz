import { useEffect, useState, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getInvoices, getInsights, setBusyMode as syncBusyMode } from '../services/api';
import { Link } from 'react-router-dom';

const STATUS_STYLES = {
  paid:    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  unpaid:  'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  overdue: 'bg-red-500/15 text-red-400 border border-red-500/20',
};

// Animated counter hook
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const raf = useRef();
  useEffect(() => {
    if (!target) { setVal(0); return; }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(eased * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

function StatCard({ label, rawValue, prefix = '', suffix = '', abbr, delay }) {
  const numVal = typeof rawValue === 'number' ? rawValue : 0;
  const animated = useCountUp(numVal);
  const display = prefix + (numVal > 999
    ? (animated / 1000).toFixed(animated >= 10000 ? 0 : 1) + 'k'
    : animated
  ) + suffix;

  return (
    <div
      className={`relative rounded-xl p-5 border border-line-subtle overflow-hidden group hover:border-brand/25 transition-colors animate-fadeSlideUp ${delay}`}
      style={{ background: '#13131a' }}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
        <span className="text-[10px] font-semibold text-brand tabular-nums px-1.5 py-0.5 rounded bg-brand-muted border border-brand/20">{abbr}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight tabular-nums">{display}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-app-raised border border-line-subtle rounded-lg px-4 py-2.5 text-sm shadow-brand">
      <p className="text-zinc-500 mb-1 text-xs">{label}</p>
      <p className="text-brand font-semibold tabular-nums">₹{Number(payload[0].value).toLocaleString('en-IN')}</p>
    </div>
  );
};

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-app-raised border border-line-subtle rounded-lg px-3 py-2 text-sm shadow-brand">
      <p className="text-zinc-100 font-medium text-sm">{payload[0].name}: {payload[0].value}</p>
    </div>
  );
};

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState(() => localStorage.getItem('lastReminderRun'));

  // Busy mode — persisted in localStorage
  const [busyMode, setBusyMode] = useState(() => localStorage.getItem('busyMode') === 'true');

  // AI Insights
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const toggleBusyMode = () => {
    const next = !busyMode;
    setBusyMode(next);
    localStorage.setItem('busyMode', String(next));
    syncBusyMode(next).catch(() => {}); // sync with backend (fire-and-forget)
  };

  useEffect(() => {
    getInvoices()
      .then(({ data }) => setInvoices(data))
      .finally(() => setLoading(false));

    getInsights()
      .then(({ data }) => setInsights(data.insights || []))
      .catch(() => setInsights([]))
      .finally(() => setInsightsLoading(false));
  }, []);

  // Stats
  const totalBilled   = invoices.reduce((s, i) => s + i.total, 0);
  const outstanding   = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);
  const overdueCount  = invoices.filter(i => i.status === 'overdue').length;
  const paidThisMonth = invoices.filter(i => {
    if (i.status !== 'paid') return false;
    const d = new Date(i.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, i) => s + i.total, 0);

  // Line chart: last 30 days grouped by date
  const chartData = (() => {
    const map = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      map[key] = 0;
    }
    invoices.forEach(inv => {
      const key = new Date(inv.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (map[key] !== undefined) map[key] += inv.total;
    });
    return Object.entries(map).map(([date, amount]) => ({ date, amount }));
  })();

  // Donut chart
  const pieData = [
    { name: 'Paid',    value: invoices.filter(i => i.status === 'paid').length },
    { name: 'Unpaid',  value: invoices.filter(i => i.status === 'unpaid').length },
    { name: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length },
  ].filter(d => d.value > 0);

  // Last run display
  const lastRunText = lastRun
    ? (() => {
        const mins = Math.floor((Date.now() - Number(lastRun)) / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
        return `${Math.floor(mins / 60)}h ago`;
      })()
    : 'Never';

  return (
    <main className="p-5 md:p-7 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Invoices and cash position</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleBusyMode}
            className={`inline-flex items-center gap-2 font-medium px-4 py-2 rounded-lg text-sm transition-colors border ${
              busyMode
                ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                : 'bg-app-raised border-line-subtle text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${busyMode ? 'bg-orange-400 animate-pulse' : 'bg-zinc-500'}`} />
            Busy mode {busyMode ? 'on' : 'off'}
          </button>

          <Link
            to="/reminders"
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium px-5 py-2 rounded-lg shadow-brand-md transition-colors text-sm"
          >
            Run reminders
          </Link>
        </div>
      </div>

      {/* Busy mode warning banner */}
      {busyMode && (
        <div className="flex flex-wrap items-center gap-3 bg-orange-500/10 border border-orange-500/25 rounded-lg px-4 py-3 mb-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-orange-200">Busy mode is on — outbound reminders are paused</p>
            <p className="text-xs text-orange-400/80 mt-0.5">New reminder runs will be suppressed until you disable this.</p>
          </div>
          <button
            type="button"
            onClick={toggleBusyMode}
            className="text-xs text-orange-300 hover:text-orange-100 font-medium border border-orange-500/35 px-3 py-1.5 rounded-md transition-colors shrink-0"
          >
            Turn off
          </button>
        </div>
      )}

      {/* Automation status bar */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-2.5 mb-7 ${
        busyMode
          ? 'bg-orange-950/30 border border-orange-900/40'
          : 'bg-[#0d1a0d] border border-emerald-900/50'
      }`}>
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${busyMode ? 'bg-orange-400' : 'bg-emerald-400'}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${busyMode ? 'bg-orange-500' : 'bg-emerald-500'}`} />
        </span>
        <p className={`text-xs font-medium ${busyMode ? 'text-orange-400' : 'text-emerald-400'}`}>
          Auto-reminder engine: <span className="font-bold">{busyMode ? 'PAUSED' : 'ACTIVE'}</span>
          <span className={`ml-2 ${busyMode ? 'text-orange-600' : 'text-emerald-600'}`}>— Last run: {lastRunText}</span>
        </p>
        <div className="ml-auto text-[10px] text-zinc-600 uppercase tracking-wide hidden sm:block">Rules: suppress · delay · send · escalate</div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="rounded-xl bg-app-raised border border-line-subtle h-28 animate-pulse" />
          ))
        ) : (
          <>
            <StatCard label="Total invoices" rawValue={invoices.length} abbr="N" delay="delay-100" />
            <StatCard label="Outstanding" rawValue={Math.round(outstanding / 100) * 100} prefix="₹" abbr="₹" delay="delay-200" />
            <StatCard label="Overdue" rawValue={overdueCount} abbr="!" delay="delay-300" />
            <StatCard label="Paid this month" rawValue={Math.round(paidThisMonth / 100) * 100} prefix="₹" abbr="✓" delay="delay-400" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-7">
        <div className="lg:col-span-2 bg-app-raised border border-line-subtle rounded-xl p-5">
          <p className="text-sm font-medium text-zinc-100 mb-0.5">Invoice volume (30 days)</p>
          <p className="text-xs text-zinc-500 mb-4">Amount billed per day</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272f" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} interval={4} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} tickLine={false} axisLine={false} tickFormatter={v => v > 0 ? `₹${v/1000}k` : '₹0'} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-app-raised border border-line-subtle rounded-xl p-5 flex flex-col">
          <p className="text-sm font-medium text-zinc-100 mb-0.5">Status</p>
          <p className="text-xs text-zinc-500 mb-3">By count</p>
          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">No data yet</div>
          ) : (
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % 3]} stroke="transparent" />)}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div className="mb-7">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h2 className="text-base font-medium text-zinc-100">Insights</h2>
          <span className="text-[10px] text-zinc-400 bg-app-input border border-line-subtle px-2 py-0.5 rounded uppercase tracking-wide">Generated</span>
          <button
            type="button"
            onClick={() => {
              setInsightsLoading(true);
              getInsights()
                .then(({ data }) => setInsights(data.insights || []))
                .catch(() => setInsights([]))
                .finally(() => setInsightsLoading(false));
            }}
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 border border-line-subtle hover:border-zinc-600 px-3 py-1 rounded-md transition-colors"
          >
            Refresh
          </button>
        </div>
        {insightsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-app-raised border border-line-subtle rounded-xl animate-pulse" />)}
          </div>
        ) : insights.length === 0 ? (
          <div className="bg-app-raised border border-line-subtle rounded-xl px-5 py-4 text-sm text-zinc-500">
            No insights yet. Add invoices to generate summaries.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, i) => {
              const title = insight?.title || `Insight ${i + 1}`;
              const text  = insight?.insight || (typeof insight === 'string' ? insight : '');
              return (
                <div
                  key={i}
                  className="bg-app-raised border border-line-subtle hover:border-brand/25 rounded-xl p-5 transition-colors"
                >
                  <p className="text-sm font-medium text-zinc-100 mb-2">{title}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed">{text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent invoices */}
      <div className="bg-app-raised border border-line-subtle rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line-subtle">
          <p className="text-sm font-medium text-zinc-100">Recent invoices</p>
          <Link to="/invoices" className="text-xs text-brand hover:text-indigo-300">View all</Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-app-input rounded-lg animate-pulse" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-zinc-500 text-sm">No invoices yet.</p>
            <Link to="/invoices" className="text-brand hover:text-indigo-300 text-xs mt-2 inline-block font-medium">Create invoice</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[550px]">
              <thead>
                <tr className="text-[11px] text-zinc-500 uppercase tracking-wide border-b border-line-subtle">
                  {['Invoice #', 'Customer', 'Amount', 'Due', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 6).map((inv, i) => (
                  <tr key={inv._id} className={`hover:bg-app-input/50 transition-colors ${i < invoices.slice(0,6).length - 1 ? 'border-b border-line-subtle' : ''}`}>
                    <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-zinc-100 text-sm">{inv.customerId?.name}</div>
                      {inv.customerId?.businessName && <div className="text-[11px] text-zinc-500">{inv.customerId.businessName}</div>}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-zinc-100 tabular-nums">₹{inv.total?.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs whitespace-nowrap">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[inv.status]}`}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
