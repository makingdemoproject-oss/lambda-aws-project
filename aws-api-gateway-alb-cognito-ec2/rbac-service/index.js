// RBAC Service — EC2 pe port 4000, nginx port 80 se proxy hota hai
// Cognito VerifyAuthChallenge Lambda isko call karta hai PostgreSQL ke credentials verify karne ke liye
const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'rbac-service', port: PORT });
});

// ─── Auth Routes (proxy: nginx /api/v1 → localhost:4000) ─────────────────────
// Yaha actual implementation PostgreSQL se hoti hai (pg client)
// Neeche mock implementation hai demonstration ke liye

app.post('/api/v1/auth/register', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  if (password.length < 10) return res.status(400).json({ success: false, message: 'Password must be 10+ characters' });

  // Actual code: await db.query('INSERT INTO users (email, password_hash, first_name) VALUES ($1, $2, $3)', [email, bcrypt.hash(password), firstName])
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: { id: 'usr-' + Date.now(), email, firstName, role: 'user' },
  });
});

app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

  // Actual code: const user = await db.query('SELECT * FROM users WHERE email=$1', [email])
  // Actual code: const valid = await bcrypt.compare(password, user.password_hash)
  if (password.length < 8) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const payload = Buffer.from(JSON.stringify({ sub: email, role: 'admin', iat: Date.now() })).toString('base64');
  const token = `${payload}.${payload}.rbac-signature`;

  res.json({
    success: true,
    token,
    user: { email, role: 'admin', loginAt: new Date().toISOString() },
  });
});

// Cognito Lambda (VerifyAuthChallenge) yahan POST karta hai /api/auth/login path se
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false });
  if (password.length < 8) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  res.json({ success: true, user: { email, role: 'admin' } });
});

// ─── RBAC Routes (protected — accessed via /api/rbac/* on API Gateway) ────────
app.get('/api/rbac/roles', (req, res) => {
  res.json({ roles: ['admin', 'user', 'viewer', 'manager'] });
});

app.get('/api/rbac/permissions', (req, res) => {
  res.json({
    admin:   ['read', 'write', 'delete', 'manage_users'],
    manager: ['read', 'write', 'manage_team'],
    user:    ['read', 'write'],
    viewer:  ['read'],
  });
});

app.listen(PORT, () => console.log(`RBAC service on port ${PORT}`));
