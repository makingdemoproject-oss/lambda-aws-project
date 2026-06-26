/**
 * server.js — Lambda Authorizer concept as Express server
 *
 * AWS Deployed Flow:
 *   Browser -> HTTP API Gateway -> Lambda Authorizer -> Lambda fn -> RDS
 *
 * This Express server mirrors that flow:
 *   Browser -> Express -> lambdaAuthorizer middleware -> route handler -> RDS
 *
 * Routes:
 *   GET  /health            (public)
 *   POST /auth/register     (public)
 *   POST /auth/login        (public)
 *   GET  /auth/me           (protected — lambdaAuthorizer)
 *   POST /pincodes          (protected — lambdaAuthorizer)
 *   GET  /pincodes          (protected — lambdaAuthorizer)
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { getPool } = require('./db');

const authRoutes     = require('./routes/auth');
const pincodeRoutes  = require('./routes/pincodes');

const app  = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// GET /health — public, tests RDS connectivity
app.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }
  res.json({
    success: true,
    service: 'lambda-authorizer-api-gateway (Express)',
    db: dbStatus,
    ts: new Date().toISOString(),
    note: 'This server mirrors the deployed Lambda + API Gateway setup',
  });
});

app.use('/auth',     authRoutes);
app.use('/pincodes', pincodeRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Routes:');
  console.log('  GET  /health            (public)');
  console.log('  POST /auth/register     (public)');
  console.log('  POST /auth/login        (public)');
  console.log('  GET  /auth/me           (protected — lambdaAuthorizer)');
  console.log('  POST /pincodes          (protected — lambdaAuthorizer)');
  console.log('  GET  /pincodes          (protected — lambdaAuthorizer)');
});
