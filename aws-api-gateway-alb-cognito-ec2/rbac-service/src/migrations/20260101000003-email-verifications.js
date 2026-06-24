'use strict';

/**
 * Email-verification tokens + the timestamp on rbac.users.
 *
 *   email_verified_at NULL  → user hasn't clicked the link yet.
 *   We don't *block* login on this — services can choose to gate features
 *   (e.g. checkout, hotel-booking) on it via the `requireVerifiedEmail`
 *   middleware.
 *
 * Same one-shot hashed-token pattern as password_resets.
 */
const SCHEMA = 'rbac';
const T = (n) => ({ tableName: n, schema: SCHEMA });

module.exports = {
  async up(qi, S) {
    const tableDesc = await qi.describeTable(T('users'));
    if (!tableDesc.email_verified_at) {
      await qi.addColumn(T('users'), 'email_verified_at', { type: S.DATE, allowNull: true });
    }

    await qi.createTable(T('email_verifications'), {
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
    await qi.sequelize.query('CREATE INDEX email_verifications_user_idx    ON rbac.email_verifications(user_id);');
    await qi.sequelize.query('CREATE INDEX email_verifications_expires_idx ON rbac.email_verifications(expires_at);');
  },
  async down(qi) {
    await qi.dropTable({ tableName: 'email_verifications', schema: SCHEMA });
    await qi.removeColumn(T('users'), 'email_verified_at');
  },
};
