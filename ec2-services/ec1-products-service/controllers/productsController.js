const { publishToSNS } = require('../lib/sns');

const products = [
  { id: 1, name: 'Laptop Pro',   price: 75000, category: 'Electronics', stock: 50  },
  { id: 2, name: 'Smartphone X', price: 25000, category: 'Electronics', stock: 120 },
  { id: 3, name: 'Tablet Air',   price: 35000, category: 'Electronics', stock: 80  },
  { id: 4, name: 'Headphones',   price: 5000,  category: 'Accessories', stock: 200 },
  { id: 5, name: 'Smart Watch',  price: 15000, category: 'Accessories', stock: 60  },
];

exports.getAll        = (req, res) => res.json({ success: true, count: products.length, data: products });
exports.getById       = (req, res) => {
  const p = products.find(x => x.id === +req.params.id);
  return p ? res.json({ success: true, data: p }) : res.status(404).json({ success: false, message: 'Not found' });
};
exports.create        = async (req, res) => {
  const item = { id: Date.now(), ...req.body, createdAt: new Date().toISOString() };
  products.push(item);
  await publishToSNS('product-created', item);
  res.status(201).json({ success: true, data: item });
};
exports.update        = (req, res) => res.json({ success: true, data: { id: req.params.id, ...req.body, updatedAt: new Date().toISOString() } });
exports.getByCategory = (req, res) => res.json({ success: true, data: products.filter(p => p.category === req.params.cat) });
