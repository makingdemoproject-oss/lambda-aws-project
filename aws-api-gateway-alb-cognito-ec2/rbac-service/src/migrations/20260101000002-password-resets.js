'use strict';

/**
 * Password-reset tokens.
 *
 * We store the SHA-256 hash, not the raw token, exactly like refresh tokens.
 * One-shot tokens — `consumedAt` flips on first use so a leaked link can't
 * be replayed.
 */
const SCHEMA = 'rbac';
const T = (n) => ({ tableName: n, schema: SCHEMA });

module.exports = {
  async up(qi, S) {
    await qi.createTable(T('password_resets'), {
      id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
      user_id: { type: S.UUID, allowNull: false, references: { model: { tableName: 'users', schema: 'rbac' }, key: 'id' }, onDelete: 'CASCADE' },
      token_hash: { type: S.STRING(128), allowNull: false, unique: true },
      expires_at: { type: S.DATE, allowNull: false },
      consumed_at: { type: S.DATE, allowNull: true },
      ip_address: { type: S.STRING, allowNull: true },
      user_agent: { type: S.STRING, allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
    });
    await qi.sequelize.query('CREATE INDEX password_resets_user_idx ON rbac.password_resets(user_id);');
    await qi.sequelize.query('CREATE INDEX password_resets_expires_idx ON rbac.password_resets(expires_at);');
  },
  async down(qi) { await qi.dropTable({ tableName: 'password_resets', schema: SCHEMA }); },
};
