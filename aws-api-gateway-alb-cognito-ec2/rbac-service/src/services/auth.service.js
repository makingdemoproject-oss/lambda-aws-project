const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Role, Permission, RefreshToken, PasswordReset, EmailVerification, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const { signAccess, signRefresh, verifyAccess, verifyRefresh, hashToken } = require('../utils/jwt');
const config = require('../config');
const redis = require('../utils/redis');
const sns   = require('../utils/sns');

const ms = (s) => {
  const m = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(String(s).trim()); if (!m) return Number(s);
  const n = Number(m[1]); return n * ({ ms: 1, s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2] || 'ms']);
};

const buildAccess  = (u) => signAccess({ sub: u.id, email: u.email });
const buildRefresh = (u) => signRefresh({ sub: u.id, type: 'refresh' });

const persistRefresh = (user, token, meta, t) => RefreshToken.create({
  userId: user.id, tokenHash: hashToken(token),
  userAgent: meta.userAgent, ipAddress: meta.ipAddress,
  expiresAt: new Date(Date.now() + ms(config.jwt.refreshExpiresIn)),
}, { transaction: t });

const register = async ({ firstName, lastName, email, password, phone }, meta) => {
  const out = await sequelize.transaction(async (t) => {
    const exists = await User.findOne({ where: { email }, transaction: t });
    if (exists) throw ApiError.conflict('Email already in use');

    const user = await User.create({ firstName, lastName, email, password, phone }, { transaction: t });
    const customer = await Role.findOne({ where: { key: 'customer' }, transaction: t });
    if (customer) await user.addRole(customer, { transaction: t });

    const access  = buildAccess(user);
    const refresh = buildRefresh(user);
    await persistRefresh(user, refresh, meta, t);
    return { user, access, refresh };
  });

  // Best-effort — fire the verification email AFTER the tx commits so we
  // don't keep the row locked while talking to RabbitMQ.
  issueVerification(out.user, meta).catch(() => {});

  const result = { user: out.user.toJSON(), accessToken: out.access, refreshToken: out.refresh };
  sns.publish('user.registered', { userId: out.user.id, email: out.user.email, firstName: out.user.firstName }).catch(() => {});
  return result;
};

const login = async ({ email, password }, meta) => {
  const user = await User.scope('withPassword').findOne({ where: { email } });
  if (!user || !(await user.comparePassword(password))) throw ApiError.unauthorized('Invalid credentials');
  if (!user.isActive) throw ApiError.forbidden('Account disabled');

  await user.update({ lastLoginAt: new Date() });
  const access  = buildAccess(user);
  const refresh = buildRefresh(user);
  await persistRefresh(user, refresh, meta);

  const safe = user.toJSON(); delete safe.password;
  sns.publish('user.loggedin', { userId: user.id, email: user.email, ipAddress: meta.ipAddress }).catch(() => {});
  return { user: safe, accessToken: access, refreshToken: refresh };
};

