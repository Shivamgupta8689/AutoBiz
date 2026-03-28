import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-brand' : 'bg-app-input'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-app-raised border border-line-subtle rounded-xl overflow-hidden mb-4">
      <div className="px-5 py-3.5 border-b border-line-subtle">
        <p className="text-sm font-medium text-zinc-100">{title}</p>
      </div>
      <div className="divide-y divide-line-subtle">{children}</div>
    </div>
  );
}

function Row({ label, sub, right }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <p className="text-sm text-zinc-200">{label}</p>
        {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
      </div>
      <div>{right}</div>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({
    emailNotifs: true,
    smsNotifs: false,
    autoOverdue: true,
    weeklyReport: false,
    darkMode: true,
  });
  const toggle = (key) => setPrefs(p => ({ ...p, [key]: !p[key] }));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="p-5 md:p-7 max-w-2xl mx-auto">
      <div className="mb-7">
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Account and preferences</p>
      </div>

      {/* Profile */}
      <Section title="Account">
        <Row
          label={user?.name}
          sub={user?.email}
          right={
            <div className="w-9 h-9 rounded-lg bg-app-input border border-line-subtle flex items-center justify-center text-sm font-semibold text-brand">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          }
        />
        <Row label="Member since" sub="Demo account" right={<span className="text-xs text-zinc-500">{new Date().getFullYear()}</span>} />
      </Section>

      {/* Business */}
      <Section title="Business Info">
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Business Name', placeholder: 'My Kirana Store', defaultVal: '' },
            { label: 'GST Number',    placeholder: '22AAAAA0000A1Z5', defaultVal: '' },
            { label: 'UPI ID',        placeholder: 'business@upi',    defaultVal: 'demo@kirana' },
            { label: 'Phone',         placeholder: '9876543210',      defaultVal: '' },
          ].map(({ label, placeholder, defaultVal }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>
              <input
                defaultValue={defaultVal}
                placeholder={placeholder}
                className="w-full bg-app-input border border-line-subtle rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/25"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row label="Email notifications" sub="Receive invoice updates via email" right={<Toggle enabled={prefs.emailNotifs} onChange={() => toggle('emailNotifs')} />} />
        <Row label="SMS notifications" sub="WhatsApp/SMS reminders" right={<Toggle enabled={prefs.smsNotifs} onChange={() => toggle('smsNotifs')} />} />
        <Row label="Auto mark overdue" sub="Automatically mark past-due invoices as overdue" right={<Toggle enabled={prefs.autoOverdue} onChange={() => toggle('autoOverdue')} />} />
        <Row label="Weekly report" sub="Sunday summary of outstanding invoices" right={<Toggle enabled={prefs.weeklyReport} onChange={() => toggle('weeklyReport')} />} />
      </Section>

      {/* Reminder Engine */}
      <Section title="Reminder Engine">
        <Row label="Quiet hours" sub="No reminders sent between 10pm–7am" right={<span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">ACTIVE</span>} />
        <Row label="Spam protection" sub="Suppress reminders if sent within 48 hours" right={<span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">ACTIVE</span>} />
        <Row label="Escalation threshold" sub="Escalate tone after this many days overdue" right={<span className="text-xs font-mono text-brand bg-brand-muted border border-brand/25 px-2.5 py-1 rounded-md">7 days</span>} />
        <Row label="Language model" sub="Used for reminder message drafts" right={<span className="text-xs text-zinc-500 font-mono">gemini-1.5-flash</span>} />
      </Section>

      {/* Demo credentials */}
      <div className="bg-app-input border border-line-subtle rounded-xl px-5 py-4 mb-6">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Demo sign-in</p>
        <div className="font-mono text-sm text-zinc-400 space-y-0.5">
          <p>demo@kirana.com</p>
          <p>demo1234</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className={`w-full font-medium py-2.5 rounded-lg text-sm transition-colors ${
          saved ? 'bg-emerald-700 text-white' : 'bg-brand hover:bg-brand-hover text-white shadow-brand-md'
        }`}
      >
        {saved ? 'Saved' : 'Save settings'}
      </button>
    </main>
  );
}
