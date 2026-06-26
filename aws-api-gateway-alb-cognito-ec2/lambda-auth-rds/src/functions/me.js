const { getPool } = require('../shared/db');

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  try {
    // userId injected by Lambda Authorizer via requestContext
    const userId = event.requestContext?.authorizer?.lambda?.userId;
    const pool = getPool();
    const result = await pool.query('SELECT id,email,name,created_at FROM lambda_users WHERE id=$1', [userId]);
    if (!result.rows.length) return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'User not found' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, data: result.rows[0] }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: e.message }) };
  }
};
