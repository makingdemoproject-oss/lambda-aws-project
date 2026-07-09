const inventory = [
  { productId: 1, productName: 'Laptop Pro',   stock: 50,  reserved: 5,  warehouse: 'Delhi'   },
  { productId: 2, productName: 'Smartphone X', stock: 120, reserved: 10, warehouse: 'Mumbai'  },
  { productId: 3, productName: 'Tablet Air',   stock: 80,  reserved: 3,  warehouse: 'Chennai' },
  { productId: 4, productName: 'Headphones',   stock: 200, reserved: 20, warehouse: 'Delhi'   },
  { productId: 5, productName: 'Smart Watch',  stock: 60,  reserved: 8,  warehouse: 'Mumbai'  },
];

exports.getAll         = (req, res) => res.json({ success: true, data: inventory });
exports.getByProduct   = (req, res) => {
  const item = inventory.find(x => x.productId === +req.params.productId);
  return item ? res.json({ success: true, data: item }) : res.status(404).json({ success: false });
};
exports.reserve        = (req, res) => {
  const { productId, qty } = req.body;
  res.json({ success: true, data: { productId, reserved: qty, reservedAt: new Date().toISOString() } });
};
exports.release        = (req, res) => res.json({ success: true, data: { productId: req.params.productId, released: true } });
exports.getByWarehouse = (req, res) => res.json({ success: true, data: inventory.filter(i => i.warehouse === req.params.wh) });
