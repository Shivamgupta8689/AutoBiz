import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  getRawMaterials, createRawMaterial,
  getSupplierStats, getMaterialAnalytics,
  getGSTSummary, getMonthlySpend,
} from '../services/api';

const EMPTY_FORM = {
  materialName: '',
  supplierName: '',
  quantity: '',
  pricePerUnit: '',
  gstPercent: '18',
  purchaseDate: '',
};

const GST_OPTIONS = [0, 5, 12, 18, 28];

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-[#111] border border-[#232323] rounded-2xl px-5 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <h2 className="text-sm font-semibold text-gray-300 mb-3">{children}</h2>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RawMaterials() {
  const [materials,    setMaterials]    = useState([]);
  const [suppliers,    setSuppliers]    = useState([]);
  const [matAnalytics, setMatAnalytics] = useState([]);
  const [gstSummary,   setGstSummary]   = useState(null);
  const [monthly,      setMonthly]      = useState([]);

  const [form,      setForm]      = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState('');
  const [preview,   setPreview]   = useState(null);

  // Live GST preview
  useEffect(() => {
    const qty = parseFloat(form.quantity);
    const ppu = parseFloat(form.pricePerUnit);
    const gst = parseFloat(form.gstPercent);
    if (!qty || !ppu || isNaN(gst)) { setPreview(null); return; }
    const base  = qty * ppu;
    const gstAmt = (base * gst) / 100;
    setPreview({ base, gstAmt, final: base + gstAmt, cgst: gstAmt / 2, sgst: gstAmt / 2 });
  }, [form.quantity, form.pricePerUnit, form.gstPercent]);

  const loadAll = async () => {
    const [matRes, supRes, anaRes, gstRes, monRes] = await Promise.allSettled([
      getRawMaterials(),
      getSupplierStats(),
      getMaterialAnalytics(),
      getGSTSummary(),
      getMonthlySpend(),
    ]);
    if (matRes.status === 'fulfilled') setMaterials(matRes.value.data);
    if (supRes.status === 'fulfilled') setSuppliers(supRes.value.data);
    if (anaRes.status === 'fulfilled') setMatAnalytics(anaRes.value.data);
    if (gstRes.status === 'fulfilled') setGstSummary(gstRes.value.data);
    if (monRes.status === 'fulfilled') setMonthly(monRes.value.data);
  };

  useEffect(() => { loadAll(); }, []);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.materialName || !form.supplierName || !form.quantity || !form.pricePerUnit) {
      setError('All fields except date are required.');
      return;
    }
    setSubmitting(true);
    try {
      await createRawMaterial({
        ...form,
        quantity:     parseFloat(form.quantity),
        pricePerUnit: parseFloat(form.pricePerUnit),
        gstPercent:   parseFloat(form.gstPercent),
      });
      setForm(EMPTY_FORM);
      setPreview(null);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Insights
  const topMaterial = matAnalytics[0]?.materialName || '—';
  const topSupplier = suppliers[0]?.supplierName    || '—';

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Raw Materials</h1>
        <p className="text-sm text-gray-500 mt-1">Track purchases, GST, and supplier analytics.</p>
      </div>

      {/* ── Stats row ── */}
      {gstSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Spend" value={fmt(gstSummary.totalFinal)} sub={`${gstSummary.totalRecords} purchases`} />
          <StatCard label="Base Cost"   value={fmt(gstSummary.totalBase)} />
          <StatCard label="Total GST"   value={fmt(gstSummary.totalGST)} />
          <StatCard label="Suppliers"   value={suppliers.length} sub="unique" />
        </div>
      )}

      {/* ── AI Insights ── */}
      {(matAnalytics.length > 0 || suppliers.length > 0) && (
        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl px-5 py-4 flex flex-col sm:flex-row gap-3 sm:gap-8">
          <p className="text-sm text-indigo-300">
            <span className="font-semibold text-white">Top spend:</span>{' '}
            You spend most on <span className="text-indigo-400 font-semibold">{topMaterial}</span>
          </p>
          <p className="text-sm text-indigo-300">
            <span className="font-semibold text-white">Most frequent supplier:</span>{' '}
            <span className="text-indigo-400 font-semibold">{topSupplier}</span>
            {suppliers[0] ? ` (${suppliers[0].transactions} orders)` : ''}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Form ── */}
        <div className="lg:col-span-2 bg-[#111] border border-[#232323] rounded-2xl p-5">
          <SectionHeading>Record Purchase</SectionHeading>
          <form onSubmit={handleSubmit} className="space-y-3">
            {[
              { name: 'materialName', label: 'Material Name',    type: 'text' },
              { name: 'supplierName', label: 'Supplier Name',    type: 'text' },
              { name: 'quantity',     label: 'Quantity',         type: 'number' },
              { name: 'pricePerUnit', label: 'Price per Unit (₹)', type: 'number' },
            ].map(({ name, label, type }) => (
              <div key={name}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input
                  name={name}
                  type={type}
                  value={form[name]}
                  onChange={handleChange}
                  min={type === 'number' ? '0' : undefined}
                  step={type === 'number' ? 'any' : undefined}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
                  placeholder={label}
                />
              </div>
            ))}

            {/* GST % */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">GST %</label>
              <select
                name="gstPercent"
                value={form.gstPercent}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
              >
                {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
              </select>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Purchase Date (optional)</label>
              <input
                name="purchaseDate"
                type="date"
                value={form.purchaseDate}
                onChange={handleChange}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
              />
            </div>

            {/* Live preview */}
            {preview && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-xs text-gray-400 space-y-1">
                <div className="flex justify-between"><span>Base Cost</span><span className="text-white">{fmt(preview.base)}</span></div>
                <div className="flex justify-between"><span>CGST ({form.gstPercent / 2}%)</span><span>{fmt(preview.cgst)}</span></div>
                <div className="flex justify-between"><span>SGST ({form.gstPercent / 2}%)</span><span>{fmt(preview.sgst)}</span></div>
                <div className="flex justify-between border-t border-[#2a2a2a] pt-1 font-semibold text-white">
                  <span>Final Cost</span><span>{fmt(preview.final)}</span>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
            >
              {submitting ? 'Saving...' : 'Record Purchase'}
            </button>
          </form>
        </div>

        {/* ── Table ── */}
        <div className="lg:col-span-3 bg-[#111] border border-[#232323] rounded-2xl p-5 overflow-x-auto">
          <SectionHeading>Purchase History</SectionHeading>
          {materials.length === 0 ? (
            <p className="text-sm text-gray-600 py-8 text-center">No purchases recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-600 border-b border-[#232323]">
                  <th className="pb-2 font-medium">Material</th>
                  <th className="pb-2 font-medium">Supplier</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">GST%</th>
                  <th className="pb-2 font-medium text-right">Final Cost</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m._id} className="border-b border-[#1a1a1a] hover:bg-[#161616] transition-colors">
                    <td className="py-2.5 text-white font-medium">{m.materialName}</td>
                    <td className="py-2.5 text-gray-400">{m.supplierName}</td>
                    <td className="py-2.5 text-gray-400 text-right">{m.quantity}</td>
                    <td className="py-2.5 text-gray-400 text-right">{m.gstPercent}%</td>
                    <td className="py-2.5 text-emerald-400 font-semibold text-right">{fmt(m.finalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Charts ── */}
      {(matAnalytics.length > 0 || suppliers.length > 0 || monthly.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Materials bar */}
          {matAnalytics.length > 0 && (
            <div className="bg-[#111] border border-[#232323] rounded-2xl p-5">
              <SectionHeading>Top Materials by Spend</SectionHeading>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={matAnalytics.slice(0, 6)} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                  <XAxis dataKey="materialName" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
                    labelStyle={{ color: '#fff', fontSize: 12 }}
                    formatter={(v) => [fmt(v), 'Spend']}
                  />
                  <Bar dataKey="totalSpend" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Supplier frequency bar */}
          {suppliers.length > 0 && (
            <div className="bg-[#111] border border-[#232323] rounded-2xl p-5">
              <SectionHeading>Supplier Frequency</SectionHeading>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={suppliers.slice(0, 6)} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                  <XAxis dataKey="supplierName" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
                    labelStyle={{ color: '#fff', fontSize: 12 }}
                    formatter={(v) => [v, 'Orders']}
                  />
                  <Bar dataKey="transactions" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly spend line */}
          {monthly.length > 0 && (
            <div className="bg-[#111] border border-[#232323] rounded-2xl p-5">
              <SectionHeading>Monthly Spend</SectionHeading>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthly} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                  <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8 }}
                    labelStyle={{ color: '#fff', fontSize: 12 }}
                    formatter={(v) => [fmt(v), 'Spend']}
                  />
                  <Line type="monotone" dataKey="totalSpend" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
