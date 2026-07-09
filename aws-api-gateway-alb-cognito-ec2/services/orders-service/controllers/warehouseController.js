const warehouses = [
  { id: 'WH-DEL', city: 'Delhi',   capacity: 10000, used: 7500,  status: 'active' },
  { id: 'WH-MUM', city: 'Mumbai',  capacity: 15000, used: 10000, status: 'active' },
  { id: 'WH-CHN', city: 'Chennai', capacity: 8000,  used: 5000,  status: 'active' },
];

exports.getAll    = (req, res) => res.json({ success: true, count: warehouses.length, data: warehouses });
exports.getById   = (req, res) => {
  const w = warehouses.find(x => x.id === req.params.id);
  return w ? res.json({ success: true, data: w }) : res.status(404).json({ success: false });
};
exports.getStock  = (req, res) => res.json({ success: true, data: { warehouseId: req.params.id, stock: [{ productId: 1, qty: 50 }, { productId: 2, qty: 120 }] } });
exports.transfer  = (req, res) => res.json({ success: true, data: { transferId: 'TRF-' + Date.now(), ...req.body, status: 'in-progress' } });
exports.getStats  = (req, res) => res.json({ success: true, data: warehouses.map(w => ({ ...w, utilization: Math.round(w.used / w.capacity * 100) + '%' })) });
