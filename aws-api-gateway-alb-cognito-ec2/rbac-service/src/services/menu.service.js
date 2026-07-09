const { Op } = require('sequelize');
const { Menu, Role, MenuPermission, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Returns the menu tree pruned to what the current user can see.
 * Visibility = user holds menu.permissionKey OR one of user's roles is in MenuPermission OR user is super_admin.
 */
const buildForUser = async ({ roleKeys, permissions }) => {
  const isSuper = roleKeys.includes('super_admin');
  const [menus, mps, roles] = await Promise.all([
    Menu.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC']] }),
    MenuPermission.findAll(),
    Role.findAll({ attributes: ['id', 'key'] }),
  ]);
  const roleKeyById = Object.fromEntries(roles.map((r) => [r.id, r.key]));
  const allowed = new Set();
  for (const mp of mps) if (roleKeys.includes(roleKeyById[mp.roleId])) allowed.add(mp.menuId);
  const permSet = new Set(permissions);
  const visible = (m) => isSuper || (m.permissionKey && permSet.has(m.permissionKey)) || allowed.has(m.id);

  const byId = new Map(menus.map((m) => [m.id, { ...m.get({ plain: true }), children: [] }]));
  const roots = [];
  for (const n of byId.values()) {
    if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId).children.push(n);
    else roots.push(n);
  }
  const prune = (n) => {
    n.children = n.children.map(prune).filter(Boolean);
    return (visible(n) || n.children.length) ? n : null;
  };
  return roots.map(prune).filter(Boolean);
};

// ─── admin CRUD ─────────────────────────────────────────────────────────

const list = async () => {
  const menus = await Menu.findAll({
    include: [{ model: Role, as: 'roles', through: { attributes: [] }, attributes: ['id', 'key', 'name'] }],
    order: [['sortOrder', 'ASC']],
  });
  // also return as a tree for the frontend to render
  const flat = menus.map((m) => m.get({ plain: true }));
  const byId = new Map(flat.map((m) => [m.id, { ...m, children: [] }]));
  const tree = [];
  for (const n of byId.values()) {
    if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId).children.push(n);
    else tree.push(n);
  }
  return { flat, tree };
};

const getById = async (id) => {
  const menu = await Menu.findByPk(id, {
    include: [{ model: Role, as: 'roles', through: { attributes: [] }, attributes: ['id', 'key', 'name'] }],
  });
  if (!menu) throw ApiError.notFound('Menu not found');
  return menu;
};

const create = async ({ roleIds, ...payload }) =>
  sequelize.transaction(async (t) => {
    const menu = await Menu.create(payload, { transaction: t });
    if (Array.isArray(roleIds) && roleIds.length) {
      const roles = await Role.findAll({ where: { id: { [Op.in]: roleIds } }, transaction: t });
      await menu.setRoles(roles, { transaction: t });
    }
    return getById(menu.id);
  });

const update = async (id, { roleIds, ...payload }) =>
  sequelize.transaction(async (t) => {
    const menu = await Menu.findByPk(id, { transaction: t });
    if (!menu) throw ApiError.notFound('Menu not found');

    // prevent a parent from being made its own descendant
    if (payload.parentId === id) throw ApiError.badRequest('A menu cannot be its own parent');

    await menu.update(payload, { transaction: t });
    if (Array.isArray(roleIds)) {
      const roles = await Role.findAll({ where: { id: { [Op.in]: roleIds } }, transaction: t });
      await menu.setRoles(roles, { transaction: t });
    }
    return getById(id);
  });

const remove = async (id) => {
  const menu = await Menu.findByPk(id);
  if (!menu) throw ApiError.notFound('Menu not found');
  // CASCADE on parent_id is set at the DB level, so children also disappear.
  await menu.destroy();
};

module.exports = { buildForUser, list, getById, create, update, remove };
