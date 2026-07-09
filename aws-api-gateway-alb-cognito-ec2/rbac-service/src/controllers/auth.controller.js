const asyncHandler = require('../utils/asyncHandler');
const R = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const svc = require('../services/auth.service');

const meta = (req) => ({ userAgent: req.get('user-agent'), ipAddress: req.ip });

exports.register = asyncHandler(async (req, res) => R.created(res, await svc.register(req.body, meta(req)), 'Registered'));
exports.login    = asyncHandler(async (req, res) => R.ok     (res, await svc.login   (req.body, meta(req)), 'Logged in'));
exports.refresh  = asyncHandler(async (req, res) => R.ok     (res, await svc.refresh (req.body, meta(req)), 'Refreshed'));
exports.logout   = asyncHandler(async (req, res) => {
  await svc.logout({ refreshToken: req.body?.refreshToken, userId: req.user.id });
  return R.ok(res, null, 'Logged out');
});
exports.me = asyncHandler(async (req, res) => R.ok(res, req.user));

/**
 * Token introspection — used by other services for centralized token validation.
 * The caller passes its OWN bearer token in Authorization (so this endpoint
 * itself requires a valid token; it's an internal call from peer services or
 * the API Gateway authorizer).
 *
 * Alternative: accept `{ token }` in the body so a service can validate any
 * end-user token. Implemented below — the body shape wins if provided.
 */
exports.verify = asyncHandler(async (req, res) => {
  const headerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const token = req.body?.token || headerToken;
  if (!token) throw ApiError.badRequest('Missing token');
  const bundle = await svc.verifyToken(token);
  return R.ok(res, bundle, 'Verified');
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  await svc.forgotPassword(req.body, meta(req));
  // Generic success message — never reveal whether the email exists
  return R.ok(res, null, 'If the email is registered, a reset link has been sent');
});

exports.resetPassword = asyncHandler(async (req, res) => {
  await svc.resetPassword(req.body);
  return R.ok(res, null, 'Password reset — all existing sessions revoked');
});

exports.changePassword = asyncHandler(async (req, res) => {
  await svc.changePassword(req.user.id, req.body);
  return R.ok(res, null, 'Password changed — please sign in again on all devices');
});

exports.resendVerification = asyncHandler(async (req, res) => {
  await svc.resendVerification(req.body, meta(req));
  // Same no-leak pattern as forgotPassword
  return R.ok(res, null, 'If the email is registered, a verification link has been sent');
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const result = await svc.verifyEmail(req.body);
  return R.ok(res, result, 'Email verified');
});
