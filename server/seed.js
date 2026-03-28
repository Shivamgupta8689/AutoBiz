require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User     = require('./models/User');
const Customer = require('./models/Customer');
const Invoice  = require('./models/Invoice');
const connectDB = require('./config/db');

const seed = async () => {
  await connectDB();

  // ── Wipe existing demo data ──────────────────────────────────────────────
  const existing = await User.findOne({ email: 'demo@kirana.com' });
  if (existing) {
    await Customer.deleteMany({ userId: existing._id });
    await Invoice.deleteMany({ userId: existing._id });
    await User.deleteOne({ _id: existing._id });
    console.log('Cleared existing demo data.');
  }

  // ── Demo user ────────────────────────────────────────────────────────────
  const hashed = await bcrypt.hash('demo1234', 10);
  const user = await User.create({
    name: 'Arjun Kirana',
    email: 'demo@kirana.com',
    password: hashed,
    lastActiveAt: new Date(), // owner is "active" right now for demo
  });
  console.log('Created user:', user.email);

  // ── 5 customers ──────────────────────────────────────────────────────────
  const [ramesh, priya, suresh, anita, ravi] = await Customer.insertMany([
    { userId: user._id, name: 'Ramesh Sharma',  businessName: 'Sharma Kirana Store',  phone: '9876543210', email: 'ramesh@example.com' },
    { userId: user._id, name: 'Priya Mehta',    businessName: 'Priya Traders',        phone: '9123456789', email: 'priya@example.com' },
    { userId: user._id, name: 'Suresh Kumar',   businessName: 'Kumar General Store',  phone: '9988776655', email: 'suresh@example.com' },
    { userId: user._id, name: 'Anita Joshi',    businessName: 'Joshi Medicals',       phone: '9765432100', email: 'anita@example.com' },
    { userId: user._id, name: 'Ravi Gupta',     businessName: 'Gupta Electronics',    phone: '9654321098', email: 'ravi@example.com' },
  ]);
  console.log('Created 5 customers.');

  const now     = new Date();
  const ago     = (d) => new Date(now - d * 24 * 60 * 60 * 1000);
  const from    = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
  const hrsAgo  = (h) => new Date(now - h * 60 * 60 * 1000);

  // ── 10 invoices ──────────────────────────────────────────────────────────
  await Invoice.insertMany([

    // 1. PAID → SUPPRESS  (Ramesh - rice, already settled)
    {
      userId: user._id, customerId: ramesh._id,
      invoiceNumber: 'INV-20240101-0001',
      items: [{ name: 'Rice (50kg)', qty: 4, rate: 400 }, { name: 'Dal (10kg)', qty: 4, rate: 200 }],
      gstPercent: 5, subtotal: 2400, gstAmount: 120, total: 2520,
      status: 'paid', dueDate: ago(5),
      lastReminderSent: null, ignoredCount: 0,
    },

    // 2. PAID → SUPPRESS  (Priya - sugar, paid quickly)
    {
      userId: user._id, customerId: priya._id,
      invoiceNumber: 'INV-20240102-0002',
      items: [{ name: 'Sugar (25kg)', qty: 5, rate: 240 }],
      gstPercent: 5, subtotal: 1200, gstAmount: 60, total: 1260,
      status: 'paid', dueDate: ago(2),
      lastReminderSent: null, ignoredCount: 0,
    },

    // 3. UNPAID due today → SEND  (Suresh - grocery stock)
    {
      userId: user._id, customerId: suresh._id,
      invoiceNumber: 'INV-20240103-0003',
      items: [{ name: 'Mixed Grocery Stock', qty: 1, rate: 5000 }],
      gstPercent: 18, subtotal: 5000, gstAmount: 900, total: 5900,
      status: 'unpaid', dueDate: from(0),
      lastReminderSent: null, ignoredCount: 0,
    },

    // 4. UNPAID due today → SEND  (Anita - medicines)
    {
      userId: user._id, customerId: anita._id,
      invoiceNumber: 'INV-20240104-0004',
      items: [{ name: 'OTC Medicines Batch', qty: 10, rate: 350 }],
      gstPercent: 12, subtotal: 3500, gstAmount: 420, total: 3920,
      status: 'unpaid', dueDate: from(0),
      lastReminderSent: null, ignoredCount: 0,
    },

    // 5. OVERDUE 3 days, ignoredCount 1 → SEND (medium priority)  (Ramesh - oil)
    {
      userId: user._id, customerId: ramesh._id,
      invoiceNumber: 'INV-20240105-0005',
      items: [{ name: 'Cooking Oil (15L)', qty: 8, rate: 400 }],
      gstPercent: 12, subtotal: 3200, gstAmount: 384, total: 3584,
      status: 'overdue', dueDate: ago(3),
      lastReminderSent: hrsAgo(50), ignoredCount: 1,
    },

    // 6. OVERDUE 5 days, ignoredCount 1 → SEND (medium priority)  (Priya - wholesale)
    {
      userId: user._id, customerId: priya._id,
      invoiceNumber: 'INV-20240106-0006',
      items: [{ name: 'Wholesale Goods', qty: 1, rate: 8500 }],
      gstPercent: 18, subtotal: 8500, gstAmount: 1530, total: 10030,
      status: 'overdue', dueDate: ago(5),
      lastReminderSent: hrsAgo(55), ignoredCount: 1,
    },

    // 7. OVERDUE 4 days, ignoredCount 1 → SEND (medium priority)  (Ravi - electronics)
    {
      userId: user._id, customerId: ravi._id,
      invoiceNumber: 'INV-20240107-0007',
      items: [{ name: 'Mobile Accessories', qty: 20, rate: 500 }],
      gstPercent: 18, subtotal: 10000, gstAmount: 1800, total: 11800,
      status: 'overdue', dueDate: ago(4),
      lastReminderSent: hrsAgo(60), ignoredCount: 1,
    },

    // 8. OVERDUE 10 days, ignoredCount 3 → ESCALATE (ignored 3 times)  (Suresh)
    {
      userId: user._id, customerId: suresh._id,
      invoiceNumber: 'INV-20240108-0008',
      items: [{ name: 'Bulk Rice (100kg)', qty: 2, rate: 3500 }],
      gstPercent: 5, subtotal: 7000, gstAmount: 350, total: 7350,
      status: 'overdue', dueDate: ago(10),
      lastReminderSent: hrsAgo(72), ignoredCount: 3,
    },

    // 9. OVERDUE 15 days, ignoredCount 3 → ESCALATE (overdue > 7 days)  (Anita)
    {
      userId: user._id, customerId: anita._id,
      invoiceNumber: 'INV-20240109-0009',
      items: [{ name: 'Surgical Supplies', qty: 5, rate: 2000 }],
      gstPercent: 12, subtotal: 10000, gstAmount: 1200, total: 11200,
      status: 'overdue', dueDate: ago(15),
      lastReminderSent: hrsAgo(80), ignoredCount: 3,
    },

    // 10. OVERDUE 1 day, reminder sent 10 hours ago → SUPPRESS (48h rule)  (Priya)
    {
      userId: user._id, customerId: priya._id,
      invoiceNumber: 'INV-20240110-0010',
      items: [{ name: 'Spices Assorted', qty: 30, rate: 180 }],
      gstPercent: 5, subtotal: 5400, gstAmount: 270, total: 5670,
      status: 'overdue', dueDate: ago(1),
      lastReminderSent: hrsAgo(10), ignoredCount: 1,
    },
  ]);
  console.log('Created 10 invoices.');

  console.log('\n✓ Seed complete!');
  console.log('  Login: demo@kirana.com / demo1234');
  console.log('\n  Expected reminder decisions:');
  console.log('  INV-0001, 0002  → SUPPRESS (paid)');
  console.log('  INV-0003, 0004  → SEND     (due today)');
  console.log('  INV-0005, 0006, 0007 → SEND (overdue 3-5d, medium priority)');
  console.log('  INV-0008, 0009  → ESCALATE (ignored 3x / overdue >7d)');
  console.log('  INV-0010        → SUPPRESS (reminded 10h ago)');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
