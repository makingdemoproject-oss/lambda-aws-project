/**
 * Authentication middleware — wraps Passport JWT (see ./passport.js).
 *
 * Wrapping instead of using `passport.authenticate` directly in routes:
 *   - turns Passport's `info` into our ApiError shape so error responses are uniform
 *   - hides the `session: false` boilerplate
 */
const passport = require('./passport');
const ApiError = require('../utils/ApiError');

const authenticate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      const msg = info?.message || 'Unauthorized';
      return next(/disabled/i.test(msg) ? ApiError.forbidden(msg) : ApiError.unauthorized(msg));
    }
    req.user = user;
    next();
  })(req, res, next);
};

module.exports = { authenticate };
