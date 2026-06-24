module.exports = (sequelize, DataTypes) => {
  const Menu = sequelize.define('Menu', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    parentId: { type: DataTypes.UUID, allowNull: true },
    key:   { type: DataTypes.STRING(96), allowNull: false, unique: true },
    label: { type: DataTypes.STRING(160), allowNull: false },
    icon:  { type: DataTypes.STRING(64), allowNull: true },
    path:  { type: DataTypes.STRING(255), allowNull: true },
    permissionKey: { type: DataTypes.STRING(96), allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, { tableName: 'menus' });

  Menu.associate = (m) => {
    Menu.belongsTo(Menu, { foreignKey: 'parentId', as: 'parent' });
    Menu.hasMany  (Menu, { foreignKey: 'parentId', as: 'children' });
    Menu.belongsToMany(m.Role, { through: m.MenuPermission, foreignKey: 'menuId', otherKey: 'roleId', as: 'roles' });
  };
  return Menu;
};
