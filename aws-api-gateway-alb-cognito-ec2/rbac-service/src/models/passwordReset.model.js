module.exports = (sequelize, DataTypes) => {
  const PasswordReset = sequelize.define('PasswordReset', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId:    { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    consumedAt: { type: DataTypes.DATE, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.STRING, allowNull: true },
  }, { tableName: 'password_resets' });
  PasswordReset.associate = (m) => PasswordReset.belongsTo(m.User, { foreignKey: 'userId', as: 'user' });
  return PasswordReset;
};
