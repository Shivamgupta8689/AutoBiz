import { useEffect, useState } from 'react';
import { getCustomers, createCustomer, deleteCustomer, getCustomerHealth } from '../services/api';

const emptyForm = { name: '', phone: '', email: '', businessName: '' };

const inputCls = "w-full bg-app-input border border-line-subtle rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/25";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [healthScores, setHealthScores] = useState({}); // { [customerId]: { score, label, color } }
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCustomers()
      .then(({ data }) => {
        setCustomers(data);
        // Fetch health score for each customer in parallel (fire-and-forget)
        data.forEach(c => {
          getCustomerHealth(c._id)
            .then(({ data: h }) => setHealthScores(prev => ({ ...prev, [c._id]: h })))
            .catch(() => {});
        });
      })
      .catch(() => setError('Failed to load customers'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const { data } = await createCustomer(form);
      setCustomers(p => [data, ...p]);
      setForm(emptyForm); setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create customer');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async id => {
    if (!confirm('Delete this customer?')) return;
    try {
      await deleteCustomer(id);
      setCustomers(p => p.filter(c => c._id !== id));
    } catch { setError('Failed to delete customer'); }
  };

  const healthBadgeCls = (color) => {
    if (color === 'green')  return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
    if (color === 'yellow') return 'bg-amber-500/15 text-amber-400 border border-amber-500/25';
    return 'bg-red-500/15 text-red-400 border border-red-500/25';
  };

  // Avatar colour from name
  const avatarColor = (name) => {
    const colors = ['bg-brand-muted text-brand border border-brand/20', 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40', 'bg-amber-950/50 text-amber-300 border border-amber-800/40', 'bg-zinc-800 text-zinc-300 border border-zinc-700', 'bg-indigo-950/40 text-indigo-300 border border-indigo-800/40'];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  return (
    <main className="p-5 md:p-7 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Customers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{customers.length} total</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium px-5 py-2.5 rounded-lg shadow-brand-md transition-colors text-sm"
        >
          {showForm ? '× Cancel' : '+ Add Customer'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-app-raised border border-line-subtle rounded-xl p-6 mb-6">
          <h3 className="text-base font-semibold text-white mb-5">New Customer</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {[
              { name: 'name',         label: 'Full Name *',     placeholder: 'Ramesh Kumar' },
              { name: 'businessName', label: 'Business Name',   placeholder: 'Ramesh Kirana Store' },
              { name: 'phone',        label: 'Phone',           placeholder: '9876543210' },
              { name: 'email',        label: 'Email',           placeholder: 'ramesh@example.com' },
            ].map(({ name, label, placeholder }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
                <input name={name} value={form[name]} onChange={handleChange} required={name === 'name'} placeholder={placeholder} className={inputCls} />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg text-sm shadow-brand-md transition-colors">
              {submitting ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-app-raised border border-line-subtle rounded-xl animate-pulse" />)}
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-app-raised border border-line-subtle rounded-xl p-12 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-gray-400 text-sm font-medium">No customers yet.</p>
          <p className="text-gray-600 text-xs mt-1">Click "+ Add Customer" to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <div key={c._id} className="bg-app-raised border border-line-subtle hover:border-zinc-600 rounded-xl px-5 py-4 flex items-center gap-4 group transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor(c.name)}`}>
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{c.name}</p>
                {c.businessName && <p className="text-xs text-gray-500 mt-0.5">{c.businessName}</p>}
              </div>
              <div className="hidden sm:flex items-center gap-6 text-xs text-gray-500">
                {c.phone && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                    {c.phone}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    {c.email}
                  </div>
                )}
              </div>
              {/* Health score badge */}
              {healthScores[c._id] && (
                <div
                  className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full ${healthBadgeCls(healthScores[c._id].color)}`}
                  title={`Payment rate: ${healthScores[c._id].breakdown?.paymentRate ?? 0}% · Overdue: ${healthScores[c._id].breakdown?.overdue ?? 0}`}
                >
                  {healthScores[c._id].score} {healthScores[c._id].label}
                </div>
              )}
              <button onClick={() => handleDelete(c._id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-sm px-2 py-1 rounded-lg transition-all shrink-0">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
