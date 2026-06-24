'use strict';
const { v4: uuid } = require('uuid');
const { QueryTypes } = require('sequelize');

/**
 * learn-service capabilities + the "instructor" role for teachers.
 *
 *   learn:teach   — create/manage own courses, schedule classes, grade exercises
 *   learn:enroll  — enroll yourself + complete lessons + submit (every customer)
 *   learn:admin   — platform-wide oversight: refunds, dashboards, deactivate courses
 *
 * Also creates two sidebar menus:
 *   /learn            — public catalog (everyone)
 *   /learn/dashboard  — personal dashboard (any signed-in user)
 *   /learn/teach      — instructor panel (instructors only)
 *   /learn/admin      — admin overview (super_admin, manager)
 */
const SCHEMA = 'rbac';
const T = (n) => ({ tableName: n, schema: SCHEMA });

module.exports = {
  async up(qi) {
    const now = new Date();

    const PERMS = [
      { key: 'learn:teach',  name: 'Teach (create + manage own courses)', module: 'learn' },
      { key: 'learn:enroll', name: 'Enroll in courses + submit',          module: 'learn' },
      { key: 'learn:admin',  name: 'Platform-wide learn admin',           module: 'learn' },
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

    // Create the `instructor` role if missing.
    const [existsRole] = await qi.sequelize.query(
      `SELECT id FROM rbac.roles WHERE key = 'instructor' LIMIT 1`,
      { type: QueryTypes.SELECT },
    );
    let instructorId = existsRole?.id;
    if (!instructorId) {
      instructorId = uuid();
      await qi.bulkInsert(T('roles'), [{
        id: instructorId, key: 'instructor', name: 'Instructor',
        description: 'Coding-school teacher — creates courses, schedules classes, grades exercises.',
        created_at: now, updated_at: now,
      }]);
    }

    const grants = {
      super_admin: ['learn:teach', 'learn:enroll', 'learn:admin'],
      manager:     ['learn:enroll', 'learn:admin'],
      instructor:  ['learn:teach', 'learn:enroll'],
      customer:    ['learn:enroll'],
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
    const catalogMenuId   = await upsertMenu({ key: 'learn-catalog',    label: 'Courses',           icon: 'book',    path: '/learn',           permission_key: 'learn:enroll', sort_order: 13 });
    const dashboardMenuId = await upsertMenu({ key: 'learn-dashboard',  label: 'My Learning',       icon: 'compass', path: '/learn/dashboard', permission_key: 'learn:enroll', sort_order: 14 });
    const teachMenuId     = await upsertMenu({ key: 'learn-teach',      label: 'Teach',             icon: 'pencil',  path: '/learn/teach',     permission_key: 'learn:teach',  sort_order: 15 });
    const adminMenuId     = await upsertMenu({ key: 'learn-admin',      label: 'Coding-school Ops', icon: 'graduation-cap', path: '/learn/admin',   permission_key: 'learn:admin', sort_order: 16 });

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
    await attach(catalogMenuId,   ['super_admin', 'manager', 'instructor', 'customer']);
    await attach(dashboardMenuId, ['super_admin', 'manager', 'instructor', 'customer']);
    await attach(teachMenuId,     ['super_admin', 'instructor']);
    await attach(adminMenuId,     ['super_admin', 'manager']);
  },

  async down(qi) {
    await qi.bulkDelete(T('menus'), { key: ['learn-catalog', 'learn-dashboard', 'learn-teach', 'learn-admin'] });
    await qi.sequelize.query(`
      DELETE FROM rbac.role_permissions WHERE permission_id IN (
        SELECT id FROM rbac.permissions WHERE key IN ('learn:teach','learn:enroll','learn:admin')
      );
    `);
    await qi.bulkDelete(T('permissions'), { key: ['learn:teach','learn:enroll','learn:admin'] });
    // The `instructor` role might already have users attached — leave it alone.
  },
};
