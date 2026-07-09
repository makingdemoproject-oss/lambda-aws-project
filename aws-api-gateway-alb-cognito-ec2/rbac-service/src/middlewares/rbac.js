const ApiError = require('../utils/ApiError');

const require_ = (key) => (req, _res, next) =>
  !req.user ? next(ApiError.unauthorized())
    : req.user.has(key) ? next() : next(ApiError.forbidden(`Missing permission: ${key}`));

const requireAny = (keys) => (req, _res, next) =>
  !req.user ? next(ApiError.unauthorized())
    : req.user.hasAny(keys) ? next() : next(ApiError.forbidden(`Missing any of: ${keys.join(', ')}`));

const requireRole = (role) => (req, _res, next) =>
  !req.user ? next(ApiError.unauthorized())
    : req.user.roleKeys.includes(role) ? next() : next(ApiError.forbidden(`Requires role: ${role}`));

module.exports = { require: require_, requireAny, requireRole };
