/**
 * Evaluates a single invoice and returns a reminder decision.
 * @param {Object} invoice - Mongoose invoice document (with dueDate, status, lastReminderSent)
 * @returns {{ decision: string, reason: string, nextSendTime?: Date }}
 */
const evaluate = (invoice) => {
  const now = new Date();

  // Rule 1: Already paid
  if (invoice.status === 'paid') {
    return { decision: 'SUPPRESS', reason: 'Customer already paid' };
  }

  // Rule 2: Reminder sent within last 48 hours
  if (invoice.lastReminderSent) {
    const hoursSince = (now - new Date(invoice.lastReminderSent)) / (1000 * 60 * 60);
    if (hoursSince < 48) {
      return { decision: 'SUPPRESS', reason: 'Reminder already sent recently' };
    }
  }

  // Rule 3: Outside business hours (10pm–7am)
  const hour = now.getHours();
  if (hour >= 22 || hour < 7) {
    const next9am = new Date(now);
    if (hour >= 22) next9am.setDate(next9am.getDate() + 1);
    next9am.setHours(9, 0, 0, 0);
    return { decision: 'DELAY', reason: 'Outside business hours', nextSendTime: next9am };
  }

  // Rule 4: Overdue by more than 7 days
  if (invoice.dueDate) {
    const daysOverdue = (now - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24);
    if (daysOverdue > 7) {
      return { decision: 'ESCALATE', reason: 'Payment significantly overdue', daysOverdue: Math.floor(daysOverdue) };
    }
  }

  // Rule 5: Default — send
  return { decision: 'SEND', reason: 'Invoice due, reminder appropriate' };
};

// ─── Enhanced notification engine ────────────────────────────────────────────

const HIGH_VALUE_THRESHOLD = 10000; // ₹10,000+  → always priority

/**
 * Context-aware notification decision.
 *
 * @param {Object} user     - Logged-in business owner (has lastActiveAt)
 * @param {Object} customer - Customer doc (has lastActiveAt, reminderIgnoreCount)
 * @param {Object} invoice  - Invoice doc (status, total, dueDate, ignoredCount)
 * @returns {{ action, reason, priority, nextSendTime, log }}
 */
const decideNotificationAction = (user, customer, invoice) => {
  const now = new Date();

  // ── Priority helper ──────────────────────────────────────────────────────
  const daysOverdue = invoice.dueDate
    ? Math.floor((now - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))
    : 0;

  const priority = daysOverdue > 7   ? 'high'
                 : daysOverdue >= 1  ? 'medium'
                 : /* not overdue */   'low';

  // Rule 1: Paid → hard suppress
  if (invoice.status === 'paid') {
    return {
      action: 'suppressed',
      reason: 'Invoice already paid — no reminder needed',
      priority: 'none',
      nextSendTime: null,
      log: `[SUPPRESS] Invoice ${invoice.invoiceNumber} — already paid`,
    };
  }

  // Rule 2: Business owner is actively using the app (within last 5 min) → delay
  const ownerLastActive = user?.lastActiveAt ? new Date(user.lastActiveAt) : null;
  const ownerIdleMinutes = ownerLastActive ? (now - ownerLastActive) / (1000 * 60) : Infinity;

  if (ownerIdleMinutes < 5) {
    const next = new Date(now.getTime() + 5 * 60 * 1000);
    return {
      action: 'delayed',
      reason: 'User is currently active — will send in 5 minutes',
      priority,
      nextSendTime: next,
      log: `[DELAY] Owner active ${Math.floor(ownerIdleMinutes)}m ago — holding notification`,
    };
  }

  // Rule 3: Reminder ignored 3+ times → escalate
  const ignoredCount = invoice.ignoredCount || 0;
  if (ignoredCount >= 3) {
    return {
      action: 'escalated',
      reason: `Reminder ignored ${ignoredCount} times — escalating to urgent tone`,
      priority: 'high',
      nextSendTime: null,
      log: `[ESCALATE] ${customer?.name} ignored ${ignoredCount} reminders — urgent escalation`,
    };
  }

  // Rule 4: High-value OR overdue > 7 days → send immediately
  const isHighValue = invoice.total >= HIGH_VALUE_THRESHOLD;
  if (daysOverdue > 7 || isHighValue) {
    const reason = daysOverdue > 7
      ? `Invoice overdue by ${daysOverdue} days — urgent follow-up`
      : `High-value invoice ₹${invoice.total.toLocaleString('en-IN')} — priority collection`;
    return {
      action: daysOverdue > 7 ? 'escalated' : 'sent',
      reason,
      priority: 'high',
      nextSendTime: null,
      log: `[${daysOverdue > 7 ? 'ESCALATE' : 'SEND'}] ${reason}`,
    };
  }

  // Rule 5: Default → send
  return {
    action: 'sent',
    reason: daysOverdue > 0
      ? `Invoice overdue by ${daysOverdue} day(s) — reminder appropriate`
      : 'Invoice due — sending friendly reminder',
    priority,
    nextSendTime: null,
    log: `[SEND] ${customer?.name} — priority ${priority}`,
  };
};

module.exports = { evaluate, decideNotificationAction };
