const r = require('express').Router();
const v = require('../validators');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const { authLimiter, loginLimiter, forgotPwLimiter, verifyLimiter } = require('../middlewares/rateLimit');
const c = require('../controllers/auth.controller');

// ─── public auth flow (per-route limits tuned to attack surface) ───
r.post('/register',         authLimiter,    validate(v.authRegister), c.register);
r.post('/login',            loginLimiter,   validate(v.authLogin),    c.login);
r.post('/refresh',          authLimiter,    validate(v.authRefresh),  c.refresh);
r.post('/forgot-password',  forgotPwLimiter, validate(v.authForgot),  c.forgotPassword);
r.post('/reset-password',   authLimiter,    validate(v.authReset),    c.resetPassword);
r.post('/verify-email',         authLimiter,    validate(v.authVerifyEmail),         c.verifyEmail);
r.post('/resend-verification',  forgotPwLimiter, validate(v.authResendVerification), c.resendVerification);

// ─── authenticated ──────────────────────────────────────────────────
r.post('/logout',           authenticate, c.logout);
r.get ('/me',               authenticate, c.me);
r.post('/change-password',  authenticate, validate(v.authChangePassword), c.changePassword);

// ─── centralized token introspection (called by peer services) ──────
r.post('/verify',           verifyLimiter, validate(v.authVerify), c.verify);

module.exports = r;
