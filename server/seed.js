require('dotenv').config();
const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');

const User         = require('./models/User');
const Customer     = require('./models/Customer');
const Invoice      = require('./models/Invoice');
const Notification = require('./models/Notification');
const connectDB    = require('./config/db');
const { calcRisk } = require('./services/riskService');

// ── Date helpers ──────────────────────────────────────────────────────────────
const now    = new Date();
const ago    = (d) => new Date(now - d * 24 * 60 * 60 * 1000);   // d days ago
const fwd    = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000); // d days ahead
const hrsAgo = (h) => new Date(now - h * 60 * 60 * 1000);

// ── Attach riskScore + riskLevel using calcRisk ───────────────────────────────
const withRisk = (invoiceData, customerStats) => {
  const { score, level } = calcRisk(invoiceData, customerStats);
  return { ...invoiceData, riskScore: score, riskLevel: level };
};

const seed = async () => {
  await connectDB();

  // ── Wipe existing demo data ───────────────────────────────────────────────
  const existing = await User.findOne({ email: 'demo@kirana.com' });
  if (existing) {
    await Invoice.deleteMany({ userId: existing._id });
    await Customer.deleteMany({ userId: existing._id });
    await Notification.deleteMany({ userId: existing._id });
    await User.deleteOne({ _id: existing._id });
    console.log('Cleared existing demo data.');
  }

  // ── Demo user ─────────────────────────────────────────────────────────────
  const hashed = await bcrypt.hash('demo1234', 10);
  const user = await User.create({
    name: 'Arjun Kirana',
    email: 'demo@kirana.com',
    password: hashed,
    lastActiveAt: new Date(),
    busyMode: false,
  });
  console.log('Created user:', user.email);

  // ── 5 customers ───────────────────────────────────────────────────────────
  // reminderIgnoreCount reflects customer-side behaviour for risk context
  const [ramesh, priya, suresh, anita, ravi] = await Customer.insertMany([
    {
      userId: user._id,
      name: 'Ramesh Sharma',
      businessName: 'Sharma Kirana Store',
      phone: '9876543210',
      email: 'ramesh@example.com',
      reminderIgnoreCount: 2,      // chronic late payer
    },
    {
      userId: user._id,
      name: 'Priya Mehta',
      businessName: 'Priya Traders',
      phone: '9123456789',
      email: 'priya@example.com',
      reminderIgnoreCount: 1,      // occasionally slow
    },
    {
      userId: user._id,
      name: 'Suresh Kumar',
      businessName: 'Kumar General Store',
      phone: '9988776655',
      email: 'suresh@example.com',
      reminderIgnoreCount: 0,      // reliable, big-ticket buyer
    },
    {
      userId: user._id,
      name: 'Anita Joshi',
      businessName: 'Joshi Medicals',
      phone: '9765432100',
      email: 'anita@example.com',
      reminderIgnoreCount: 0,      // pays on time
    },
    {
      userId: user._id,
      name: 'Ravi Gupta',
      businessName: 'Gupta Electronics',
      phone: '9654321098',
      email: 'ravi@example.com',
      reminderIgnoreCount: 1,      // growing account, some delays
    },
  ]);
  console.log('Created 5 customers.');

  // ── Customer history passed to calcRisk (prior late-payment counts) ───────
  // These represent each customer's historical overdue behaviour known at seed time.
  const stats = {
    ramesh: { latePayments: 2 },  // 2 prior overdue invoices
    priya:  { latePayments: 1 },
    suresh: { latePayments: 0 },
    anita:  { latePayments: 0 },
    ravi:   { latePayments: 2 },  // recent spate of delays
  };

  // ── 10 invoices ───────────────────────────────────────────────────────────
  //
  //  # │ Customer │ Status  │ Amount   │ Overdue │ ignored │ Risk
  //  ──┼──────────┼─────────┼──────────┼─────────┼─────────┼────────
  //  1 │ Ramesh   │ paid    │ ₹2,520   │ 5d ago  │ 0       │ low
  //  2 │ Priya    │ paid    │ ₹1,260   │ 2d ago  │ 0       │ low
  //  3 │ Suresh   │ paid    │ ₹23,600★ │ 3d ago  │ 0       │ low
  //  4 │ Anita    │ paid    │ ₹4,480   │ 1d ago  │ 0       │ low
  //  5 │ Ravi     │ unpaid  │ ₹8,260   │ due+3d  │ 0       │ low
  //  6 │ Ramesh   │ overdue │ ₹4,032   │ 8d      │ 2 ✦     │ medium
  //  7 │ Priya    │ overdue │ ₹20,160★ │ 12d     │ 3 ✦     │ HIGH
  //  8 │ Suresh   │ overdue │ ₹14,160  │ 18d     │ 0       │ HIGH
  //  9 │ Anita    │ unpaid  │ ₹10,640  │ due+5d  │ 0       │ low
  // 10 │ Ravi     │ unpaid  │ ₹7,670   │ due+1d  │ 2 ✦     │ medium
  //
  //  ★ high-value (>₹20,000)   ✦ ignoredCount > 1

  await Invoice.insertMany([

    // ── 1. Ramesh — PAID | rice & dal settled ─────────────────────────────
    withRisk({
      userId: user._id, customerId: ramesh._id,
      invoiceNumber: 'INV-20260101-0001',
      items: [
        { name: 'Rice (50 kg)',  qty: 4, rate: 400 },
        { name: 'Dal (10 kg)',   qty: 4, rate: 200 },
      ],
      gstPercent: 5, subtotal: 2400, gstAmount: 120, total: 2520,
      status: 'paid', dueDate: ago(5),
      lastReminderSent: null, ignoredCount: 0,
    }, stats.ramesh),

    // ── 2. Priya — PAID | sugar, paid quickly ─────────────────────────────
    withRisk({
      userId: user._id, customerId: priya._id,
      invoiceNumber: 'INV-20260101-0002',
      items: [{ name: 'Sugar (25 kg)', qty: 5, rate: 240 }],
      gstPercent: 5, subtotal: 1200, gstAmount: 60, total: 1260,
      status: 'paid', dueDate: ago(2),
      lastReminderSent: null, ignoredCount: 0,
    }, stats.priya),

    // ── 3. Suresh — PAID | HIGH-VALUE bulk appliances ★ ───────────────────
    withRisk({
      userId: user._id, customerId: suresh._id,
      invoiceNumber: 'INV-20260102-0003',
      items: [{ name: 'Bulk Appliances Stock', qty: 2, rate: 10000 }],
      gstPercent: 18, subtotal: 20000, gstAmount: 3600, total: 23600,
      status: 'paid', dueDate: ago(3),
      lastReminderSent: null, ignoredCount: 0,
    }, stats.suresh),

    // ── 4. Anita — PAID | medical supplies, on time ───────────────────────
    withRisk({
      userId: user._id, customerId: anita._id,
      invoiceNumber: 'INV-20260102-0004',
      items: [{ name: 'OTC Medicines Batch', qty: 10, rate: 400 }],
      gstPercent: 12, subtotal: 4000, gstAmount: 480, total: 4480,
      status: 'paid', dueDate: ago(1),
      lastReminderSent: null, ignoredCount: 0,
    }, stats.anita),

    // ── 5. Ravi — UNPAID | accessories, due in 3 days ─────────────────────
    withRisk({
      userId: user._id, customerId: ravi._id,
      invoiceNumber: 'INV-20260103-0005',
      items: [{ name: 'Mobile Accessories', qty: 20, rate: 350 }],
      gstPercent: 18, subtotal: 7000, gstAmount: 1260, total: 8260,
      status: 'unpaid', dueDate: fwd(3),
      lastReminderSent: null, ignoredCount: 0,
    }, stats.ravi),

    // ── 6. Ramesh — OVERDUE 8d | ignoredCount=2 ✦ | medium risk ──────────
    withRisk({
      userId: user._id, customerId: ramesh._id,
      invoiceNumber: 'INV-20260104-0006',
      items: [{ name: 'Cooking Oil (15 L)', qty: 8, rate: 450 }],
      gstPercent: 12, subtotal: 3600, gstAmount: 432, total: 4032,
      status: 'overdue', dueDate: ago(8),
      lastReminderSent: hrsAgo(55), ignoredCount: 2,
    }, stats.ramesh),

    // ── 7. Priya — OVERDUE 12d | HIGH-VALUE ★ | ignoredCount=3 ✦ | HIGH ──
    withRisk({
      userId: user._id, customerId: priya._id,
      invoiceNumber: 'INV-20260104-0007',
      items: [{ name: 'Wholesale Textiles', qty: 1, rate: 18000 }],
      gstPercent: 12, subtotal: 18000, gstAmount: 2160, total: 20160,
      status: 'overdue', dueDate: ago(12),
      lastReminderSent: hrsAgo(72), ignoredCount: 3,
    }, stats.priya),

    // ── 8. Suresh — OVERDUE 18d | no ignores | HIGH risk (>15d bracket) ──
    withRisk({
      userId: user._id, customerId: suresh._id,
      invoiceNumber: 'INV-20260105-0008',
      items: [{ name: 'Commercial Refrigerator', qty: 1, rate: 12000 }],
      gstPercent: 18, subtotal: 12000, gstAmount: 2160, total: 14160,
      status: 'overdue', dueDate: ago(18),
      lastReminderSent: hrsAgo(96), ignoredCount: 0,
    }, stats.suresh),

    // ── 9. Anita — UNPAID | surgical supplies, due in 5 days ─────────────
    withRisk({
      userId: user._id, customerId: anita._id,
      invoiceNumber: 'INV-20260105-0009',
      items: [{ name: 'Surgical Supplies', qty: 5, rate: 1900 }],
      gstPercent: 12, subtotal: 9500, gstAmount: 1140, total: 10640,
      status: 'unpaid', dueDate: fwd(5),
      lastReminderSent: null, ignoredCount: 0,
    }, stats.anita),

    // ── 10. Ravi — UNPAID | electronics, ignoredCount=2 ✦ | medium risk ──
    withRisk({
      userId: user._id, customerId: ravi._id,
      invoiceNumber: 'INV-20260106-0010',
      items: [
        { name: 'Smartphone Cases',   qty: 50, rate: 100 },
        { name: 'Screen Protectors',  qty: 50, rate:  30 },
      ],
      gstPercent: 18, subtotal: 6500, gstAmount: 1170, total: 7670,
      status: 'unpaid', dueDate: fwd(1),
      lastReminderSent: null, ignoredCount: 2,
    }, stats.ravi),

  ]);
  console.log('Created 10 invoices.');

  // ── Seed a few realistic notifications ───────────────────────────────────
  const invoices = await Invoice.find({ userId: user._id }).sort({ createdAt: 1 });
  const [inv1,,inv3,,,,inv7,inv8] = invoices; // paid ones + two high-risk

  await Notification.insertMany([
    {
      userId: user._id,
      title: `Invoice ${inv3.invoiceNumber} created`,
      message: `New invoice of ₹${inv3.total.toLocaleString('en-IN')} created for Suresh Kumar. Due: ${ago(3).toLocaleDateString('en-IN')}.`,
      type: 'invoice_created',
      invoiceId: inv3._id,
      customerId: suresh._id,
      priority: 'low',
      read: true,
      createdAt: ago(3),
    },
    {
      userId: user._id,
      title: `Payment received — ${inv1.invoiceNumber}`,
      message: `Ramesh Sharma paid ₹${inv1.total.toLocaleString('en-IN')} for invoice ${inv1.invoiceNumber}.`,
      type: 'payment_received',
      invoiceId: inv1._id,
      customerId: ramesh._id,
      priority: 'medium',
      read: true,
      createdAt: ago(4),
    },
    {
      userId: user._id,
      title: `Escalation sent — ${inv7.invoiceNumber}`,
      message: `Urgent reminder sent to Priya Mehta for ₹${inv7.total.toLocaleString('en-IN')} (${inv7.invoiceNumber}) — ignored 3 times.`,
      type: 'escalation',
      invoiceId: inv7._id,
      customerId: priya._id,
      priority: 'high',
      read: false,
      createdAt: hrsAgo(72),
    },
    {
      userId: user._id,
      title: `Escalation sent — ${inv8.invoiceNumber}`,
      message: `Urgent reminder sent to Suresh Kumar for ₹${inv8.total.toLocaleString('en-IN')} (${inv8.invoiceNumber}) — overdue 18 days.`,
      type: 'escalation',
      invoiceId: inv8._id,
      customerId: suresh._id,
      priority: 'high',
      read: false,
      createdAt: hrsAgo(96),
    },
  ]);
  console.log('Created 4 seed notifications (2 unread escalations).');

  // ── Summary ───────────────────────────────────────────────────────────────
  const seededInvoices = await Invoice.find({ userId: user._id }).sort({ invoiceNumber: 1 });

  console.log('\n✓ Seed complete!');
  console.log('  Login: demo@kirana.com / demo1234\n');

  console.log('  Invoice risk scores:');
  seededInvoices.forEach(inv => {
    const customer = [
      [ramesh._id, 'Ramesh  '],
      [priya._id,  'Priya   '],
      [suresh._id, 'Suresh  '],
      [anita._id,  'Anita   '],
      [ravi._id,   'Ravi    '],
    ].find(([id]) => id.equals(inv.customerId))?.[1] || '?       ';
    console.log(
      `  ${inv.invoiceNumber}  ${customer}  ` +
      `₹${String(inv.total.toLocaleString('en-IN')).padStart(7)}  ` +
      `${String(inv.status).padEnd(8)}  ` +
      `risk: ${String(inv.riskScore).padStart(3)} (${inv.riskLevel})`
    );
  });

  console.log('\n  Expected reminder engine decisions:');
  console.log('  0001, 0002, 0003, 0004  → SUPPRESS  (paid)');
  console.log('  0005, 0009             → SUPPRESS  (not due yet)');
  console.log('  0006                   → SEND/ESCALATE  (overdue 8d, ignored 2x, medium risk)');
  console.log('  0007                   → ESCALATE  (overdue 12d + high-value + ignored 3x, HIGH risk)');
  console.log('  0008                   → ESCALATE  (overdue 18d, HIGH risk)');
  console.log('  0010                   → SEND  (not overdue yet but ignored 2x, medium risk)');

  console.log('\n  Analytics preview:');
  console.log('  Top revenue: Suresh ₹37,760 | Priya ₹21,420 | Ravi ₹15,930 | Anita ₹15,120 | Ramesh ₹6,552');
  console.log('  Paid: 4  |  Unpaid: 3  |  Overdue: 3');
  console.log('  High-value invoices (>₹20k): 0003 (₹23,600), 0007 (₹20,160)');
  console.log('  ignoredCount > 1: 0006 (×2), 0007 (×3), 0010 (×2)');

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
