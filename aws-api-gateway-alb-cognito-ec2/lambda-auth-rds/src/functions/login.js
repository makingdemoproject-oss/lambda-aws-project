const bcrypt      = require('bcryptjs');
const { getPool } = require('../shared/db');
const { sign }    = require('../shared/jwt');

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body || '{}');
    if (!email || !password) return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'email and password required' }) };

    const pool = getPool();
    const result = await pool.query('SELECT id,email,name,password_hash FROM lambda_users WHERE email=$1', [email]);
    if (!result.rows.length) return { statusCode: 401, headers, body: JSON.stringify({ success: false, message: 'Invalid credentials' }) };

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return { statusCode: 401, headers, body: JSON.stringify({ success: false, message: 'Invalid credentials' }) };

    const accessToken = sign({ userId: user.id, email: user.email });
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: { user: { id: user.id, email: user.email, name: user.name }, accessToken } }),
    };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: e.message }) };
  }
};
