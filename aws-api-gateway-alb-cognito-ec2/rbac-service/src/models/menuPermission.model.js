module.exports = (sequelize, DataTypes) => sequelize.define('MenuPermission', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  menuId: { type: DataTypes.UUID, allowNull: false },
  roleId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'menu_permissions',
  indexes: [{ unique: true, fields: ['menu_id', 'role_id'] }],
});
