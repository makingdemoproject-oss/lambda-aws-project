'use strict';
const { v4: uuid } = require('uuid');
const { QueryTypes } = require('sequelize');

/**
 * Hotel-service capabilities + sidebar menu entry.
 *
 *   hotel:book   — book a stay (granted to every signed-in customer)
 *   hotel:own    — create/edit your own hotels (granted to "hotel_owner" role)
 *   hotel:manage — admin override across all properties (super_admin/manager)
 *
 * Also creates a new role `hotel_owner` so partners can list properties
 * without being granted full admin rights.
 */
const SCHEMA = 'rbac';
const T = (n) => ({ tableName: n, schema: SCHEMA });

module.exports = {
  async up(qi) {
    const now = new Date();

    const PERMS = [
      { key: 'hotel:book',   name: 'Book a hotel stay',          module: 'hotel' },
      { key: 'hotel:own',    name: 'List + manage own hotels',   module: 'hotel' },
      { key: 'hotel:manage', name: 'Manage all hotels (admin)',  module: 'hotel' },
    ];
    const permIds = {};
    for (const p of PERMS) {
      const [exists] = await qi.sequelize.query(
        `SELECT id FROM rbac.permissions WHERE key = :key LIMIT 1`,
        { replacements: { key: p.key }, type: QueryTypes.SELECT },
      );
      if (exists) { permIds[p.key] = exists.id; continue; }
      const id = uuid();
      await qi.bulkInsert(T('permissions'), [{ id, ...p, created_at: now, updated_at: now }]);
      permIds[p.key] = id;
    }

    // Make sure the `hotel_owner` role exists (the bootstrap seeder probably
    // doesn't know about it).
    const [existsRole] = await qi.sequelize.query(
      `SELECT id FROM rbac.roles WHERE key = 'hotel_owner' LIMIT 1`,
      { type: QueryTypes.SELECT },
    );
    let hotelOwnerId = existsRole?.id;
    if (!hotelOwnerId) {
      hotelOwnerId = uuid();
      await qi.bulkInsert(T('roles'), [{
        id: hotelOwnerId, key: 'hotel_owner', name: 'Hotel owner',
        description: 'Partner who lists properties on the platform',
        created_at: now, updated_at: now,
      }]);
    }

    const grants = {
      super_admin: ['hotel:book', 'hotel:own', 'hotel:manage'],
      manager:     ['hotel:book', 'hotel:manage'],
      hotel_owner: ['hotel:book', 'hotel:own'],
      customer:    ['hotel:book'],
    };
    for (const [roleKey, perms] of Object.entries(grants)) {
      const [role] = await qi.sequelize.query(
        `SELECT id FROM rbac.roles WHERE key = :key LIMIT 1`,
        { replacements: { key: roleKey }, type: QueryTypes.SELECT },
      );
      if (!role) continue;
      for (const p of perms) {
        const [already] = await qi.sequelize.query(
          `SELECT 1 FROM rbac.role_permissions WHERE role_id = :rid AND permission_id = :pid LIMIT 1`,
          { replacements: { rid: role.id, pid: permIds[p] }, type: QueryTypes.SELECT },
        );
        if (!already) {
          await qi.bulkInsert(T('role_permissions'), [{
            id: uuid(), role_id: role.id, permission_id: permIds[p],
            created_at: now, updated_at: now,
          }]);
        }
      }
    }

    // ─── menu entries ──────────────────────────────────────────────────
    const upsertMenu = async (m) => {
      const [exists] = await qi.sequelize.query(
        `SELECT id FROM rbac.menus WHERE key = :key LIMIT 1`,
        { replacements: { key: m.key }, type: QueryTypes.SELECT },
      );
      if (exists) return exists.id;
      const id = uuid();
      await qi.bulkInsert(T('menus'), [{ id, parent_id: null, ...m, is_active: true, created_at: now, updated_at: now }]);
      return id;
    };
    const hotelsMenuId = await upsertMenu({
      key: 'hotels', label: 'Hotels', icon: 'building', path: '/hotels',
      permission_key: 'hotel:book', sort_order: 11,
    });
    const myHotelsMenuId = await upsertMenu({
      key: 'my-hotels', label: 'My hotels', icon: 'building-plus', path: '/owner/hotels',
      permission_key: 'hotel:own', sort_order: 12,
    });

    const attach = async (menuId, roleKeys) => {
      const roles = await qi.sequelize.query(
        `SELECT id, key FROM rbac.roles WHERE key IN (:keys)`,
        { replacements: { keys: roleKeys }, type: QueryTypes.SELECT },
      );
      for (const r of roles) {
        const [already] = await qi.sequelize.query(
          `SELECT 1 FROM rbac.menu_permissions WHERE menu_id = :mid AND role_id = :rid LIMIT 1`,
          { replacements: { mid: menuId, rid: r.id }, type: QueryTypes.SELECT },
        );
        if (!already) {
          await qi.bulkInsert(T('menu_permissions'), [{
            id: uuid(), menu_id: menuId, role_id: r.id, created_at: now, updated_at: now,
          }]);
        }
      }
    };
    await attach(hotelsMenuId,   ['super_admin', 'manager', 'hotel_owner', 'customer']);
    await attach(myHotelsMenuId, ['super_admin', 'manager', 'hotel_owner']);
  },

  async down(qi) {
    await qi.bulkDelete(T('menus'), { key: ['hotels', 'my-hotels'] });
    await qi.sequelize.query(`
      DELETE FROM rbac.role_permissions WHERE permission_id IN (
        SELECT id FROM rbac.permissions WHERE key IN ('hotel:book','hotel:own','hotel:manage')
      );
    `);
    await qi.bulkDelete(T('permissions'), { key: ['hotel:book','hotel:own','hotel:manage'] });
    // Leave hotel_owner role in place — operators may have assigned users to it.
  },
};
