import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getInvoices, createInvoice, updateInvoiceStatus, deleteInvoice, getCustomers } from '../services/api';

const STATUS_STYLES = {
  paid:    'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  unpaid:  'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  overdue: 'bg-red-500/15 text-red-400 border border-red-500/20',
};

const TABS = ['All', 'Unpaid', 'Overdue', 'Paid'];

const emptyForm = {
  customerId: '', gstPercent: 18, dueDate: '',
  items: [{ name: '', qty: 1, rate: '' }],
};

const calcTotals = (items, gstPercent) => {
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const gstAmount = parseFloat(((subtotal * gstPercent) / 100).toFixed(2));
  return { subtotal: parseFloat(subtotal.toFixed(2)), gstAmount, total: parseFloat((subtotal + gstAmount).toFixed(2)) };
};

const generatePDF = (invoice) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(99, 102, 241);
  doc.text('TAX INVOICE', 14, 22);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Smart Invoicing Assistant', 14, 30);
  doc.text('GST Compliant Invoice', 14, 35);

  // Invoice meta (right)
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 130, 22);
  doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, 130, 28);
  doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, 130, 34);
  doc.text(`Status: ${invoice.status.toUpperCase()}`, 130, 40);

  // Divider
  doc.setDrawColor(200, 200, 220);
  doc.line(14, 44, 196, 44);

  // Bill to
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('BILL TO', 14, 52);
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(invoice.customerId?.name || 'Customer', 14, 59);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (invoice.customerId?.businessName) doc.text(invoice.customerId.businessName, 14, 65);
  if (invoice.customerId?.phone) doc.text(`Ph: ${invoice.customerId.phone}`, 14, 71);

  // Items table
  autoTable(doc, {
    startY: 82,
    head: [['#', 'Description', 'Qty', 'Rate (₹)', 'Amount (₹)']],
    body: invoice.items.map((item, i) => [
      i + 1,
      item.name,
      item.qty,
      Number(item.rate).toLocaleString('en-IN'),
      (item.qty * item.rate).toLocaleString('en-IN'),
    ]),
    foot: [
      ['', '', '', 'Subtotal', `₹${invoice.subtotal.toLocaleString('en-IN')}`],
      ['', '', '', `GST (${invoice.gstPercent}%)`, `₹${invoice.gstAmount.toLocaleString('en-IN')}`],
      ['', '', '', 'TOTAL', `₹${invoice.total.toLocaleString('en-IN')}`],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fontStyle: 'bold', textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [248, 248, 252] },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 80 } },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for your business!', 14, finalY);

  doc.save(`${invoice.invoiceNumber}.pdf`);
};

