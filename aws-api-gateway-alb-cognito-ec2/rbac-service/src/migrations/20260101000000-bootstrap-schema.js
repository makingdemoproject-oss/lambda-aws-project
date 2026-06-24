'use strict';

/**
 * Owns the `rbac` schema setup.
 *   - Creates the `rbac` schema (idempotent)
 *   - Enables pgcrypto so we can call gen_random_uuid() for default UUIDs
 *   - Sets the search_path for the migration session so subsequent
 *     migrations can omit `schema: 'rbac'` and still land in the right place
 *
 * Run this FIRST. The remaining migrations write the actual tables.
 */
module.exports = {
  async up(qi) {
    await qi.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    await qi.sequelize.query('CREATE SCHEMA IF NOT EXISTS "rbac";');
    await qi.sequelize.query('SET search_path TO "rbac", public;');
  },
  async down(qi) {
    // We intentionally do NOT drop the schema here — it would cascade-delete
    // everything. Drop the schema manually if you really need to.
    await qi.sequelize.query('-- noop');
  },
};
