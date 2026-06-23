const express = require('express');
const path = require('path');
const os = require('os');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3001;
const HOSTNAME = os.hostname();

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'express-service', host: HOSTNAME, ts: new Date().toISOString() });
});

// ─── Products ─────────────────────────────────────────────────────────────────
app.get('/api/app/products', (req, res) => {
  res.json({
    service: 'products', host: HOSTNAME,
    data: [
      { id: 1, name: 'Laptop Pro',  price: 75000, category: 'Electronics', stock: 50 },
      { id: 2, name: 'Smartphone X', price: 25000, category: 'Electronics', stock: 120 },
      { id: 3, name: 'Tablet Air',   price: 35000, category: 'Electronics', stock: 80 },
      { id: 4, name: 'Headphones',   price: 5000,  category: 'Accessories', stock: 200 },
    ],
  });
});

app.post('/api/app/products', (req, res) => {
  res.status(201).json({ id: Date.now(), ...req.body, createdAt: new Date().toISOString(), host: HOSTNAME });
});

// ─── Orders ───────────────────────────────────────────────────────────────────
app.get('/api/app/orders', (req, res) => {
  res.json({
    service: 'orders', host: HOSTNAME,
    data: [
      { id: 'ORD-001', status: 'placed',    amount: 75000, customer: 'Ranjan' },
      { id: 'ORD-002', status: 'shipped',   amount: 25000, customer: 'Demo'   },
      { id: 'ORD-003', status: 'delivered', amount: 5000,  customer: 'Test'   },
    ],
  });
});

app.post('/api/app/orders', (req, res) => {
  res.status(201).json({
    orderId: 'ORD-' + Date.now(),
    status: 'placed',
    ...req.body,
    placedAt: new Date().toISOString(),
    host: HOSTNAME,
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────
app.get('/api/app/users', (req, res) => {
  res.json({
    service: 'users', host: HOSTNAME,
    data: [
      { id: 'u1', name: 'Ranjan',   email: 'ranjan@test.com', role: 'admin'  },
      { id: 'u2', name: 'Demo',     email: 'demo@test.com',   role: 'user'   },
      { id: 'u3', name: 'Test User', email: 'test@test.com',  role: 'viewer' },
    ],
  });
});

app.get('/api/app/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'User-' + req.params.id, host: HOSTNAME });
});

// ─── Payments ─────────────────────────────────────────────────────────────────
app.get('/api/app/payments', (req, res) => {
  res.json({
    service: 'payments', host: HOSTNAME,
    data: [
      { id: 'PAY-001', orderId: 'ORD-001', amount: 75000, status: 'success',  method: 'UPI'   },
      { id: 'PAY-002', orderId: 'ORD-002', amount: 25000, status: 'success',  method: 'Card'  },
      { id: 'PAY-003', orderId: 'ORD-003', amount: 5000,  status: 'pending',  method: 'NetBanking' },
    ],
  });
});

app.post('/api/app/payments', (req, res) => {
  res.status(201).json({
    paymentId: 'PAY-' + Date.now(),
    status: 'processing',
    ...req.body,
    initiatedAt: new Date().toISOString(),
    host: HOSTNAME,
  });
});

// ─── Inventory ────────────────────────────────────────────────────────────────
app.get('/api/app/inventory', (req, res) => {
  res.json({
    service: 'inventory', host: HOSTNAME,
    data: [
      { productId: 1, productName: 'Laptop Pro',   stock: 50,  warehouse: 'Delhi'   },
      { productId: 2, productName: 'Smartphone X', stock: 120, warehouse: 'Mumbai'  },
      { productId: 3, productName: 'Tablet Air',   stock: 80,  warehouse: 'Chennai' },
      { productId: 4, productName: 'Headphones',   stock: 200, warehouse: 'Delhi'   },
    ],
  });
});

// ─── Login (mock — for direct Express EC2 test without Cognito) ───────────────
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  const payload = Buffer.from(JSON.stringify({ sub: email, iat: Date.now(), exp: Date.now() + 3600000 })).toString('base64');
  res.json({ success: true, token: `${payload}.${payload}.mock-sig`, user: { email, role: 'admin' } });
});

app.post('/api/v1/auth/register', (req, res) => {
  const { email, firstName } = req.body;
  res.status(201).json({ success: true, message: 'User registered', user: { email, firstName, id: Date.now() } });
});

app.listen(PORT, () => console.log(`Express multi-service running on port ${PORT} (host: ${HOSTNAME})`));
