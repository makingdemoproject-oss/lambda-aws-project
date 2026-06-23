const { publishToSNS } = require('../lib/sns');
const { sendToSQS }    = require('../lib/sqs');

const orders = [
  { id: 'ORD-001', customerId: 'u1', items: [{ productId: 1, qty: 1 }], total: 75000, status: 'delivered' },
  { id: 'ORD-002', customerId: 'u2', items: [{ productId: 2, qty: 1 }], total: 25000, status: 'shipped'   },
  { id: 'ORD-003', customerId: 'u1', items: [{ productId: 4, qty: 2 }], total: 10000, status: 'placed'    },
];

exports.getAll    = (req, res) => res.json({ success: true, count: orders.length, data: orders });
exports.getById   = (req, res) => {
  const o = orders.find(x => x.id === req.params.id);
  return o ? res.json({ success: true, data: o }) : res.status(404).json({ success: false });
};
exports.create    = async (req, res) => {
  const order = { id: 'ORD-' + Date.now(), status: 'placed', ...req.body, placedAt: new Date().toISOString() };
  orders.push(order);
  await publishToSNS('order-placed', order);
  await sendToSQS('order-processing-queue', order);
  res.status(201).json({ success: true, data: order });
};
exports.updateStatus = async (req, res) => {
  const order = orders.find(x => x.id === req.params.id);
  if (!order) return res.status(404).json({ success: false });
  order.status = req.body.status;
  await publishToSNS('order-status-updated', order);
  res.json({ success: true, data: order });
};
exports.cancel    = async (req, res) => {
  const order = { id: req.params.id, status: 'cancelled', cancelledAt: new Date().toISOString() };
  await publishToSNS('order-cancelled', order);
  res.json({ success: true, data: order });
};
