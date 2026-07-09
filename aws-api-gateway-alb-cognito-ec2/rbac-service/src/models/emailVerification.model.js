/**
 * One row per outstanding email-verification link.
 *
 * Same shape as password_resets — we keep them separate so the policies
 * (TTL, throttling, consumption rules) can diverge without surprising
 * either flow. Tokens are hashed at rest (SHA-256) so a DB dump doesn't
 * let an attacker click through verifications.
 */
module.exports = (sequelize, DataTypes) => {
  const EmailVerification = sequelize.define('EmailVerification', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId:     { type: DataTypes.UUID, allowNull: false },
    tokenHash:  { type: DataTypes.STRING(128), allowNull: false, unique: true },
    expiresAt:  { type: DataTypes.DATE, allowNull: false },
    consumedAt: { type: DataTypes.DATE, allowNull: true },
    ipAddress:  { type: DataTypes.STRING, allowNull: true },
    userAgent:  { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'email_verifications' });
  EmailVerification.associate = (m) => EmailVerification.belongsTo(m.User, { foreignKey: 'userId', as: 'user' });
  return EmailVerification;
};
