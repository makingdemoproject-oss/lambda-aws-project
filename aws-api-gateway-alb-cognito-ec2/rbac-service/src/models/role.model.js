module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    key:  { type: DataTypes.STRING(64), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, { tableName: 'roles' });

  Role.associate = (m) => {
    Role.belongsToMany(m.Permission, { through: m.RolePermission, foreignKey: 'roleId', otherKey: 'permissionId', as: 'permissions' });
    Role.belongsToMany(m.User,       { through: m.UserRole,       foreignKey: 'roleId', otherKey: 'userId', as: 'users' });
    Role.belongsToMany(m.Menu,       { through: m.MenuPermission, foreignKey: 'roleId', otherKey: 'menuId', as: 'menus' });
  };
  return Role;
};