function QRModal({ invoice, onClose }) {
  const upiLink = `upi://pay?pa=demo@kirana&pn=${encodeURIComponent(invoice.customerId?.name || 'Customer')}&am=${invoice.total}&tn=${encodeURIComponent(invoice.invoiceNumber)}&cu=INR`;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 max-w-xs w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-white text-sm">UPI Payment QR</p>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="bg-white rounded-xl p-4 flex justify-center mb-4">
          <QRCodeSVG value={upiLink} size={180} />
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">{invoice.invoiceNumber}</p>
          <p className="text-xl font-bold text-white">₹{invoice.total?.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-1">{invoice.customerId?.name}</p>
        </div>
        <p className="text-[10px] text-gray-600 text-center mt-3">Scan with any UPI app to pay</p>
      </div>
    </div>
  );
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [qrInvoice, setQrInvoice] = useState(null);

  const fetchData = async () => {
    try {
      const [{ data: inv }, { data: cust }] = await Promise.all([getInvoices(), getCustomers()]);
      setInvoices(inv);
      setCustomers(cust);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = tab === 'All' ? invoices : invoices.filter(i => i.status === tab.toLowerCase());

  const setField = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const setItem = (idx, f, v) => setForm(p => ({ ...p, items: p.items.map((it, i) => i === idx ? { ...it, [f]: v } : it) }));
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { name: '', qty: 1, rate: '' }] }));
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const { data } = await createInvoice({
        ...form,
        gstPercent: Number(form.gstPercent),
        items: form.items.map(i => ({ name: i.name, qty: Number(i.qty), rate: Number(i.rate) })),
      });
      setInvoices(p => [data, ...p]);
      setForm(emptyForm); setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create invoice');
    } finally { setSubmitting(false); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const { data } = await updateInvoiceStatus(id, status);
      setInvoices(p => p.map(i => i._id === id ? data : i));
    } catch { setError('Failed to update status'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await deleteInvoice(id);
      setInvoices(p => p.filter(i => i._id !== id));
    } catch { setError('Failed to delete invoice'); }
  };

  const { subtotal, gstAmount, total } = calcTotals(form.items, form.gstPercent);

  const tabCount = (t) => t === 'All' ? invoices.length : invoices.filter(i => i.status === t.toLowerCase()).length;

  const inputCls = "w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

  return (
    <main className="p-5 md:p-7 max-w-7xl mx-auto">
      {qrInvoice && <QRModal invoice={qrInvoice} onClose={() => setQrInvoice(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length} total invoices</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all text-sm"
        >
          {showForm ? '× Cancel' : '+ Create Invoice'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 mb-6">
          <h3 className="text-base font-semibold text-white mb-5">New Invoice</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Customer *</label>
              <select value={form.customerId} onChange={e => setField('customerId', e.target.value)} required className={inputCls} style={{background:'#1e1e1e'}}>
                <option value="">Select customer</option>
                {customers.map(c => <option key={c._id} value={c._id}>{c.name}{c.businessName ? ` (${c.businessName})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">GST %</label>
              <input type="number" min="0" max="100" value={form.gstPercent} onChange={e => setField('gstPercent', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Due Date *</label>
              <input type="date" value={form.dueDate} onChange={e => setField('dueDate', e.target.value)} required className={inputCls} style={{colorScheme:'dark'}} />
            </div>
          </div>

          {/* Items */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">Items</label>
              <button type="button" onClick={addItem} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">+ Add item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input placeholder="Item description" value={item.name} onChange={e => setItem(idx,'name',e.target.value)} required className={`col-span-6 ${inputCls}`} />
                  <input type="number" min="1" placeholder="Qty" value={item.qty} onChange={e => setItem(idx,'qty',e.target.value)} required className={`col-span-2 ${inputCls}`} />
                  <input type="number" min="0" placeholder="Rate ₹" value={item.rate} onChange={e => setItem(idx,'rate',e.target.value)} required className={`col-span-3 ${inputCls}`} />
                  <button type="button" onClick={() => removeItem(idx)} disabled={form.items.length === 1} className="col-span-1 text-gray-600 hover:text-red-400 disabled:opacity-20 text-xl text-center">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* GST Totals */}
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-5 py-3 mb-5 space-y-1 text-right">
            <div className="text-xs text-gray-500">Subtotal: <span className="text-gray-300 font-medium">₹{subtotal.toLocaleString('en-IN')}</span></div>
            <div className="text-xs text-gray-500">GST ({form.gstPercent}%): <span className="text-gray-300 font-medium">₹{gstAmount.toLocaleString('en-IN')}</span></div>
            <div className="text-base font-bold text-indigo-400">Total: ₹{total.toLocaleString('en-IN')}</div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-500/20 transition-all">
              {submitting ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 bg-[#161616] border border-[#232323] rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === t
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-white/20' : 'bg-[#2a2a2a] text-gray-500'}`}>
              {tabCount(t)}
            </span>
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-[#161616] border border-[#232323] rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#161616] border border-[#232323] rounded-2xl p-12 text-center">
          <p className="text-3xl mb-3">🧾</p>
          <p className="text-gray-400 text-sm font-medium">No {tab.toLowerCase()} invoices.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(inv => (
            <div key={inv._id} className="bg-[#161616] border border-[#232323] hover:border-[#333] rounded-2xl p-5 transition-all group">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Left: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="font-mono text-xs text-gray-500">{inv.invoiceNumber}</span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[inv.status]}`}>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </div>
                  <p className="font-semibold text-white">{inv.customerId?.name}
                    {inv.customerId?.businessName && <span className="text-gray-500 font-normal text-sm"> · {inv.customerId.businessName}</span>}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    <span>Subtotal: ₹{inv.subtotal?.toLocaleString('en-IN')}</span>
                    <span>GST ({inv.gstPercent}%): ₹{inv.gstAmount?.toLocaleString('en-IN')}</span>
                    <span className="font-bold text-white">Total: ₹{inv.total?.toLocaleString('en-IN')}</span>
                    <span>Due: {new Date(inv.dueDate).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>

                {/* QR code */}
                <div className="shrink-0 hidden sm:block">
                  <div className="bg-white rounded-xl p-1.5 cursor-pointer hover:shadow-lg hover:shadow-indigo-500/20 transition-all" onClick={() => setQrInvoice(inv)}>
                    <QRCodeSVG
                      value={`upi://pay?pa=demo@kirana&pn=${encodeURIComponent(inv.customerId?.name||'')}&am=${inv.total}&tn=${encodeURIComponent(inv.invoiceNumber)}&cu=INR`}
                      size={56}
                    />
                  </div>
                  <p className="text-[9px] text-gray-600 text-center mt-1">UPI Pay</p>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={inv.status}
                    onChange={e => handleStatusChange(inv._id, e.target.value)}
                    className="bg-[#1e1e1e] border border-[#2a2a2a] text-gray-300 text-xs rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:border-indigo-500"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <button
                    onClick={() => generatePDF(inv)}
                    className="flex items-center gap-1.5 bg-[#1e1e1e] hover:bg-[#252525] border border-[#2a2a2a] hover:border-indigo-500/50 text-gray-400 hover:text-indigo-300 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    PDF
                  </button>
                  <button
                    onClick={() => handleDelete(inv._id)}
                    className="text-gray-600 hover:text-red-400 text-xs px-2 py-1.5 rounded-lg transition-all"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
