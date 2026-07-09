const { publishToSNS } = require('../lib/sns');

const payments = [
  { id: 'PAY-001', orderId: 'ORD-001', amount: 75000, method: 'UPI',         status: 'success'    },
  { id: 'PAY-002', orderId: 'ORD-002', amount: 25000, method: 'Card',        status: 'success'    },
  { id: 'PAY-003', orderId: 'ORD-003', amount: 5000,  method: 'NetBanking',  status: 'processing' },
];

exports.getAll    = (req, res) => res.json({ success: true, count: payments.length, data: payments });
exports.getById   = (req, res) => {
  const p = payments.find(x => x.id === req.params.id);
  return p ? res.json({ success: true, data: p }) : res.status(404).json({ success: false, message: 'Not found' });
};
exports.initiate  = async (req, res) => {
  const pay = { id: 'PAY-' + Date.now(), status: 'processing', ...req.body, initiatedAt: new Date().toISOString() };
  payments.push(pay);
  await publishToSNS('payment-initiated', pay);
  res.status(201).json({ success: true, data: pay });
};
exports.refund    = async (req, res) => {
  const refund = { refundId: 'REF-' + Date.now(), paymentId: req.params.id, status: 'processing', ...req.body };
  await publishToSNS('payment-refunded', refund);
  res.json({ success: true, data: refund });
};
exports.getByMethod = (req, res) => res.json({ success: true, data: payments.filter(p => p.method === req.params.method) });
