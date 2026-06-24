'use strict';
const { v4: uuid } = require('uuid');
const { QueryTypes } = require('sequelize');

/**
 * Adds the ride-booking capability to the RBAC bootstrap.
 *   permission key:  ride:use     — book and view your own rides
 *   permission key:  ride:drive   — accept rides as a driver
 *   permission key:  ride:manage  — admin can view all rides + refund
 * Plus a "Rides" sidebar menu entry visible to anyone with one of these.
 */
const SCHEMA = 'rbac';
const T = (n) => ({ tableName: n, schema: SCHEMA });

module.exports = {
  async up(qi) {
    const now = new Date();

    const PERMS = [
      { key: 'ride:use',    name: 'Book a ride',     module: 'ride' },
      { key: 'ride:drive',  name: 'Accept rides',    module: 'ride' },
      { key: 'ride:manage', name: 'Manage rides (admin)', module: 'ride' },
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

    // Grant ride:use to customer + manager + super_admin
    // Grant ride:manage to super_admin + manager
    const grants = {
      super_admin: ['ride:use','ride:drive','ride:manage'],
      manager:     ['ride:use','ride:manage'],
      customer:    ['ride:use'],
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

    // Menu entry
    const [exists] = await qi.sequelize.query(
      `SELECT id FROM rbac.menus WHERE key = 'rides' LIMIT 1`,
      { type: QueryTypes.SELECT },
    );
    let menuId = exists?.id;
    if (!menuId) {
      menuId = uuid();
      await qi.bulkInsert(T('menus'), [{
        id: menuId, parent_id: null,
        key: 'rides', label: 'Rides', icon: 'car', path: '/rides',
        permission_key: 'ride:use', sort_order: 7, is_active: true,
        created_at: now, updated_at: now,
      }]);
      // Driver-only entry — appears for users with ride:drive
      await qi.bulkInsert(T('menus'), [{
        id: uuid(), parent_id: null,
        key: 'driver-dashboard', label: 'Driver dashboard', icon: 'steering-wheel', path: '/driver',
        permission_key: 'ride:drive', sort_order: 8, is_active: true,
        created_at: now, updated_at: now,
      }]);
    }

    // Make the Rides menu visible across roles (visibility is then gated by
    // permission_key inside menu.service.buildForUser).
    const roles = await qi.sequelize.query(
      `SELECT id, key FROM rbac.roles WHERE key IN ('super_admin', 'manager', 'customer')`,
      { type: QueryTypes.SELECT },
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
  },

  async down(qi) {
    await qi.bulkDelete(T('menus'), { key: ['rides', 'driver-dashboard'] });
    await qi.sequelize.query(`
      DELETE FROM rbac.role_permissions WHERE permission_id IN (
        SELECT id FROM rbac.permissions WHERE key IN ('ride:use','ride:drive','ride:manage')
      );
    `);
    await qi.bulkDelete(T('permissions'), { key: ['ride:use','ride:drive','ride:manage'] });
  },
};