const refresh = async ({ refreshToken }, meta) => {
  let payload;
  try { payload = verifyRefresh(refreshToken); } catch { throw ApiError.unauthorized('Invalid refresh token'); }

  return sequelize.transaction(async (t) => {
    const tokenHash = hashToken(refreshToken);
    const stored = await RefreshToken.findOne({
      where: { tokenHash, userId: payload.sub }, transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      await RefreshToken.update({ revokedAt: new Date() },
        { where: { userId: payload.sub, revokedAt: null }, transaction: t });
      throw ApiError.unauthorized('Refresh token revoked');
    }
    await stored.update({ revokedAt: new Date() }, { transaction: t });

    const user = await User.findByPk(payload.sub, { transaction: t });
    if (!user) throw ApiError.unauthorized('User no longer exists');

    const access  = buildAccess(user);
    const newRef  = buildRefresh(user);
    await persistRefresh(user, newRef, meta, t);
    redis.del(`rbac:perms:${user.id}`).catch(() => {});
    return { accessToken: access, refreshToken: newRef, user: user.toJSON() };
  });
};

const logout = async ({ refreshToken, userId }) => {
  if (refreshToken) {
    await RefreshToken.update({ revokedAt: new Date() }, {
      where: { tokenHash: hashToken(refreshToken), userId, revokedAt: null },
    });
  } else {
    await RefreshToken.update({ revokedAt: new Date() }, {
      where: { userId, revokedAt: null },
    });
  }
  redis.del(`rbac:perms:${userId}`).catch(() => {});
};

/**
 * Token introspection — called by ecommerce/chat/ride to centrally validate
 * an access token. Returns the same `bundle` shape that local auth would
 * build, so downstream services can attach it directly to req.user.
 *
 * Failure modes (caller surfaces as 401/403):
 *   - signature/expiry invalid → throws ApiError 401
 *   - user not found or disabled → throws ApiError 401/403
 *
 * Honest tip: downstream services SHOULD cache successful responses
 * (Redis, 60s TTL) — every protected request would otherwise add a hop here.
 */
const verifyToken = async (token) => {
  let payload;
  try { payload = verifyAccess(token); }
  catch (e) {
    if (e.name === 'TokenExpiredError') throw ApiError.unauthorized('Token expired');
    throw ApiError.unauthorized('Invalid token');
  }

  const user = await User.findByPk(payload.sub, {
    include: [{
      model: Role, as: 'roles', through: { attributes: [] },
      include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
    }],
  });
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Account disabled');

  const permKeys = new Set();
  const roleKeys = [];
  for (const r of user.roles || []) {
    roleKeys.push(r.key);
    for (const p of r.permissions || []) permKeys.add(p.key);
  }
  return {
    id: user.id, email: user.email,
    firstName: user.firstName, lastName: user.lastName,
    roleKeys, permissions: [...permKeys],
    iat: payload.iat, exp: payload.exp,
  };
};

/**
 * Always returns success ("if your email is registered we sent a link") to
 * avoid leaking whether an email exists. The actual email goes through the
 * email.send RabbitMQ queue, which the worker delivers.
 *
 * The reset token is a random 32-byte value; we store only its hash. The
 * link the user gets is `<APP_URL>/reset-password?token=<raw>`.
 */
const forgotPassword = async ({ email }, meta) => {
  const user = await User.findOne({ where: { email } });
  if (!user) return { ok: true };           // intentional no-leak

  // Invalidate any older outstanding tokens for the same user.
  await PasswordReset.update(
    { consumedAt: new Date() },
    { where: { userId: user.id, consumedAt: null, expiresAt: { [Op.gt]: new Date() } } },
  );

  const raw = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);  // 30 minutes
  await PasswordReset.create({
    userId: user.id,
    tokenHash: hashToken(raw),
    expiresAt,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  // Best-effort email via RabbitMQ. If the broker is down we don't fail the
  // request — the user can retry. (Wire up amqplib publish here in real prod.)
  // The worker `email.send` handler turns this into an SES / SendGrid call.
  try {
    const amqp = require('amqplib');
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@127.0.0.1:5672');
    const ch = await conn.createConfirmChannel();
    await new Promise((res, rej) =>
      ch.publish('ecommerce.events', 'email.send', Buffer.from(JSON.stringify({
        template: 'password_reset',
        to: user.email,
        data: { firstName: user.firstName, resetToken: raw, expiresAt },
      })), { persistent: true, contentType: 'application/json' }, (err) => err ? rej(err) : res()));
    await ch.close(); await conn.close();
  } catch (e) { /* swallow — see comment above */ }

  return { ok: true };
};

const resetPassword = async ({ token, password }) =>
  sequelize.transaction(async (t) => {
    const row = await PasswordReset.findOne({
      where: { tokenHash: hashToken(token), consumedAt: null, expiresAt: { [Op.gt]: new Date() } },
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!row) throw ApiError.badRequest('Invalid or expired reset token');

    const user = await User.findByPk(row.userId, { transaction: t });
    if (!user) throw ApiError.badRequest('User not found');

    await user.update({ password }, { transaction: t });          // beforeUpdate hook hashes
    await row.update({ consumedAt: new Date() }, { transaction: t });

    // Belt + braces: kill all outstanding sessions and cached perms so a
    // stolen refresh token can't keep the attacker signed in.
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { userId: user.id, revokedAt: null }, transaction: t },
    );
    redis.del(`rbac:perms:${user.id}`).catch(() => {});
  });

/**
 * Authenticated password change. Different from reset (no token, must know
 * current password). Successful change revokes all existing refresh tokens
 * and the perm cache — re-login required across devices.
 */
const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (currentPassword === newPassword) throw ApiError.badRequest('New password must differ from current');

  return sequelize.transaction(async (t) => {
    const user = await User.scope('withPassword').findByPk(userId, { transaction: t });
    if (!user) throw ApiError.unauthorized('User not found');
    const ok = await user.comparePassword(currentPassword);
    if (!ok) throw ApiError.unauthorized('Current password is incorrect');

    await user.update({ password: newPassword }, { transaction: t });
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { userId, revokedAt: null }, transaction: t },
    );
    redis.del(`rbac:perms:${userId}`).catch(() => {});
  });
};

