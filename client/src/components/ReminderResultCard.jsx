const BADGE = {
  SEND:     { bg: 'bg-green-100 text-green-800',  dot: 'bg-green-500',  label: 'SEND' },
  ESCALATE: { bg: 'bg-red-100 text-red-800',      dot: 'bg-red-500',    label: 'ESCALATE' },
  SUPPRESS: { bg: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',   label: 'SUPPRESS' },
  DELAY:    { bg: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500', label: 'DELAY' },
};

export default function ReminderResultCard({ result }) {
  const { decision, reason, message, customer, invoice, nextSendTime, daysOverdue } = result;
  const badge = BADGE[decision] || BADGE.SUPPRESS;

  return (
    <div className={`rounded-2xl border p-5 transition ${
      decision === 'ESCALATE' ? 'border-red-200 bg-red-50' :
      decision === 'SEND'     ? 'border-green-200 bg-green-50' :
      decision === 'DELAY'    ? 'border-yellow-200 bg-yellow-50' :
                                'border-gray-200 bg-white'
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-800 text-sm">{customer?.name}</p>
          {customer?.businessName && (
            <p className="text-xs text-gray-500">{customer.businessName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${badge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Invoice info */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
        <span>Invoice: <span className="font-mono font-medium">{result.invoiceNumber}</span></span>
        <span>Amount: <span className="font-semibold text-gray-800">₹{invoice?.total?.toLocaleString('en-IN')}</span></span>
        {daysOverdue > 0 && (
          <span className="text-red-600 font-medium">{daysOverdue} days overdue</span>
        )}
        {invoice?.dueDate && (
          <span>Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span>
        )}
      </div>

      {/* Reason */}
      <p className="mt-2 text-xs text-gray-500 italic">{reason}</p>

      {/* Next send time for DELAY */}
      {nextSendTime && (
        <p className="mt-1 text-xs text-yellow-700 font-medium">
          Scheduled for: {new Date(nextSendTime).toLocaleString('en-IN')}
        </p>
      )}

      {/* AI-generated message */}
      {message && (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm leading-relaxed ${
          decision === 'ESCALATE' ? 'bg-red-100 text-red-900' : 'bg-green-100 text-green-900'
        }`}>
          <p className="text-xs font-semibold mb-1.5 opacity-60 uppercase tracking-wide">AI Generated Message</p>
          <p className="whitespace-pre-line">{message}</p>
        </div>
      )}
    </div>
  );
}
