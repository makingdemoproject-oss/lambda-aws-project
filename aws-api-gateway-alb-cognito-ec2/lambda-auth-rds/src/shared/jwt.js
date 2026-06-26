const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

const sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: '24h' });

const verify = (token) => jwt.verify(token, SECRET);

module.exports = { sign, verify };
