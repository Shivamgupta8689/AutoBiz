/**
 * Workflow Automation Engine
 * Handles event-driven side effects: invoice created, payment received, smart reminders.
 */

const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { decideNotificationAction } = require('./reminderService');
const { generateReminderMessage } = require('./geminiService');

// ─── WhatsApp helper ──────────────────────────────────────────────────────────

const buildWhatsAppLink = (phone, message) => {
  const digits = (phone || '').replace(/\D/g, '');
  const number = digits.startsWith('91') ? digits : `91${digits}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

// ─── Simple event logger (no extra model needed) ──────────────────────────────

const log = (event, detail) =>
  console.log(`[AUTOMATION ${new Date().toISOString()}] ${event} — ${detail}`);

// ─── Event handlers ───────────────────────────────────────────────────────────

/**
 * Triggered immediately after an invoice is created.
 */
const handleInvoiceCreated = (invoice, customer) => {
  const due = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  const waMessage =
    `Hi ${customer.name}! 🧾\n` +
    `Invoice #${invoice.invoiceNumber} of ₹${invoice.total.toLocaleString('en-IN')} has been created.\n` +
    `Due date: ${due}\n` +
    `Please make the payment on time. Thank you!`;

  const waLink = customer.phone ? buildWhatsAppLink(customer.phone, waMessage) : null;

  const result = {
    event: 'invoice_created',
    invoiceNumber: invoice.invoiceNumber,
    customer: customer.name,
    whatsappMessage: waMessage,
    whatsappLink: waLink,
    log: `Invoice ${invoice.invoiceNumber} created → notification prepared for ${customer.name}`,
  };

  log('invoice_created', result.log);
  return result;
};

/**
 * Triggered when a payment is marked received.
 * Sets status=paid, clears reminder schedule, resets ignoredCount.
 */
const handlePaymentReceived = async (invoiceId) => {
  const invoice = await Invoice.findByIdAndUpdate(
    invoiceId,
    { status: 'paid', lastReminderSent: null, ignoredCount: 0 },
    { new: true }
  ).populate('customerId', 'name');

  if (!invoice) throw new Error('Invoice not found');

  const detail = `Payment received for ${invoice.invoiceNumber} (${invoice.customerId?.name}) ₹${invoice.total} — reminders suppressed, ignoredCount reset`;
  log('payment_received', detail);

  return {
    event: 'payment_received',
    invoiceNumber: invoice.invoiceNumber,
    customer: invoice.customerId?.name,
    amount: invoice.total,
    log: detail,
  };
};

/**
 * Smart reminder run: activity-aware, priority-sorted, WhatsApp links included.
 * Uses decideNotificationAction(user, customer, invoice).
 */
const runSmartReminders = async (userId, language = 'Hinglish') => {
  // Fetch the business owner for active-user check
  const owner = await User.findById(userId).select('lastActiveAt');

  const invoices = await Invoice.find({
    userId,
    status: { $in: ['unpaid', 'overdue'] },
  }).populate('customerId', 'name businessName phone email lastActiveAt reminderIgnoreCount');

  const results = [];

  for (const invoice of invoices) {
    const customer = invoice.customerId;
    const decision = decideNotificationAction(owner, customer, invoice);

    let message = null;
    let whatsappLink = null;

    if (decision.action === 'sent' || decision.action === 'escalated') {
      const daysOverdue = invoice.dueDate
        ? Math.max(0, Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24)))
        : 0;

      try {
        message = await generateReminderMessage({
          customerName: customer?.name || 'Customer',
          businessName: customer?.businessName || '',
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.total,
          daysOverdue,
          decision: decision.action === 'escalated' ? 'ESCALATE' : 'SEND',
          language,
        });

        // Update invoice: stamp reminder time + increment ignoredCount
        await Invoice.findByIdAndUpdate(invoice._id, {
          lastReminderSent: new Date(),
          $inc: { ignoredCount: 1 },
        });

        if (customer?.phone && message) {
          whatsappLink = buildWhatsAppLink(customer.phone, message);
        }
      } catch (err) {
        message = `[AI error: ${err.message}]`;
      }

      log('reminder_sent', `${invoice.invoiceNumber} → ${customer?.name} (${decision.action}, priority: ${decision.priority})`);
    }

    results.push({
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customer: { name: customer?.name, phone: customer?.phone },
      action: decision.action,
      reason: decision.reason,
      priority: decision.priority,
      nextSendTime: decision.nextSendTime || null,
      log: decision.log,
      message,
      whatsappLink,
    });
  }

  // Sort: high → medium → low → none
  const ORDER = { high: 0, medium: 1, low: 2, none: 3 };
  results.sort((a, b) => (ORDER[a.priority] ?? 4) - (ORDER[b.priority] ?? 4));

  return results;
};

module.exports = { handleInvoiceCreated, handlePaymentReceived, runSmartReminders, buildWhatsAppLink };
