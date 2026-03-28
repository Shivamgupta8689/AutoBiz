import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-[#2a2a2a]'}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-[#161616] border border-[#232323] rounded-2xl overflow-hidden mb-4">
      <div className="px-5 py-4 border-b border-[#232323]">
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <div className="divide-y divide-[#1e1e1e]">{children}</div>
    </div>
  );
}

function Row({ label, sub, right }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <p className="text-sm text-gray-200">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
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
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Section title="Account">
        <Row
          label={user?.name}
          sub={user?.email}
          right={
            <div className="w-9 h-9 rounded-xl bg-indigo-900 flex items-center justify-center text-sm font-bold text-indigo-300">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          }
        />
        <Row label="Member since" sub="Demo account" right={<span className="text-xs text-gray-500">{new Date().getFullYear()}</span>} />
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
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
              <input
                defaultValue={defaultVal}
                placeholder={placeholder}
                className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
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
        <Row label="Escalation threshold" sub="Escalate tone after this many days overdue" right={<span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">7 days</span>} />
        <Row label="AI Model" sub="Google Gemini for message generation" right={<span className="text-xs text-gray-400 font-mono">gemini-1.5-flash</span>} />
      </Section>

      {/* Demo credentials */}
      <div className="bg-indigo-950/40 border border-indigo-900/40 rounded-2xl px-5 py-4 mb-6">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Demo Credentials</p>
        <div className="font-mono text-sm text-indigo-300 space-y-0.5">
          <p>demo@kirana.com</p>
          <p>demo1234</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full font-semibold py-2.5 rounded-xl text-sm transition-all ${
          saved
            ? 'bg-emerald-600 text-white'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
        }`}
      >
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </main>
  );
}
