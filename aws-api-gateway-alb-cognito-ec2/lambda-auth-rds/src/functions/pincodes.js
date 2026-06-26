const { getPool } = require('../shared/db');

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  // userId comes from Lambda Authorizer context
  const userId = event.requestContext?.authorizer?.lambda?.userId;
  const method = event.requestContext?.http?.method;

  const pool = getPool();

  try {
    if (method === 'POST') {
      const { pincode, city, state } = JSON.parse(event.body || '{}');
      if (!pincode) return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'pincode required' }) };

      const result = await pool.query(
        'INSERT INTO pincodes(pincode, city, state, created_by) VALUES($1,$2,$3,$4) RETURNING *',
        [pincode, city || null, state || null, userId]
      );
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Pincode saved via Lambda Authorizer → RDS',
          authorizedUser: userId,
          data: result.rows[0],
        }),
      };
    }

    if (method === 'GET') {
      const result = await pool.query(
        `SELECT p.*, u.email AS created_by_email
         FROM pincodes p
         LEFT JOIN lambda_users u ON u.id = p.created_by
         ORDER BY p.created_at DESC`
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Fetched via Lambda Authorizer — only authenticated users can see this',
          authorizedUser: userId,
          count: result.rows.length,
          data: result.rows,
        }),
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: e.message }) };
  }
};