/**
 * Email verification — same one-shot hashed-token pattern as password reset.
 *
 * Called automatically after registration (best-effort) and again by users
 * via /auth/resend-verification. The frontend link is
 *   <APP_URL>/verify-email?token=<raw>
 *
 * We intentionally do NOT block login on verification; callers that need a
 * verified email gate features themselves by reading the `emailVerifiedAt`
 * field returned from /auth/me or /auth/verify.
 */
const issueVerification = async (user, meta = {}) => {
  if (user.emailVerifiedAt) return { ok: true, alreadyVerified: true };

  // Invalidate older outstanding tokens for the same user
  await EmailVerification.update(
    { consumedAt: new Date() },
    { where: { userId: user.id, consumedAt: null, expiresAt: { [Op.gt]: new Date() } } },
  );

  const raw = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);   // 24h
  await EmailVerification.create({
    userId: user.id,
    tokenHash: hashToken(raw),
    expiresAt,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  // Best-effort email via the same RabbitMQ pipeline as password resets.
  try {
    const amqp = require('amqplib');
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@127.0.0.1:5672');
    const ch = await conn.createConfirmChannel();
    await new Promise((res, rej) =>
      ch.publish('ecommerce.events', 'email.send', Buffer.from(JSON.stringify({
        template: 'email_verification',
        to: user.email,
        data: { firstName: user.firstName, verifyToken: raw, expiresAt },
      })), { persistent: true, contentType: 'application/json' }, (err) => err ? rej(err) : res()));
    await ch.close(); await conn.close();
  } catch { /* swallow — user can retry */ }

  return { ok: true };
};

const resendVerification = async ({ email }, meta) => {
  const user = await User.findOne({ where: { email } });
  if (!user) return { ok: true };       // no-leak — same as forgotPassword
  return issueVerification(user, meta);
};

const verifyEmail = async ({ token }) =>
  sequelize.transaction(async (t) => {
    const row = await EmailVerification.findOne({
      where: { tokenHash: hashToken(token), consumedAt: null, expiresAt: { [Op.gt]: new Date() } },
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!row) throw ApiError.badRequest('Invalid or expired verification link');

    const user = await User.findByPk(row.userId, { transaction: t });
    if (!user) throw ApiError.badRequest('User not found');

    if (!user.emailVerifiedAt) {
      await user.update({ emailVerifiedAt: new Date() }, { transaction: t });
    }
    await row.update({ consumedAt: new Date() }, { transaction: t });
    redis.del(`rbac:perms:${user.id}`).catch(() => {});
    sns.publish('user.email_verified', { userId: user.id }).catch(() => {});
    return { verifiedAt: user.emailVerifiedAt || new Date() };
  });

module.exports = {
  register, login, refresh, logout, verifyToken,
  forgotPassword, resetPassword, changePassword,
  issueVerification, resendVerification, verifyEmail,
};
