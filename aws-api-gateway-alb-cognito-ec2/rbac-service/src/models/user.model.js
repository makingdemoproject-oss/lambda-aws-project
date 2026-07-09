const bcrypt = require('bcryptjs');
const config = require('../config');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    firstName: { type: DataTypes.STRING(60), allowNull: false },
    lastName:  { type: DataTypes.STRING(60), allowNull: true },
    email:     { type: DataTypes.STRING(160), allowNull: false, unique: true, validate: { isEmail: true } },
    phone:     { type: DataTypes.STRING(20), allowNull: true },
    password:  { type: DataTypes.STRING, allowNull: false },
    isActive:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'users',
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: { include: ['password'] } } },
    hooks: {
      beforeCreate: async (u) => { if (u.password) u.password = await bcrypt.hash(u.password, config.bcrypt.saltRounds); },
      beforeUpdate: async (u) => { if (u.changed('password')) u.password = await bcrypt.hash(u.password, config.bcrypt.saltRounds); },
    },
  });

  User.prototype.comparePassword = function (c) { return bcrypt.compare(c, this.password); };

  User.associate = (m) => {
    User.belongsToMany(m.Role, { through: m.UserRole, foreignKey: 'userId', otherKey: 'roleId', as: 'roles' });
    User.hasMany(m.RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
  };

  return User;
};
