module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    key:  { type: DataTypes.STRING(96), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(160), allowNull: false },
    module: { type: DataTypes.STRING(64), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
  }, { tableName: 'permissions' });

  Permission.associate = (m) => {
    Permission.belongsToMany(m.Role, { through: m.RolePermission, foreignKey: 'permissionId', otherKey: 'roleId', as: 'roles' });
  };
  return Permission;
};
