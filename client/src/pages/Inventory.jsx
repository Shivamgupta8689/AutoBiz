import { useEffect, useRef, useState } from 'react';
import {
  getInventory, createInventory, updateInventory, deleteInventory,
  getSuppliers, createSupplier, deleteSupplier,
  scanBill,
} from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

function StockBar({ quantity, threshold }) {
  const pct   = threshold > 0 ? Math.min((quantity / threshold) * 100, 100) : 100;
  const low   = quantity < threshold;
  const color = low ? 'bg-red-500' : pct < 80 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold ${low ? 'text-red-400' : 'text-gray-400'}`}>
        {fmt(quantity)}/{fmt(threshold)}
      </span>
    </div>
  );
}

// ─── OCR Result Panel ─────────────────────────────────────────────────────────

function OcrPanel({ result, onClose }) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">OCR Result</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        </div>

        {result.total > 0 && (
          <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-gray-500 mb-0.5">Detected Total</p>
            <p className="text-2xl font-bold text-emerald-400">₹{fmt(result.total)}</p>
          </div>
        )}

        {result.items && result.items.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Extracted Lines ({result.items.length})</p>
            <div className="space-y-1">
              {result.items.map((item, i) => (
                <div key={i} className="bg-[#1a1a1a] rounded-lg px-3 py-2 text-xs text-gray-300 font-mono">
                  {item.name
                    ? <span><span className="text-white">{item.name}</span> · qty {item.qty} · ₹{item.rate}</span>
                    : item.raw}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-600 mb-2">Raw Text</p>
          <pre className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-3 text-[10px] text-gray-500 whitespace-pre-wrap overflow-x-auto max-h-40">
            {result.rawText}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EMPTY_INV = { productName: '', quantity: '', threshold: '', supplierIds: [] };
const EMPTY_SUP = { name: '', email: '', priceIndex: '5', avgDeliveryDays: '3', rating: '4' };

export default function Inventory() {
  const [items,     setItems]     = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Inventory form
  const [invForm,    setInvForm]    = useState(EMPTY_INV);
  const [invErr,     setInvErr]     = useState('');
  const [invLoading, setInvLoading] = useState(false);

  // Supplier form
  const [supForm,    setSupForm]    = useState(EMPTY_SUP);
  const [supErr,     setSupErr]     = useState('');
  const [supLoading, setSupLoading] = useState(false);
  const [showSupForm, setShowSupForm] = useState(false);

  // Edit quantity inline
  const [editingId, setEditingId]  = useState(null);
  const [editQty,   setEditQty]    = useState('');

  // OCR
  const fileRef               = useRef(null);
  const [scanning, setScanning]   = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  const load = async () => {
    const [invRes, supRes] = await Promise.allSettled([getInventory(), getSuppliers()]);
    if (invRes.status === 'fulfilled') setItems(invRes.value.data);
    if (supRes.status === 'fulfilled') setSuppliers(supRes.value.data);
  };

  useEffect(() => { load(); }, []);

  // ── Inventory CRUD ───────────────────────────────────────────────────────────

  const handleInvChange = (e) => {
    const { name, value, options, multiple } = e.target;
    if (multiple) {
      const selected = Array.from(options).filter(o => o.selected).map(o => o.value);
      setInvForm(p => ({ ...p, supplierIds: selected }));
    } else {
      setInvForm(p => ({ ...p, [name]: value }));
    }
  };

  const handleInvSubmit = async (e) => {
    e.preventDefault();
    setInvErr('');
    if (!invForm.productName) { setInvErr('Product name is required.'); return; }
    setInvLoading(true);
    try {
      await createInventory({
        productName: invForm.productName,
        quantity:    Number(invForm.quantity)  || 0,
        threshold:   Number(invForm.threshold) || 10,
        supplierIds: invForm.supplierIds,
      });
      setInvForm(EMPTY_INV);
      await load();
    } catch (err) {
      setInvErr(err.response?.data?.message || 'Failed to save.');
    } finally {
      setInvLoading(false);
    }
  };

  const saveQty = async (id) => {
    try {
      await updateInventory(id, { quantity: Number(editQty) });
      setEditingId(null);
      await load();
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this item?')) return;
    await deleteInventory(id).catch(() => {});
    setItems(prev => prev.filter(i => i._id !== id));
  };

  // ── Supplier CRUD ────────────────────────────────────────────────────────────

  const handleSupChange = (e) => setSupForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSupSubmit = async (e) => {
    e.preventDefault();
    setSupErr('');
    if (!supForm.name || !supForm.email) { setSupErr('Name and email are required.'); return; }
    setSupLoading(true);
    try {
      await createSupplier({
        name:            supForm.name,
        email:           supForm.email,
        priceIndex:      Number(supForm.priceIndex),
        avgDeliveryDays: Number(supForm.avgDeliveryDays),
        rating:          Number(supForm.rating),
      });
      setSupForm(EMPTY_SUP);
      setShowSupForm(false);
      await load();
    } catch (err) {
      setSupErr(err.response?.data?.message || 'Failed to save.');
    } finally {
      setSupLoading(false);
    }
  };

  const handleSupDelete = async (id) => {
    await deleteSupplier(id).catch(() => {});
    setSuppliers(prev => prev.filter(s => s._id !== id));
  };

  // ── OCR ──────────────────────────────────────────────────────────────────────

  const handleScanBill = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await scanBill(fd);
      setOcrResult(data);
    } catch (err) {
      alert(err.response?.data?.message || 'OCR scan failed.');
    } finally {
      setScanning(false);
      e.target.value = '';
    }
  };

  const lowCount = items.filter(i => i.quantity < i.threshold).length;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            {items.length} products
            {lowCount > 0 && (
              <span className="ml-2 text-red-400 font-medium">{lowCount} low stock</span>
            )}
          </p>
        </div>

        {/* Scan Bill button */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScanBill} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-indigo-500/40 text-sm text-gray-300 hover:text-white px-4 py-2 rounded-xl transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {scanning ? 'Scanning...' : 'Scan Bill'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Add Product Form ── */}
        <div className="lg:col-span-2 bg-[#111] border border-[#232323] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Add Product</h2>
          <form onSubmit={handleInvSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Product Name</label>
              <input
                name="productName" value={invForm.productName} onChange={handleInvChange}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
                placeholder="e.g. Steel Rods"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                <input
                  name="quantity" type="number" min="0" value={invForm.quantity} onChange={handleInvChange}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Threshold</label>
                <input
                  name="threshold" type="number" min="0" value={invForm.threshold} onChange={handleInvChange}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
                  placeholder="10"
                />
              </div>
            </div>

            {suppliers.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Suppliers (hold Ctrl/Cmd to multi-select)</label>
                <select
                  multiple
                  value={invForm.supplierIds}
                  onChange={handleInvChange}
                  name="supplierIds"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60 h-24"
                >
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {invErr && <p className="text-xs text-red-400">{invErr}</p>}
            <button
              type="submit" disabled={invLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
            >
              {invLoading ? 'Adding...' : 'Add Product'}
            </button>
          </form>
        </div>

        {/* ── Inventory Table ── */}
        <div className="lg:col-span-3 bg-[#111] border border-[#232323] rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Stock Levels</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-600 py-8 text-center">No products yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map(item => {
                const low = item.quantity < item.threshold;
                return (
                  <div
                    key={item._id}
                    className={`rounded-xl border px-4 py-3 ${low ? 'border-red-900/40 bg-red-950/10' : 'border-[#1e1e1e] bg-[#161616]'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {low && (
                          <span className="shrink-0 text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                            LOW
                          </span>
                        )}
                        <span className="text-sm font-semibold text-white truncate">{item.productName}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {editingId === item._id ? (
                          <>
                            <input
                              type="number" min="0" value={editQty}
                              onChange={e => setEditQty(e.target.value)}
                              className="w-20 bg-[#1a1a1a] border border-indigo-500/40 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                            />
                            <button onClick={() => saveQty(item._id)} className="text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1">✓</button>
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-white px-1 py-1">✕</button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingId(item._id); setEditQty(String(item.quantity)); }}
                              className="text-[11px] text-gray-500 hover:text-indigo-400 border border-[#2a2a2a] hover:border-indigo-500/40 px-2 py-1 rounded-lg transition-colors"
                            >
                              Edit qty
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="text-[11px] text-gray-600 hover:text-red-400 border border-[#2a2a2a] hover:border-red-900/40 px-2 py-1 rounded-lg transition-colors"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <StockBar quantity={item.quantity} threshold={item.threshold} />

                    {item.supplierIds?.length > 0 && (
                      <p className="text-[11px] text-gray-600 mt-1.5">
                        Suppliers: {item.supplierIds.map(s => s.name).join(', ')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Suppliers Section ── */}
      <div className="bg-[#111] border border-[#232323] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300">Suppliers</h2>
          <button
            onClick={() => setShowSupForm(v => !v)}
            className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 px-3 py-1.5 rounded-lg transition-colors"
          >
            {showSupForm ? 'Cancel' : '+ Add Supplier'}
          </button>
        </div>

        {showSupForm && (
          <form onSubmit={handleSupSubmit} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5 p-4 bg-[#161616] border border-[#2a2a2a] rounded-xl">
            {[
              { name: 'name',            label: 'Name',          type: 'text',   placeholder: 'Supplier Co.' },
              { name: 'email',           label: 'Email',         type: 'email',  placeholder: 'supplier@co.com' },
              { name: 'priceIndex',      label: 'Price Index',   type: 'number', placeholder: '5' },
              { name: 'avgDeliveryDays', label: 'Delivery Days', type: 'number', placeholder: '3' },
              { name: 'rating',          label: 'Rating (1-5)',  type: 'number', placeholder: '4' },
            ].map(f => (
              <div key={f.name}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input
                  name={f.name} type={f.type} value={supForm[f.name]} onChange={handleSupChange}
                  placeholder={f.placeholder}
                  min={f.type === 'number' ? '0' : undefined}
                  step={f.type === 'number' ? 'any' : undefined}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60"
                />
              </div>
            ))}
            <div className="col-span-full flex items-center gap-3">
              {supErr && <p className="text-xs text-red-400 flex-1">{supErr}</p>}
              <button
                type="submit" disabled={supLoading}
                className="ml-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
              >
                {supLoading ? 'Saving...' : 'Add Supplier'}
              </button>
            </div>
          </form>
        )}

        {suppliers.length === 0 ? (
          <p className="text-sm text-gray-600 py-4 text-center">No suppliers added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-600 border-b border-[#232323]">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium text-right">Price Index</th>
                  <th className="pb-2 font-medium text-right">Delivery Days</th>
                  <th className="pb-2 font-medium text-right">Rating</th>
                  <th className="pb-2 font-medium text-right">Score</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => {
                  const score = ((s.priceIndex * 0.5) + (s.avgDeliveryDays * 0.3) - (s.rating * 0.2)).toFixed(2);
                  return (
                    <tr key={s._id} className="border-b border-[#1a1a1a] hover:bg-[#161616] transition-colors">
                      <td className="py-2.5 text-white font-medium">{s.name}</td>
                      <td className="py-2.5 text-gray-400 text-xs">{s.email}</td>
                      <td className="py-2.5 text-gray-400 text-right">{s.priceIndex}</td>
                      <td className="py-2.5 text-gray-400 text-right">{s.avgDeliveryDays}d</td>
                      <td className="py-2.5 text-amber-400 text-right">{'★'.repeat(Math.round(s.rating))}</td>
                      <td className="py-2.5 text-indigo-400 font-mono text-right text-xs">{score}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => handleSupDelete(s._id)}
                          className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OCR Result Modal */}
      <OcrPanel result={ocrResult} onClose={() => setOcrResult(null)} />
    </div>
  );
}
