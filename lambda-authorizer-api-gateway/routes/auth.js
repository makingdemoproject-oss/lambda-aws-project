const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { getPool }          = require('../db');
const lambdaAuthorizer     = require('../middleware/lambdaAuthorizer');

const router = express.Router();

// POST /auth/register — public (no authorizer)
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'email and password required' });

  try {
    const pool = getPool();
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO lambda_users(email, name, password_hash) VALUES($1,$2,$3) RETURNING id, email, name, created_at',
      [email, name || null, hash]
    );
    const user  = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ success: true, data: { user, accessToken: token } });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ success: false, message: 'Email already exists' });
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /auth/login — public (no authorizer)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'email and password required' });

  try {
    const pool   = getPool();
    const result = await pool.query('SELECT * FROM lambda_users WHERE email = $1', [email]);
    const user   = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, data: { user: { id: user.id, email: user.email, name: user.name }, accessToken: token } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /auth/me — protected by lambdaAuthorizer middleware
router.get('/me', lambdaAuthorizer, async (req, res) => {
  // req.lambdaContext.userId is set by lambdaAuthorizer (same as Lambda Authorizer context)
  const { userId } = req.lambdaContext;

  try {
    const pool   = getPool();
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM lambda_users WHERE id = $1',
      [userId]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
