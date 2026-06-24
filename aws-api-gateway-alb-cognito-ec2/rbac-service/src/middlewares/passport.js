/**
 * Passport JWT strategy — used by every service in the platform.
 *
 *   - Same `JWT_ACCESS_SECRET` across rbac / ecommerce / chat / ride
 *   - Same issuer (`rbac`) + audience (`platform`) checked here
 *   - The verify callback rehydrates the user and (for rbac-service) computes
 *     the effective permission set, caching it in Redis for 60s
 *
 * `passport.authenticate('jwt', { session: false })` is wired in auth.js,
 * which keeps controller/route signatures identical to the old custom middleware.
 */
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const config = require('../config');
const { User, Role, Permission } = require('../models');
const redis = require('../utils/redis');
const logger = require('../utils/logger');

const PERM_TTL = 60;

passport.use(new JwtStrategy(
  {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.jwt.accessSecret,
    issuer: 'rbac',
    audience: 'platform',
    passReqToCallback: false,
  },
  async (payload, done) => {
    try {
      const key = `rbac:perms:${payload.sub}`;
      let bundle = null;
      try { const c = await redis.get(key); if (c) bundle = JSON.parse(c); } catch {}

      if (!bundle) {
        const user = await User.findByPk(payload.sub, {
          include: [{
            model: Role, as: 'roles', through: { attributes: [] },
            include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
          }],
        });
        if (!user)            return done(null, false, { message: 'User no longer exists' });
        if (!user.isActive)   return done(null, false, { message: 'Account disabled' });

        const permKeys = new Set();
        const roleKeys = [];
        for (const r of user.roles || []) {
          roleKeys.push(r.key);
          for (const p of r.permissions || []) permKeys.add(p.key);
        }
        bundle = {
          id: user.id, email: user.email,
          firstName: user.firstName, lastName: user.lastName,
          roleKeys, permissions: [...permKeys],
        };
        try { await redis.setex(key, PERM_TTL, JSON.stringify(bundle)); }
        catch (e) { logger.debug(`[passport] perm cache write failed: ${e.message}`); }
      }

      bundle.has    = (k)  => bundle.roleKeys.includes('super_admin') || bundle.permissions.includes(k);
      bundle.hasAny = (ks) => ks.some((k) => bundle.has(k));
      bundle.hasAll = (ks) => ks.every((k) => bundle.has(k));

      return done(null, bundle);
    } catch (err) {
      return done(err, false);
    }
  },
));

module.exports = passport;
