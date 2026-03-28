import { useEffect, useState, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getInvoices } from '../services/api';
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

function StatCard({ label, rawValue, prefix = '', suffix = '', icon, gradient, delay }) {
  const numVal = typeof rawValue === 'number' ? rawValue : 0;
  const animated = useCountUp(numVal);
  const display = prefix + (numVal > 999
    ? (animated / 1000).toFixed(animated >= 10000 ? 0 : 1) + 'k'
    : animated
  ) + suffix;

  return (
    <div
      className={`relative rounded-2xl p-5 border border-[#232323] overflow-hidden group hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 animate-fadeSlideUp ${delay}`}
      style={{ background: '#161616' }}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} style={{ opacity: 0.04 }} />
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white tracking-tight">{display}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-xl px-4 py-2.5 text-sm shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-indigo-400 font-bold">₹{Number(payload[0].value).toLocaleString('en-IN')}</p>
    </div>
  );
};

const DonutTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="text-white font-medium">{payload[0].name}: {payload[0].value}</p>
    </div>
  );
};

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState(() => localStorage.getItem('lastReminderRun'));

  useEffect(() => {
    getInvoices()
      .then(({ data }) => setInvoices(data))
      .finally(() => setLoading(false));
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track invoices and business performance</p>
        </div>
        <Link
          to="/reminders"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all text-sm"
        >
          <span>⚡</span> Run Smart Reminders
        </Link>
      </div>

      {/* Automation status bar */}
      <div className="flex items-center gap-3 bg-[#0d1a0d] border border-emerald-900/50 rounded-xl px-4 py-2.5 mb-7">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <p className="text-xs font-medium text-emerald-400">
          Auto-reminder engine: <span className="font-bold">ACTIVE</span>
          <span className="text-emerald-600 ml-2">— Last run: {lastRunText}</span>
        </p>
        <div className="ml-auto text-xs text-gray-600">Rules: SUPPRESS · DELAY · SEND · ESCALATE</div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="rounded-2xl bg-[#161616] border border-[#232323] h-28 animate-pulse" />
          ))
        ) : (
          <>
            <StatCard label="Total Invoices"   rawValue={invoices.length}   icon="🧾" gradient="bg-indigo-500" delay="delay-100" />
            <StatCard label="Outstanding"      rawValue={Math.round(outstanding / 100) * 100} prefix="₹" icon="⏳" gradient="bg-amber-500" delay="delay-200" />
            <StatCard label="Overdue"          rawValue={overdueCount}      icon="🚨" gradient="bg-red-500"   delay="delay-300" />
            <StatCard label="Paid This Month"  rawValue={Math.round(paidThisMonth / 100) * 100} prefix="₹" icon="✅" gradient="bg-emerald-500" delay="delay-400" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-7">
        {/* Line chart — wider */}
        <div className="lg:col-span-2 bg-[#161616] border border-[#232323] rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-1">Invoice Volume — Last 30 Days</p>
          <p className="text-xs text-gray-500 mb-4">Total billed per day</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#666' }} interval={4} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#666' }} tickLine={false} axisLine={false} tickFormatter={v => v > 0 ? `₹${v/1000}k` : '₹0'} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart */}
        <div className="bg-[#161616] border border-[#232323] rounded-2xl p-5 flex flex-col">
          <p className="text-sm font-semibold text-white mb-1">Invoice Status</p>
          <p className="text-xs text-gray-500 mb-3">Distribution by status</p>
          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">No data yet</div>
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

      {/* Recent invoices */}
      <div className="bg-[#161616] border border-[#232323] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#232323]">
          <p className="text-sm font-semibold text-white">Recent Invoices</p>
          <Link to="/invoices" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-[#1e1e1e] rounded-lg animate-pulse" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-2xl mb-2">🧾</p>
            <p className="text-gray-500 text-sm">No invoices yet.</p>
            <Link to="/invoices" className="text-indigo-400 hover:underline text-xs mt-1 inline-block">Create your first invoice →</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[550px]">
              <thead>
                <tr className="text-[11px] text-gray-500 uppercase tracking-wider border-b border-[#232323]">
                  {['Invoice #', 'Customer', 'Amount', 'Due', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 6).map((inv, i) => (
                  <tr key={inv._id} className={`hover:bg-[#1c1c1c] transition-colors ${i < invoices.slice(0,6).length - 1 ? 'border-b border-[#1e1e1e]' : ''}`}>
                    <td className="px-5 py-3.5 font-mono text-xs text-gray-400">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-white text-sm">{inv.customerId?.name}</div>
                      {inv.customerId?.businessName && <div className="text-[11px] text-gray-500">{inv.customerId.businessName}</div>}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-white">₹{inv.total?.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
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
