const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'order-api-secret-2024';

app.use(cors());
app.use(express.json());

// In-memory store (demo)
const db = {
  orders: [
    { id: 'ord-001', product: 'Laptop', qty: 1, price: 75000, status: 'delivered', userId: 'user-1', createdAt: new Date('2026-06-01').toISOString() },
    { id: 'ord-002', product: 'Phone',  qty: 2, price: 25000, status: 'shipped',   userId: 'user-1', createdAt: new Date('2026-06-10').toISOString() },
    { id: 'ord-003', product: 'Tablet', qty: 1, price: 35000, status: 'pending',   userId: 'user-2', createdAt: new Date('2026-06-20').toISOString() },
  ],
  products: [
    { id: 'pro-001', name: 'Laptop Pro',  category: 'Electronics', price: 75000, stock: 10 },
    { id: 'pro-002', name: 'iPhone 15',   category: 'Mobile',      price: 85000, stock: 25 },
    { id: 'pro-003', name: 'iPad Air',    category: 'Tablet',      price: 55000, stock: 15 },
  ],
  users: [
    { id: 'user-1', name: 'Rajan Sharma', email: 'rajan@example.com', role: 'admin' },
    { id: 'user-2', name: 'Priya Singh',  email: 'priya@example.com', role: 'customer' },
  ],
};

// ─── ROUTE 1: GET /health (PUBLIC) ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'order-processing-ec2-production',
    timestamp: new Date().toISOString(),
    routes: 15,
    uptime: Math.floor(process.uptime()) + 's',
  });
});

// ─── ROUTE 2: POST /auth/login (PUBLIC) ──────────────────────────────────────
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email);
  if (!user || password !== 'demo123') {
    return res.status(401).json({ error: 'Invalid credentials', hint: 'Use password: demo123' });
  }
  const token = jwt.sign({ userId: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role }, expiresIn: '2h' });
});

// ─── AUTH MIDDLEWARE (for protected routes) ───────────────────────────────────
const requireAuth = (req, res, next) => {
  const auth = req.headers['authorization'] || req.headers['x-amzn-oidc-data'];
  if (!auth) return res.status(401).json({ error: 'No token — pass Authorization: Bearer <token>' });
  try {
    req.user = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// ─── ROUTES 3-7: ORDERS (PROTECTED) ──────────────────────────────────────────
// ROUTE 3: GET /orders
app.get('/orders', requireAuth, (req, res) => {
  res.json({ orders: db.orders, total: db.orders.length, requestedBy: req.user.name });
});

// ROUTE 4: POST /orders
app.post('/orders', requireAuth, (req, res) => {
  const { product, qty, price } = req.body;
  if (!product || !qty || !price) return res.status(400).json({ error: 'product, qty, price required' });
  const order = { id: `ord-${uuidv4().slice(0,6)}`, product, qty, price, status: 'pending', userId: req.user.userId, createdAt: new Date().toISOString() };
  db.orders.push(order);
  res.status(201).json({ message: 'Order created', order });
});

// ROUTE 5: GET /orders/:id
app.get('/orders/:id', requireAuth, (req, res) => {
  const order = db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// ROUTE 6: PUT /orders/:id
app.put('/orders/:id', requireAuth, (req, res) => {
  const idx = db.orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  db.orders[idx] = { ...db.orders[idx], ...req.body, id: req.params.id };
  res.json({ message: 'Order updated', order: db.orders[idx] });
});

// ROUTE 6b: PATCH /orders/:id (partial update)
app.patch('/orders/:id', requireAuth, (req, res) => {
  const idx = db.orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  db.orders[idx] = { ...db.orders[idx], ...req.body, id: req.params.id };
  res.json({ message: 'Order partially updated (PATCH)', order: db.orders[idx] });
});

// ROUTE 7: DELETE /orders/:id
app.delete('/orders/:id', requireAuth, (req, res) => {
  const idx = db.orders.findIndex(o => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  const [deleted] = db.orders.splice(idx, 1);
  res.json({ message: 'Order deleted', order: deleted });
});

// ─── ROUTES 8-12: PRODUCTS (PROTECTED) ───────────────────────────────────────
// ROUTE 8: GET /products
app.get('/products', requireAuth, (req, res) => {
  const { category } = req.query;
  const list = category ? db.products.filter(p => p.category === category) : db.products;
  res.json({ products: list, total: list.length });
});

// ROUTE 9: POST /products
app.post('/products', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, category, price, stock } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'name and price required' });
  const product = { id: `pro-${uuidv4().slice(0,6)}`, name, category: category || 'General', price, stock: stock || 0 };
  db.products.push(product);
  res.status(201).json({ message: 'Product created', product });
});

// ROUTE 10: GET /products/:id
app.get('/products/:id', requireAuth, (req, res) => {
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// ROUTE 11: PUT /products/:id
app.put('/products/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const idx = db.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  db.products[idx] = { ...db.products[idx], ...req.body, id: req.params.id };
  res.json({ message: 'Product updated', product: db.products[idx] });
});

// ROUTE 11b: PATCH /products/:id (partial update)
app.patch('/products/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const idx = db.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  db.products[idx] = { ...db.products[idx], ...req.body, id: req.params.id };
  res.json({ message: 'Product partially updated (PATCH)', product: db.products[idx] });
});

// ROUTE 12: DELETE /products/:id
app.delete('/products/:id', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const idx = db.products.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });
  const [deleted] = db.products.splice(idx, 1);
  res.json({ message: 'Product deleted', product: deleted });
});

// ─── ROUTES 13-15: USERS (PROTECTED) ─────────────────────────────────────────
// ROUTE 13: GET /users
app.get('/users', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  res.json({ users: db.users.map(u => ({ ...u, password: undefined })), total: db.users.length });
});

// ROUTE 14: POST /users
app.post('/users', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { name, email, role } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });
  const user = { id: `user-${uuidv4().slice(0,6)}`, name, email, role: role || 'customer' };
  db.users.push(user);
  res.status(201).json({ message: 'User created', user });
});

// ROUTE 15: GET /users/:id
app.get('/users/:id', requireAuth, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (req.user.role !== 'admin' && req.user.userId !== user.id) {
    return res.status(403).json({ error: 'Forbidden — can only view own profile' });
  }
  res.json({ ...user, password: undefined });
});

app.listen(PORT, () => console.log(`order-processing-ec2-production running on port ${PORT}`));
