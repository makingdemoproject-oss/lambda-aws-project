const tracking = [
  { orderId: 'ORD-001', events: [{ status: 'placed', ts: '2024-01-01' }, { status: 'dispatched', ts: '2024-01-02' }, { status: 'delivered', ts: '2024-01-03' }] },
  { orderId: 'ORD-002', events: [{ status: 'placed', ts: '2024-01-05' }, { status: 'dispatched', ts: '2024-01-06' }] },
];

exports.getByOrder = (req, res) => {
  const t = tracking.find(x => x.orderId === req.params.orderId);
  return t ? res.json({ success: true, data: t }) : res.status(404).json({ success: false });
};
exports.addEvent   = (req, res) => res.json({ success: true, data: { orderId: req.params.orderId, ...req.body, addedAt: new Date().toISOString() } });
exports.getLive    = (req, res) => res.json({ success: true, data: { orderId: req.params.orderId, currentLocation: 'Mumbai Hub', eta: '2 hours', lat: 19.0760, lng: 72.8777 } });
exports.getHistory = (req, res) => res.json({ success: true, data: tracking });
exports.getETA     = (req, res) => res.json({ success: true, data: { orderId: req.params.orderId, eta: new Date(Date.now() + 7200000).toISOString(), hoursRemaining: 2 } });
