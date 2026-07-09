const { publishToSNS } = require('../lib/sns');

const dispatches = [
  { id: 'DSP-001', orderId: 'ORD-001', from: 'WH-DEL', assignedTo: 'Driver-A', status: 'delivered'  },
  { id: 'DSP-002', orderId: 'ORD-002', from: 'WH-MUM', assignedTo: 'Driver-B', status: 'in-transit' },
];

exports.getAll    = (req, res) => res.json({ success: true, count: dispatches.length, data: dispatches });
exports.getById   = (req, res) => {
  const d = dispatches.find(x => x.id === req.params.id);
  return d ? res.json({ success: true, data: d }) : res.status(404).json({ success: false });
};
exports.create    = async (req, res) => {
  const dsp = { id: 'DSP-' + Date.now(), status: 'assigned', ...req.body, dispatchedAt: new Date().toISOString() };
  dispatches.push(dsp);
  await publishToSNS('dispatch-created', dsp);
  res.status(201).json({ success: true, data: dsp });
};
exports.assign    = (req, res) => res.json({ success: true, data: { dispatchId: req.params.id, assignedTo: req.body.driver, assignedAt: new Date().toISOString() } });
exports.complete  = async (req, res) => {
  const dsp = { id: req.params.id, status: 'delivered', completedAt: new Date().toISOString() };
  await publishToSNS('dispatch-completed', dsp);
  res.json({ success: true, data: dsp });
};
