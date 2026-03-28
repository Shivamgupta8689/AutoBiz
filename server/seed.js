require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User     = require('./models/User');
const Customer = require('./models/Customer');
const Invoice  = require('./models/Invoice');

const connectDB = require('./config/db');

const seed = async () => {
  await connectDB();

  // Wipe existing demo data
  const existing = await User.findOne({ email: 'demo@kirana.com' });
  if (existing) {
    await Customer.deleteMany({ userId: existing._id });
    await Invoice.deleteMany({ userId: existing._id });
    await User.deleteOne({ _id: existing._id });
    console.log('Cleared existing demo data.');
  }

  // Create demo user
  const hashed = await bcrypt.hash('demo1234', 10);
  const user = await User.create({
    name: 'Arjun Kirana',
    email: 'demo@kirana.com',
    password: hashed,
  });
  console.log('Created user:', user.email);

  // Create 3 customers
  const [ramesh, priya, suresh] = await Customer.insertMany([
    { userId: user._id, name: 'Ramesh Sharma',  phone: '9876543210', businessName: 'Sharma Kirana Store',   email: 'ramesh@example.com' },
    { userId: user._id, name: 'Priya Mehta',    phone: '9123456789', businessName: 'Priya Traders',         email: 'priya@example.com' },
    { userId: user._id, name: 'Suresh Kumar',   phone: '9988776655', businessName: 'Kumar General Store',   email: 'suresh@example.com' },
  ]);
  console.log('Created 3 customers.');

  const now = new Date();

  const daysAgo  = (n) => new Date(now - n * 24 * 60 * 60 * 1000);
  const daysFrom = (n) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
  const hoursAgo = (n) => new Date(now - n * 60 * 60 * 1000);

  // Invoices
  await Invoice.insertMany([
    // 1. Ramesh — ₹2,400 unpaid, due 10 days ago → ESCALATE
    {
      userId: user._id,
      customerId: ramesh._id,
      invoiceNumber: 'INV-20240101-0001',
      items: [{ name: 'Rice (50kg)',     qty: 4, rate: 400 }, { name: 'Dal (10kg)', qty: 4, rate: 200 }],
      gstPercent: 5,
      subtotal: 2400,
      gstAmount: 120,
      total: 2520,
      status: 'overdue',
      dueDate: daysAgo(10),
      lastReminderSent: null,
    },
    // 2. Ramesh — ₹1,200 paid → SUPPRESS
    {
      userId: user._id,
      customerId: ramesh._id,
      invoiceNumber: 'INV-20240102-0002',
      items: [{ name: 'Sugar (25kg)', qty: 5, rate: 240 }],
      gstPercent: 5,
      subtotal: 1200,
      gstAmount: 60,
      total: 1260,
      status: 'paid',
      dueDate: daysAgo(2),
      lastReminderSent: null,
    },
    // 3. Priya — ₹8,500 unpaid, due 3 days ago → SEND
    {
      userId: user._id,
      customerId: priya._id,
      invoiceNumber: 'INV-20240103-0003',
      items: [{ name: 'Wholesale goods', qty: 1, rate: 8500 }],
      gstPercent: 18,
      subtotal: 8500,
      gstAmount: 1530,
      total: 10030,
      status: 'unpaid',
      dueDate: daysAgo(3),
      lastReminderSent: null,
    },
    // 4. Priya — ₹3,200 unpaid, reminder sent 10 hours ago → SUPPRESS
    {
      userId: user._id,
      customerId: priya._id,
      invoiceNumber: 'INV-20240104-0004',
      items: [{ name: 'Cooking oil (15L)', qty: 8, rate: 400 }],
      gstPercent: 12,
      subtotal: 3200,
      gstAmount: 384,
      total: 3584,
      status: 'unpaid',
      dueDate: daysAgo(1),
      lastReminderSent: hoursAgo(10),
    },
    // 5. Suresh — ₹5,000 unpaid, due today → SEND
    {
      userId: user._id,
      customerId: suresh._id,
      invoiceNumber: 'INV-20240105-0005',
      items: [{ name: 'Mixed grocery stock', qty: 1, rate: 5000 }],
      gstPercent: 18,
      subtotal: 5000,
      gstAmount: 900,
      total: 5900,
      status: 'unpaid',
      dueDate: daysFrom(0),
      lastReminderSent: null,
    },
  ]);
  console.log('Created 5 invoices.');

  console.log('\n✓ Seed complete!');
  console.log('  Login: demo@kirana.com / demo1234');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
