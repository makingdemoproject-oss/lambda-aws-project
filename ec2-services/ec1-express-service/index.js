const cors = require("cors");
const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3001;
const HOSTNAME = os.hostname();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Authorization','Content-Type'] }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'express-service', host: HOSTNAME }));

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Required' });
  const p = Buffer.from(JSON.stringify({ sub: email, iat: Date.now() })).toString('base64');
  res.json({ success: true, token: p + '.' + p + '.sig', user: { email, role: 'admin' } });
});

app.post('/api/v1/auth/register', (req, res) => {
  const { email, firstName } = req.body;
  res.status(201).json({ success: true, message: 'User registered', user: { email, firstName, id: Date.now() } });
});

app.get('/api/app/products', (req, res) => res.json({ service: 'products', host: HOSTNAME, data: [{ id: 1, name: 'Laptop Pro', price: 75000 }, { id: 2, name: 'Smartphone X', price: 25000 }, { id: 3, name: 'Tablet Air', price: 35000 }] }));
app.post('/api/app/products', (req, res) => res.status(201).json({ id: Date.now(), ...req.body, host: HOSTNAME }));

app.get('/api/app/orders', (req, res) => res.json({ service: 'orders', host: HOSTNAME, data: [{ id: 'ORD-001', status: 'placed', amount: 75000 }, { id: 'ORD-002', status: 'shipped', amount: 25000 }] }));
app.post('/api/app/orders', (req, res) => res.status(201).json({ orderId: 'ORD-' + Date.now(), status: 'placed', ...req.body }));

app.get('/api/app/users', (req, res) => res.json({ service: 'users', host: HOSTNAME, data: [{ id: 'u1', name: 'Ranjan', email: 'ranjan@test.com', role: 'admin' }, { id: 'u2', name: 'Demo', email: 'demo@test.com', role: 'user' }] }));
app.get('/api/app/users/:id', (req, res) => res.json({ id: req.params.id, name: 'User-' + req.params.id }));

app.get('/api/app/payments', (req, res) => res.json({ service: 'payments', host: HOSTNAME, data: [{ id: 'PAY-001', amount: 75000, status: 'success' }] }));
app.post('/api/app/payments', (req, res) => res.status(201).json({ paymentId: 'PAY-' + Date.now(), status: 'processing', ...req.body }));

app.get('/api/app/inventory', (req, res) => res.json({ service: 'inventory', host: HOSTNAME, data: [{ productId: 1, stock: 50, warehouse: 'Delhi' }, { productId: 2, stock: 120, warehouse: 'Mumbai' }] }));

app.listen(PORT, () => console.log('Express on port ' + PORT + ' host ' + HOSTNAME));
