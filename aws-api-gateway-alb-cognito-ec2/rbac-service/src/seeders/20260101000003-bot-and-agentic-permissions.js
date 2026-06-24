'use strict';
const { v4: uuid } = require('uuid');
const { QueryTypes } = require('sequelize');

/**
 * Adds the AI capabilities to the RBAC bootstrap.
 *
 *   bot:use      — talk to the AI chatbot
 *   agentic:read — view agent runs + alerts
 *   agentic:run  — trigger an agent run on demand + test-broadcast a notification
 *
 * Plus two sidebar menus: "AI Chat" (everyone with bot:use) and "AI Agent"
 * (admins/managers with agentic:read). Visibility is gated by `permission_key`
 * inside menu.service.buildForUser so the entries stay invisible to roles
 * without the right permission, even if they're listed under the role.
 */
const SCHEMA = 'rbac';
const T = (n) => ({ tableName: n, schema: SCHEMA });

module.exports = {
  async up(qi) {
    const now = new Date();

    const PERMS = [
      { key: 'bot:use',      name: 'Use AI chatbot',                 module: 'bot' },
      { key: 'agentic:read', name: 'View agent runs and alerts',     module: 'agentic' },
      { key: 'agentic:run',  name: 'Trigger agent and broadcast',    module: 'agentic' },
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

    // bot:use is broad (any signed-in user gets it); agentic:* is admin-only.
    const grants = {
      super_admin: ['bot:use', 'agentic:read', 'agentic:run'],
      manager:     ['bot:use', 'agentic:read'],
      customer:    ['bot:use'],
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
    const botMenuId = await upsertMenu({
      key: 'ai-chat', label: 'AI Chat', icon: 'sparkles', path: '/bot',
      permission_key: 'bot:use', sort_order: 9,
    });
    const agentMenuId = await upsertMenu({
      key: 'ai-agent', label: 'AI Agent', icon: 'cpu', path: '/agentic',
      permission_key: 'agentic:read', sort_order: 10,
    });

    // Attach menus to roles for visibility filtering
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
    await attach(botMenuId,   ['super_admin', 'manager', 'customer']);
    await attach(agentMenuId, ['super_admin', 'manager']);
  },

  async down(qi) {
    await qi.bulkDelete(T('menus'), { key: ['ai-chat', 'ai-agent'] });
    await qi.sequelize.query(`
      DELETE FROM rbac.role_permissions WHERE permission_id IN (
        SELECT id FROM rbac.permissions WHERE key IN ('bot:use','agentic:read','agentic:run')
      );
    `);
    await qi.bulkDelete(T('permissions'), { key: ['bot:use','agentic:read','agentic:run'] });
  },
};
