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

module.exports = { evaluate };
