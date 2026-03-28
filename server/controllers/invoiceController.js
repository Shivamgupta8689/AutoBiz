const Invoice = require('../models/Invoice');

// Auto-generate invoice number: INV-YYYYMMDD-XXXX
const generateInvoiceNumber = async () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Invoice.countDocuments();
  return `INV-${date}-${String(count + 1).padStart(4, '0')}`;
};

// GST calculation
const calcGST = (items, gstPercent) => {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const gstAmount = parseFloat(((subtotal * gstPercent) / 100).toFixed(2));
  const total = parseFloat((subtotal + gstAmount).toFixed(2));
  return { subtotal: parseFloat(subtotal.toFixed(2)), gstAmount, total };
};

const create = async (req, res) => {
  const { customerId, items, gstPercent, dueDate } = req.body;

  if (!customerId || !items?.length || !dueDate)
    return res.status(400).json({ message: 'customerId, items, and dueDate are required' });

  try {
    const { subtotal, gstAmount, total } = calcGST(items, gstPercent ?? 18);
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await Invoice.create({
      userId: req.user._id,
      customerId,
      invoiceNumber,
      items,
      gstPercent: gstPercent ?? 18,
      subtotal,
      gstAmount,
      total,
      dueDate,
    });

    const populated = await invoice.populate('customerId', 'name businessName phone email');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getAll = async (req, res) => {
  try {
    const invoices = await Invoice.find({ userId: req.user._id })
      .populate('customerId', 'name businessName phone email')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('customerId', 'name businessName phone email');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!['paid', 'unpaid', 'overdue'].includes(status))
    return res.status(400).json({ message: 'Invalid status value' });

  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status },
      { new: true }
    ).populate('customerId', 'name businessName phone email');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { create, getAll, getById, updateStatus, remove };
