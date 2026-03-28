import { Link } from 'react-router-dom';

const rules = [
  { icon: '✅', decision: 'SUPPRESS', color: 'text-gray-600 bg-gray-100', rule: 'Invoice already paid — no reminder needed.' },
  { icon: '🔕', decision: 'SUPPRESS', color: 'text-gray-600 bg-gray-100', rule: 'Reminder sent within last 48 hours — avoid spamming the customer.' },
  { icon: '🌙', decision: 'DELAY', color: 'text-yellow-700 bg-yellow-100', rule: 'Current time is between 10pm–7am — schedule reminder for next 9am.' },
  { icon: '🚨', decision: 'ESCALATE', color: 'text-red-700 bg-red-100', rule: 'Invoice overdue by more than 7 days — escalate tone via AI.' },
  { icon: '📤', decision: 'SEND', color: 'text-green-700 bg-green-100', rule: 'None of the above — send a polite reminder now.' },
];

const stack = [
  { layer: 'Frontend', tech: 'React + Vite + TailwindCSS' },
  { layer: 'Backend', tech: 'Node.js + Express' },
  { layer: 'Database', tech: 'MongoDB Atlas + Mongoose' },
  { layer: 'AI Engine', tech: 'Google Gemini 1.5 Flash API' },
  { layer: 'Auth', tech: 'JWT + bcrypt' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-indigo-600">Smart Invoicing</span>
        <Link to="/dashboard" className="text-sm text-indigo-600 hover:underline font-medium">← Back to Dashboard</Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <span className="text-5xl">🧾</span>
          <h1 className="text-3xl font-bold text-gray-800 mt-4 mb-3">Smart Invoicing Assistant</h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto">
            Small businesses lose money not because customers won&apos;t pay —
            but because reminders are sent at the wrong time, in the wrong tone, or not at all.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-800 mb-1">How the AI Context Engine Works</h2>
          <p className="text-gray-500 text-sm mb-5">
            Before sending any reminder, the engine evaluates 5 rules in order. The first rule that matches wins.
          </p>
          <div className="space-y-3">
            {rules.map((r, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-start gap-4">
                <div className="text-xl shrink-0 mt-0.5">{r.icon}</div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{r.rule}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${r.color}`}>
                  {r.decision}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 pl-1">
            For SEND and ESCALATE decisions, Gemini 1.5 Flash generates a human-sounding message tailored to the customer and invoice context.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Tech Stack</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {stack.map(({ layer, tech }, i) => (
              <div key={i} className={`flex items-center px-5 py-3.5 text-sm ${i < stack.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <span className="w-28 text-gray-400 font-medium">{layer}</span>
                <span className="text-gray-800 font-medium">{tech}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-indigo-50 border border-indigo-100 rounded-2xl px-6 py-5">
          <h3 className="text-sm font-bold text-indigo-700 mb-2">Demo Login</h3>
          <div className="text-sm text-indigo-600 font-mono space-y-1">
            <p>Email: demo@kirana.com</p>
            <p>Password: demo1234</p>
          </div>
        </section>
      </main>
    </div>
  );
}
