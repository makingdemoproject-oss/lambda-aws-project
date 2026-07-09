module.exports = (sequelize, DataTypes) => sequelize.define('UserRole', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.UUID, allowNull: false },
  roleId: { type: DataTypes.UUID, allowNull: false },
  assignedBy: { type: DataTypes.UUID, allowNull: true },
  assignedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'user_roles',
  indexes: [{ unique: true, fields: ['user_id', 'role_id'] }],
});
