const { getPool } = require('../shared/db');

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async () => {
  let dbStatus = 'ok';
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      service: 'lambda-auth-rds',
      db: dbStatus,
      ts: new Date().toISOString(),
    }),
  };
};
