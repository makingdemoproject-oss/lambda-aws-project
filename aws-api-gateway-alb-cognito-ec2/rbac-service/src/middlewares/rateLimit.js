/**
 * Per-route rate limiters, all backed by Redis so the budget is shared
 * across replicas. Counts the client's real IP (we set `trust proxy` in
 * app.js so X-Forwarded-For from the ALB / nginx is respected).
 *
 *   globalLimiter      — soft cap across the whole service
 *   authLimiter        — login / refresh / forgot / reset / verify
 *   loginLimiter       — even tighter; per-email keying defeats credential stuffing
 *   forgotPwLimiter    — extra-tight; the response is identical regardless of
 *                        email existence, but the email itself costs $$
 *   verifyLimiter      — high cap; called by trusted peer services
 */
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const config = require('../config');
const redis = require('../utils/redis');
const logger = require('../utils/logger');

const store = (prefix) => {
  try { return new RedisStore({ sendCommand: (...a) => redis.call(...a), prefix }); }
  catch (e) { logger.warn(`[rateLimit] memory fallback: ${e.message}`); return undefined; }
};

const tooMany = (msg) => ({ success: false, message: msg });

const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  store: store('rl:rbac:'),
  standardHeaders: true, legacyHeaders: false,
  message: tooMany('Too many requests'),
});

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  store: store('rl:rbac-auth:'),
  skipSuccessfulRequests: true,
  standardHeaders: true, legacyHeaders: false,
  message: tooMany('Too many auth attempts'),
});

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  // key on email so an attacker can't try many emails from one IP either
  keyGenerator: (req) => `${req.ip}|${(req.body?.email || '').toLowerCase()}`,
  store: store('rl:rbac-login:'),
  skipSuccessfulRequests: true,
  standardHeaders: true, legacyHeaders: false,
  message: tooMany('Too many failed sign-in attempts — try again later'),
});

const forgotPwLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.ip}|${(req.body?.email || '').toLowerCase()}`,
  store: store('rl:rbac-forgot:'),
  standardHeaders: true, legacyHeaders: false,
  message: tooMany('Too many reset requests — check your inbox or try later'),
});

const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  store: store('rl:rbac-verify:'),
  standardHeaders: true, legacyHeaders: false,
  message: tooMany('Verification limit exceeded'),
});

module.exports = { globalLimiter, authLimiter, loginLimiter, forgotPwLimiter, verifyLimiter };
