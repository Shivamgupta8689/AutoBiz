import { useState } from 'react';
import api from '../services/api';

const BADGE = {
  SEND:     { label: 'SEND',     bg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', dot: 'bg-emerald-400' },
  ESCALATE: { label: 'ESCALATE', bg: 'bg-red-500/15 text-red-400 border border-red-500/30',           dot: 'bg-red-400' },
  SUPPRESS: { label: 'SUPPRESS', bg: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',        dot: 'bg-gray-400' },
  DELAY:    { label: 'DELAY',    bg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',     dot: 'bg-amber-400' },
};

const CARD_BG = {
  SEND:     'bg-[#0d1a0f] border-emerald-900/40',
  ESCALATE: 'bg-[#1a0d0d] border-red-900/40',
  SUPPRESS: 'bg-[#161616] border-[#2a2a2a]',
  DELAY:    'bg-[#1a1600] border-amber-900/40',
};

const LANGUAGES = ['Hinglish', 'English', 'Hindi', 'Marathi', 'Tamil'];

// WhatsApp bubble
function WABubble({ message, decision, onCopy, copied }) {
  const isEscalate = decision === 'ESCALATE';
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-4 h-4">
          <svg viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.553 4.112 1.516 5.843L.054 23.478a.5.5 0 00.608.608l5.633-1.462A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.96 0-3.792-.548-5.35-1.497l-.383-.228-3.974 1.032 1.054-3.857-.25-.397A9.817 9.817 0 012.182 12C2.182 6.573 6.573 2.182 12 2.182S21.818 6.573 21.818 12 17.427 21.818 12 21.818z"/></svg>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">AI Generated Message</span>
      </div>

      {/* Bubble */}
      <div className="relative max-w-sm">
        <div className={`rounded-2xl rounded-tl-sm px-4 py-3 ${isEscalate ? 'bg-[#1a0808] border border-red-900/50' : 'bg-[#0a1f0a] border border-emerald-900/50'}`}>
          <p className={`text-sm leading-relaxed whitespace-pre-line ${isEscalate ? 'text-red-100' : 'text-emerald-100'}`}>
            {message}
          </p>
          <div className="flex items-center justify-end gap-1 mt-2">
            <span className="text-[10px] text-gray-500">
              {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 16 15">
              <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.88a.32.32 0 01-.484.032l-.358-.325a.319.319 0 00-.484.032l-.378.483a.418.418 0 00.036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 00-.064-.51zm-4.1 0l-.478-.372a.365.365 0 00-.51.063L4.566 9.879a.32.32 0 01-.484.032L1.891 7.769a.366.366 0 00-.515.006l-.423.433a.364.364 0 00.006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 00-.063-.51z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Copy button */}
      <button
        onClick={() => onCopy(message)}
        className={`mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
          copied
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            : 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444]'
        }`}
      >
        {copied ? (
          <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg> Copied!</>
        ) : (
          <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy message</>
        )}
      </button>
    </div>
  );
}

function ReminderCard({ result }) {
  const [copied, setCopied] = useState(false);
  const { decision, reason, message, customer, invoice, nextSendTime, daysOverdue, invoiceNumber } = result;
  const badge = BADGE[decision] || BADGE.SUPPRESS;
  const cardBg = CARD_BG[decision] || CARD_BG.SUPPRESS;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl border p-5 transition-all hover:shadow-lg ${cardBg}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-semibold text-white text-sm">{customer?.name}</p>
          {customer?.businessName && <p className="text-xs text-gray-500 mt-0.5">{customer.businessName}</p>}
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full shrink-0 ${badge.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
          {badge.label}
        </span>
      </div>

      {/* Invoice meta */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
        <span>Invoice: <span className="font-mono text-gray-300">{invoiceNumber}</span></span>
        <span>Amount: <span className="font-semibold text-white">₹{invoice?.total?.toLocaleString('en-IN')}</span></span>
        {daysOverdue > 0 && <span className="text-red-400 font-medium">{daysOverdue}d overdue</span>}
        {invoice?.dueDate && <span>Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span>}
      </div>

      <p className="text-xs text-gray-500 italic">{reason}</p>

      {nextSendTime && (
        <p className="text-xs text-amber-500 font-medium mt-1">
          Scheduled: {new Date(nextSendTime).toLocaleString('en-IN')}
        </p>
      )}

      {message && (
        <WABubble message={message} decision={decision} onCopy={handleCopy} copied={copied} />
      )}
    </div>
  );
}

export default function Reminders() {
  const [language, setLanguage] = useState('Hinglish');
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const runReminders = async () => {
    setRunning(true);
    setError('');
    setResults(null);
    try {
      const { data } = await api.post('/reminders/evaluate-all', { language });
      setResults(data);
      localStorage.setItem('lastReminderRun', Date.now().toString());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run reminders');
    } finally {
      setRunning(false);
    }
  };

  const counts = results
    ? results.reduce((acc, r) => { acc[r.decision] = (acc[r.decision] || 0) + 1; return acc; }, {})
    : null;

  return (
    <main className="p-5 md:p-7 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white">Smart Reminders</h1>
        <p className="text-sm text-gray-500 mt-1">AI evaluates each invoice and generates context-aware messages</p>
      </div>

      {/* Controls */}
      <div className="bg-[#161616] border border-[#232323] rounded-2xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Message Language</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    language === lang
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#444]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={runReminders}
            disabled={running}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all text-sm shrink-0"
          >
            {running ? (
              <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Running AI...</>
            ) : (
              <><span>⚡</span> Run Reminders</>
            )}
          </button>
        </div>

        {/* Rules legend */}
        <div className="mt-5 pt-4 border-t border-[#232323] grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'SEND',     desc: 'Due & no recent reminder', color: 'text-emerald-400' },
            { label: 'ESCALATE', desc: 'Overdue > 7 days',         color: 'text-red-400' },
            { label: 'DELAY',    desc: 'Outside 7am–10pm',         color: 'text-amber-400' },
            { label: 'SUPPRESS', desc: 'Paid or reminded <48h',    color: 'text-gray-400' },
          ].map(({ label, desc, color }) => (
            <div key={label}>
              <p className={`text-xs font-bold ${color}`}>{label}</p>
              <p className="text-[11px] text-gray-600 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Summary */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <p className="text-sm font-semibold text-white">Results — {results.length} invoice{results.length !== 1 ? 's' : ''} evaluated</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'SEND',     bg: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
                { key: 'ESCALATE', bg: 'bg-red-500/15 text-red-400 border border-red-500/30' },
                { key: 'DELAY',    bg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
                { key: 'SUPPRESS', bg: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' },
              ].filter(({ key }) => counts[key]).map(({ key, bg }) => (
                <span key={key} className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${bg}`}>
                  {counts[key]} {key}
                </span>
              ))}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="bg-[#161616] border border-[#232323] rounded-2xl p-10 text-center text-gray-500 text-sm">
              No unpaid invoices to evaluate.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(r => <ReminderCard key={r.invoiceId} result={r} />)}
            </div>
          )}
        </>
      )}

      {!results && !running && (
        <div className="bg-[#161616] border border-[#232323] rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">⚡</p>
          <p className="text-white font-semibold mb-1">Ready to run</p>
          <p className="text-gray-500 text-sm">Select a language and click Run Reminders to evaluate all unpaid invoices.</p>
        </div>
      )}
    </main>
  );
}
