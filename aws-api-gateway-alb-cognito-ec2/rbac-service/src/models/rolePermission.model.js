module.exports = (sequelize, DataTypes) => sequelize.define('RolePermission', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  roleId: { type: DataTypes.UUID, allowNull: false },
  permissionId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'role_permissions',
  indexes: [{ unique: true, fields: ['role_id', 'permission_id'] }],
});
