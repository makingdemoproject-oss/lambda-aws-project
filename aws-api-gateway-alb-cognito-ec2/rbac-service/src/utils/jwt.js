const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

const opts = { issuer: 'rbac', audience: 'platform' };

const signAccess  = (p) => jwt.sign(p, config.jwt.accessSecret,  { ...opts, expiresIn: config.jwt.accessExpiresIn  });
const signRefresh = (p) => jwt.sign(p, config.jwt.refreshSecret, { ...opts, expiresIn: config.jwt.refreshExpiresIn });
const verifyAccess  = (t) => jwt.verify(t, config.jwt.accessSecret,  opts);
const verifyRefresh = (t) => jwt.verify(t, config.jwt.refreshSecret, opts);
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh, hashToken };
