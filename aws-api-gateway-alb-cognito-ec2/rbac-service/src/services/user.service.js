const { Op } = require('sequelize');
const { User, Role, UserRole, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const redis = require('../utils/redis');

const list = async ({ q, limit = 20, offset = 0 }) => {
  const where = {};
  if (q) where[Op.or] = [
    { email: { [Op.iLike]: `%${q}%` } },
    { firstName: { [Op.iLike]: `%${q}%` } },
    { lastName:  { [Op.iLike]: `%${q}%` } },
  ];
  return User.findAndCountAll({
    where, limit, offset,
    order: [['createdAt', 'DESC']],
    include: [{ model: Role, as: 'roles', through: { attributes: [] }, attributes: ['id','key','name'] }],
  });
};

const getById = async (id) => {
  const user = await User.findByPk(id, {
    include: [{ model: Role, as: 'roles', through: { attributes: [] }, attributes: ['id','key','name'] }],
  });
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

const setActive = async (id, isActive) => {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.notFound('User not found');
  await user.update({ isActive });
  await redis.del(`rbac:perms:${id}`).catch(() => {});
  return user;
};

const updateRoles = async (userId, roleIds, assignedBy) =>
  sequelize.transaction(async (t) => {
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) throw ApiError.notFound('User not found');
    const roles = await Role.findAll({ where: { id: { [Op.in]: roleIds } }, transaction: t });
    await user.setRoles(roles, { through: { assignedBy, assignedAt: new Date() }, transaction: t });
    await redis.del(`rbac:perms:${userId}`).catch(() => {});
    return getById(userId);
  });

module.exports = { list, getById, setActive, updateRoles };
