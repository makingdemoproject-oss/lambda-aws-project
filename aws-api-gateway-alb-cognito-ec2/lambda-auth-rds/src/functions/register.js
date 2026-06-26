const bcrypt    = require('bcryptjs');
const { getPool } = require('../shared/db');
const { sign }    = require('../shared/jwt');

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

exports.handler = async (event) => {
  try {
    const { email, password, name } = JSON.parse(event.body || '{}');
    if (!email || !password) return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'email and password required' }) };

    const pool = getPool();
    const exists = await pool.query('SELECT id FROM lambda_users WHERE email=$1', [email]);
    if (exists.rows.length) return { statusCode: 409, headers, body: JSON.stringify({ success: false, message: 'Email already registered' }) };

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO lambda_users(email, name, password_hash) VALUES($1,$2,$3) RETURNING id,email,name,created_at',
      [email, name || null, hash]
    );
    const user = result.rows[0];
    const accessToken = sign({ userId: user.id, email: user.email });

    return { statusCode: 201, headers, body: JSON.stringify({ success: true, data: { user, accessToken } }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: e.message }) };
  }
};
