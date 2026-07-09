'use strict';

const SCHEMA = 'rbac';
const T = (name) => ({ tableName: name, schema: SCHEMA });

module.exports = {
  async up(qi, S) {
    await qi.createTable(T('users'), {
      id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
      first_name: { type: S.STRING(60), allowNull: false },
      last_name:  { type: S.STRING(60), allowNull: true },
      email:      { type: S.STRING(160), allowNull: false, unique: true },
      phone:      { type: S.STRING(20), allowNull: true },
      password:   { type: S.STRING, allowNull: false },
      is_active:  { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      email_verified_at: { type: S.DATE, allowNull: true },
      last_login_at: { type: S.DATE, allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
    });

    await qi.createTable(T('roles'), {
      id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
      key:  { type: S.STRING(64), allowNull: false, unique: true },
      name: { type: S.STRING(120), allowNull: false },
      description: { type: S.STRING(255), allowNull: true },
      is_system: { type: S.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
    });

    await qi.createTable(T('permissions'), {
      id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
      key:  { type: S.STRING(96), allowNull: false, unique: true },
      name: { type: S.STRING(160), allowNull: false },
      module: { type: S.STRING(64), allowNull: false },
      description: { type: S.STRING(255), allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
    });

    await qi.createTable(T('role_permissions'), {
      id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
      role_id: { type: S.UUID, allowNull: false, references: { model: T('roles'), key: 'id' }, onDelete: 'CASCADE' },
      permission_id: { type: S.UUID, allowNull: false, references: { model: T('permissions'), key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
    });
    await qi.sequelize.query('CREATE UNIQUE INDEX role_permissions_unique ON rbac.role_permissions(role_id, permission_id);');

    await qi.createTable(T('user_roles'), {
      id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
      user_id: { type: S.UUID, allowNull: false, references: { model: T('users'), key: 'id' }, onDelete: 'CASCADE' },
      role_id: { type: S.UUID, allowNull: false, references: { model: T('roles'), key: 'id' }, onDelete: 'CASCADE' },
      assigned_by: { type: S.UUID, allowNull: true, references: { model: T('users'), key: 'id' }, onDelete: 'SET NULL' },
      assigned_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
    });
    await qi.sequelize.query('CREATE UNIQUE INDEX user_roles_unique ON rbac.user_roles(user_id, role_id);');

    await qi.createTable(T('menus'), {
      id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
      parent_id: { type: S.UUID, allowNull: true, references: { model: T('menus'), key: 'id' }, onDelete: 'CASCADE' },
      key:   { type: S.STRING(96), allowNull: false, unique: true },
      label: { type: S.STRING(160), allowNull: false },
      icon:  { type: S.STRING(64), allowNull: true },
      path:  { type: S.STRING(255), allowNull: true },
      permission_key: { type: S.STRING(96), allowNull: true },
      sort_order: { type: S.INTEGER, allowNull: false, defaultValue: 0 },
      is_active:  { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
    });

    await qi.createTable(T('menu_permissions'), {
      id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
      menu_id: { type: S.UUID, allowNull: false, references: { model: T('menus'), key: 'id' }, onDelete: 'CASCADE' },
      role_id: { type: S.UUID, allowNull: false, references: { model: T('roles'), key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
    });
    await qi.sequelize.query('CREATE UNIQUE INDEX menu_permissions_unique ON rbac.menu_permissions(menu_id, role_id);');

    await qi.createTable(T('refresh_tokens'), {
      id: { type: S.UUID, primaryKey: true, defaultValue: S.literal('gen_random_uuid()') },
      user_id: { type: S.UUID, allowNull: false, references: { model: T('users'), key: 'id' }, onDelete: 'CASCADE' },
      token_hash: { type: S.STRING(128), allowNull: false, unique: true },
      user_agent: { type: S.STRING, allowNull: true },
      ip_address: { type: S.STRING, allowNull: true },
      expires_at: { type: S.DATE, allowNull: false },
      revoked_at: { type: S.DATE, allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.fn('NOW') },
    });

    // Other services need to read public-facing rbac.users for FK lookups
    // and display names. Grant SELECT to read-only roles created by their migrations.
    await qi.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ecommerce_app') THEN
          GRANT USAGE ON SCHEMA rbac TO ecommerce_app;
          GRANT SELECT ON rbac.users TO ecommerce_app;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chat_app') THEN
          GRANT USAGE ON SCHEMA rbac TO chat_app;
          GRANT SELECT ON rbac.users TO chat_app;
        END IF;
      END $$;
    `);
  },

  async down(qi) {
    for (const t of ['refresh_tokens','menu_permissions','menus','user_roles','role_permissions','permissions','roles','users']) {
      await qi.dropTable({ tableName: t, schema: SCHEMA });
    }
  },
};
