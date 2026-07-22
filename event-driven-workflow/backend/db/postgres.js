const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || '13.207.251.13',
  database: process.env.PG_DATABASE || 'rbacdb',
  user: process.env.PG_USER || 'lambdauser',
  password: process.env.PG_PASSWORD || 'Lambda@1234',
  port: parseInt(process.env.PG_PORT || '5432'),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
