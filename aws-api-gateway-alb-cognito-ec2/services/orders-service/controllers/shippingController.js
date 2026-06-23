const { publishToSNS } = require('../lib/sns');

const shipments = [
  { id: 'SHP-001', orderId: 'ORD-001', carrier: 'BlueDart', trackingId: 'BD123456', status: 'delivered' },
  { id: 'SHP-002', orderId: 'ORD-002', carrier: 'Delhivery', trackingId: 'DL789012', status: 'in-transit' },
];

exports.getAll      = (req, res) => res.json({ success: true, count: shipments.length, data: shipments });
exports.getByOrder  = (req, res) => res.json({ success: true, data: shipments.filter(s => s.orderId === req.params.orderId) });
exports.create      = async (req, res) => {
  const shp = { id: 'SHP-' + Date.now(), status: 'created', ...req.body, createdAt: new Date().toISOString() };
  shipments.push(shp);
  await publishToSNS('shipment-created', shp);
  res.status(201).json({ success: true, data: shp });
};
exports.track       = (req, res) => res.json({ success: true, data: { trackingId: req.params.trackingId, status: 'in-transit', lastUpdate: new Date().toISOString(), location: 'Mumbai Hub' } });
exports.updateStatus= async (req, res) => {
  const shp = { id: req.params.id, ...req.body, updatedAt: new Date().toISOString() };
  await publishToSNS('shipment-updated', shp);
  res.json({ success: true, data: shp });
};
