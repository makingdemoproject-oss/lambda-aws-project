'use strict';
const { v4: uuid } = require('uuid');
const { QueryTypes } = require('sequelize');

/**
 * Bootstraps the "agent" role + its broad cross-service read/write
 * permissions. Service tokens (minted by `scripts/mint-service-token.js`)
 * are assigned to this role so cron Lambdas + agentic-service runs can:
 *
 *   - read across every domain (reports, dashboards, low-stock checks)
 *   - mutate the bits they own (mark bookings expired, fire alerts)
 *   - call the agentic-service to push a notification
 *
 * Deliberately NOT granted: anything that touches money (refunds, role
 * grants, user deletion). Those still require a human admin token.
 */
const SCHEMA = 'rbac';
const T = (n) => ({ tableName: n, schema: SCHEMA });

const PERMS = [
  // Read-everywhere — for the daily report + RCA flows
  { key: 'agent:read',          name: 'Agent — read across all services', module: 'agent' },
  // Domain-specific mutations the cron crons actually do
  { key: 'agent:expire',        name: 'Agent — expire pending bookings/orders', module: 'agent' },
  { key: 'agent:notify',        name: 'Agent — broadcast notifications',  module: 'agent' },
  // Inherited so the same token reaches each service's read endpoints
  // without listing them one by one in our reports tools
  'learn:read', 'hotel:read', 'ecommerce:read', 'chat:read', 'ride:read', 'agentic:run',
].map((p) => typeof p === 'string' ? { key: p, name: `inherited: ${p}`, module: p.split(':')[0] } : p);

module.exports = {
  async up(qi) {
    const now = new Date();

    // ─── ensure the agent role exists ──────────────────────────────
    const [existsRole] = await qi.sequelize.query(
      `SELECT id FROM rbac.roles WHERE key = 'agent' LIMIT 1`,
      { type: QueryTypes.SELECT },
    );
    let agentRoleId = existsRole?.id;
    if (!agentRoleId) {
      agentRoleId = uuid();
      await qi.bulkInsert(T('roles'), [{
        id: agentRoleId, key: 'agent', name: 'Service Agent',
        description: 'Non-human role for cron Lambdas + autonomous agentic-service runs. Long-lived service tokens are minted against this role.',
        created_at: now, updated_at: now,
      }]);
    }

    // ─── ensure each permission exists, then attach to agent role ───
    for (const p of PERMS) {
      const [existing] = await qi.sequelize.query(
        `SELECT id FROM rbac.permissions WHERE key = :key LIMIT 1`,
        { replacements: { key: p.key }, type: QueryTypes.SELECT },
      );
      const permId = existing?.id || uuid();
      if (!existing) {
        await qi.bulkInsert(T('permissions'), [{
          id: permId, key: p.key, name: p.name, module: p.module,
          created_at: now, updated_at: now,
        }]);
      }

      const [linked] = await qi.sequelize.query(
        `SELECT 1 FROM rbac.role_permissions WHERE role_id = :r AND permission_id = :p LIMIT 1`,
        { replacements: { r: agentRoleId, p: permId }, type: QueryTypes.SELECT },
      );
      if (!linked) {
        await qi.bulkInsert(T('role_permissions'), [{
          id: uuid(), role_id: agentRoleId, permission_id: permId,
          created_at: now, updated_at: now,
        }]);
      }
    }
  },

  async down(qi) {
    // Leave the role + permissions alone — a down-migration here would
    // invalidate every minted service token in the wild. Only the FK rows
    // in role_permissions are safe to drop, and even those carry rotation
    // cost. Comment out + manual cleanup if you really need it.
    void qi;
  },
};
