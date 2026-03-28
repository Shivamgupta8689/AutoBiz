import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getInvoices } from '../services/api';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e1e] border border-[#333] rounded-xl px-4 py-2.5 text-sm shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.name.includes('₹') || p.dataKey === 'amount' || p.dataKey === 'revenue'
            ? `₹${Number(p.value).toLocaleString('en-IN')}`
            : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Analytics() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoices()
      .then(({ data }) => setInvoices(data))
      .finally(() => setLoading(false));
  }, []);

  // Monthly revenue (last 6 months)
  const monthlyData = (() => {
    const map = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      map[key] = { month: key, revenue: 0, count: 0 };
    }
    invoices.forEach(inv => {
      const d = new Date(inv.createdAt);
      const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (map[key]) { map[key].revenue += inv.total; map[key].count += 1; }
    });
    return Object.values(map);
  })();

  // Status donut
  const statusData = [
    { name: 'Paid',    value: invoices.filter(i => i.status === 'paid').length },
    { name: 'Unpaid',  value: invoices.filter(i => i.status === 'unpaid').length },
    { name: 'Overdue', value: invoices.filter(i => i.status === 'overdue').length },
  ].filter(d => d.value > 0);

  // Top customers by total billed
  const customerTotals = invoices.reduce((acc, inv) => {
    const name = inv.customerId?.name || 'Unknown';
    acc[name] = (acc[name] || 0) + inv.total;
    return acc;
  }, {});
  const topCustomers = Object.entries(customerTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));

  // Running total line chart (30 days)
  const runningData = (() => {
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
    let running = 0;
    return Object.entries(map).map(([date, amount]) => { running += amount; return { date, amount: running }; });
  })();

  const totalRevenue = invoices.reduce((s, i) => s + i.total, 0);
  const paidRevenue  = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const collectionRate = totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0;

  if (loading) return (
    <main className="p-5 md:p-7 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-[#161616] border border-[#232323] rounded-2xl animate-pulse" />)}
      </div>
    </main>
  );

  return (
    <main className="p-5 md:p-7 max-w-7xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Business performance overview</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total Revenue',     value: `₹${totalRevenue.toLocaleString('en-IN')}`,  icon: '💰', sub: 'All invoices' },
          { label: 'Collected',         value: `₹${paidRevenue.toLocaleString('en-IN')}`,   icon: '✅', sub: 'Paid invoices' },
          { label: 'Collection Rate',   value: `${collectionRate}%`,                         icon: '📊', sub: 'Of total billed' },
          { label: 'Avg Invoice Value', value: invoices.length > 0 ? `₹${Math.round(totalRevenue / invoices.length).toLocaleString('en-IN')}` : '₹0', icon: '📋', sub: 'Per invoice' },
        ].map(({ label, value, icon, sub }) => (
          <div key={label} className="bg-[#161616] border border-[#232323] rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</p>
              <span className="text-xl">{icon}</span>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-600 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Monthly revenue bar */}
        <div className="lg:col-span-2 bg-[#161616] border border-[#232323] rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-1">Monthly Revenue</p>
          <p className="text-xs text-gray-500 mb-4">Last 6 months</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#666' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#666' }} tickLine={false} axisLine={false} tickFormatter={v => v > 0 ? `₹${v/1000}k` : '₹0'} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status donut */}
        <div className="bg-[#161616] border border-[#232323] rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-1">Invoice Status</p>
          <p className="text-xs text-gray-500 mb-3">By count</p>
          {statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % 3]} stroke="transparent" />)}
                </Pie>
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="bg-[#1e1e1e] border border-[#333] rounded-xl px-3 py-2 text-sm shadow-xl">
                    <p className="text-white">{payload[0].name}: <span className="font-bold">{payload[0].value}</span></p>
                  </div>
                ) : null} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cumulative line */}
        <div className="lg:col-span-2 bg-[#161616] border border-[#232323] rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-1">Cumulative Billing</p>
          <p className="text-xs text-gray-500 mb-4">Running total over 30 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={runningData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#666' }} interval={6} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#666' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v/1000}k`} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="amount" name="Cumulative" stroke="#22c55e" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#22c55e', strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top customers */}
        <div className="bg-[#161616] border border-[#232323] rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-4">Top Customers</p>
          {topCustomers.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm">No data</div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((c, i) => {
                const pct = Math.round((c.amount / topCustomers[0].amount) * 100);
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-300 font-medium truncate">{c.name}</span>
                      <span className="text-xs text-gray-500 font-medium ml-2">₹{c.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%`, transition: 'width 1s ease-out' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
