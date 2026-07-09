const express          = require('express');
const { getPool }      = require('../db');
const lambdaAuthorizer = require('../middleware/lambdaAuthorizer');

const router = express.Router();

// POST /pincodes — protected (Lambda Authorizer validates JWT first)
router.post('/', lambdaAuthorizer, async (req, res) => {
  const { userId } = req.lambdaContext; // injected by lambdaAuthorizer
  const { pincode, city, state } = req.body;

  if (!pincode) return res.status(400).json({ success: false, message: 'pincode required' });

  try {
    const pool   = getPool();
    const result = await pool.query(
      'INSERT INTO pincodes(pincode, city, state, created_by) VALUES($1,$2,$3,$4) RETURNING *',
      [pincode, city || null, state || null, userId]
    );
    res.status(201).json({
      success: true,
      message: 'Pincode saved — authorized via lambdaAuthorizer middleware',
      authorizedUser: userId,
      data: result.rows[0],
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /pincodes — protected (Lambda Authorizer validates JWT first)
router.get('/', lambdaAuthorizer, async (req, res) => {
  const { userId } = req.lambdaContext;

  try {
    const pool   = getPool();
    const result = await pool.query(
      `SELECT p.*, u.email AS created_by_email
       FROM pincodes p
       LEFT JOIN lambda_users u ON u.id = p.created_by
       ORDER BY p.created_at DESC`
    );
    res.json({
      success: true,
      message: 'Fetched — only authenticated users can see this',
      authorizedUser: userId,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
