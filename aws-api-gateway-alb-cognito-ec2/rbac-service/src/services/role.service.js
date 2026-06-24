const { Op } = require('sequelize');
const { Role, Permission, UserRole, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const redis = require('../utils/redis');

const invalidateRoleUserCaches = async (roleId) => {
  const rows = await UserRole.findAll({ where: { roleId }, attributes: ['userId'] });
  if (!rows.length) return;
  await redis.del(...rows.map((r) => `rbac:perms:${r.userId}`)).catch(() => {});
};

const list = async ({ limit = 50, offset = 0 } = {}) =>
  Role.findAndCountAll({
    include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
    order: [['name', 'ASC']],
    limit, offset,
  });

const getById = async (id) => {
  const r = await Role.findByPk(id, { include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }] });
  if (!r) throw ApiError.notFound('Role not found');
  return r;
};

const create = async ({ key, name, description, permissionIds }) =>
  sequelize.transaction(async (t) => {
    const role = await Role.create({ key, name, description }, { transaction: t });
    if (permissionIds?.length) {
      const perms = await Permission.findAll({ where: { id: { [Op.in]: permissionIds } }, transaction: t });
      await role.setPermissions(perms, { transaction: t });
    }
    return getById(role.id);
  });

const update = async (id, { name, description, permissionIds }) => {
  const role = await sequelize.transaction(async (t) => {
    const r = await Role.findByPk(id, { transaction: t });
    if (!r) throw ApiError.notFound('Role not found');
    if (r.isSystem) throw ApiError.forbidden('System roles cannot be modified');
    await r.update({ name, description }, { transaction: t });
    if (Array.isArray(permissionIds)) {
      const perms = await Permission.findAll({ where: { id: { [Op.in]: permissionIds } }, transaction: t });
      await r.setPermissions(perms, { transaction: t });
    }
    return r;
  });
  await invalidateRoleUserCaches(role.id);
  return getById(role.id);
};

const remove = async (id) => {
  const role = await Role.findByPk(id);
  if (!role) throw ApiError.notFound('Role not found');
  if (role.isSystem) throw ApiError.forbidden('System roles cannot be deleted');
  await invalidateRoleUserCaches(role.id);
  await role.destroy();
};

const listPermissions = () => Permission.findAll({ order: [['module','ASC'], ['name','ASC']] });

module.exports = { list, getById, create, update, remove, listPermissions };
