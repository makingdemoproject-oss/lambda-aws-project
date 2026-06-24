module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define('RefreshToken', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId:    { type: DataTypes.UUID, allowNull: false },
    tokenHash: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    userAgent: { type: DataTypes.STRING, allowNull: true },
    ipAddress: { type: DataTypes.STRING, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    revokedAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'refresh_tokens',
    indexes: [{ fields: ['user_id'] }, { fields: ['expires_at'] }],
  });
  RefreshToken.associate = (m) => RefreshToken.belongsTo(m.User, { foreignKey: 'userId', as: 'user' });
  return RefreshToken;
};
