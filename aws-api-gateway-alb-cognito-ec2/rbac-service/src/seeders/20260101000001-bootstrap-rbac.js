'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');

const SCHEMA = 'rbac';
const T = (name) => ({ tableName: name, schema: SCHEMA });

const PERMISSIONS = [
  // catalog (used by ecommerce-service)
  { key: 'product:read',    name: 'View products',     module: 'catalog' },
  { key: 'product:create',  name: 'Create products',   module: 'catalog' },
  { key: 'product:update',  name: 'Update products',   module: 'catalog' },
  { key: 'product:delete',  name: 'Delete products',   module: 'catalog' },
  { key: 'category:manage', name: 'Manage categories', module: 'catalog' },
  // sales
  { key: 'order:read',      name: 'View orders',       module: 'sales' },
  { key: 'order:update',    name: 'Update orders',     module: 'sales' },
  { key: 'order:refund',    name: 'Refund orders',     module: 'sales' },
  // shop
  { key: 'cart:manage',     name: 'Manage own cart',   module: 'shop' },
  { key: 'checkout:place',  name: 'Place orders',      module: 'shop' },
  // chat (used by chat-service)
  { key: 'chat:use',        name: 'Use chat',          module: 'chat' },
  // admin
  { key: 'user:read',       name: 'View users',        module: 'admin' },
  { key: 'user:manage',     name: 'Manage users',      module: 'admin' },
  { key: 'role:manage',     name: 'Manage roles',      module: 'admin' },
  { key: 'menu:manage',     name: 'Manage menus',      module: 'admin' },
];

const ROLES = [
  { key: 'super_admin', name: 'Super Admin', isSystem: true, perms: '*' },
  { key: 'manager',     name: 'Store Manager', perms: [
    'product:read','product:create','product:update','product:delete','category:manage',
    'order:read','order:update','user:read','chat:use',
  ]},
  { key: 'customer',    name: 'Customer', perms: [
    'product:read','cart:manage','checkout:place','order:read','chat:use',
  ]},
];

const MENUS = [
  { key: 'dashboard',  label: 'Dashboard',  path: '/admin',                 sortOrder: 1,  roles: ['super_admin','manager'] },
  { key: 'catalog',    label: 'Catalog',    path: null,                     sortOrder: 2,  roles: ['super_admin','manager'], children: [
    { key: 'products',   label: 'Products',   path: '/admin/products',   permissionKey: 'product:read',    sortOrder: 1, roles: ['super_admin','manager'] },
    { key: 'categories', label: 'Categories', path: '/admin/categories', permissionKey: 'category:manage', sortOrder: 2, roles: ['super_admin','manager'] },
  ]},
  { key: 'orders',     label: 'Orders',     path: '/admin/orders', permissionKey: 'order:read', sortOrder: 3, roles: ['super_admin','manager'] },
  { key: 'admin',      label: 'Admin',      path: null, sortOrder: 99, roles: ['super_admin'], children: [
    { key: 'users', label: 'Users', path: '/admin/users', permissionKey: 'user:manage', sortOrder: 1, roles: ['super_admin'] },
    { key: 'roles', label: 'Roles', path: '/admin/roles', permissionKey: 'role:manage', sortOrder: 2, roles: ['super_admin'] },
    { key: 'menus', label: 'Menus', path: '/admin/menus', permissionKey: 'menu:manage', sortOrder: 3, roles: ['super_admin'] },
  ]},
  { key: 'shop',      label: 'Shop',       path: '/shop',     sortOrder: 4, roles: ['customer'] },
  { key: 'my-orders', label: 'My Orders',  path: '/orders',   permissionKey: 'order:read', sortOrder: 5, roles: ['customer'] },
  { key: 'messages',  label: 'Messages',   path: '/chat',     permissionKey: 'chat:use',   sortOrder: 6, roles: ['super_admin','manager','customer'] },
];

module.exports = {
  async up(qi) {
    const now = new Date();

    const permRows = PERMISSIONS.map((p) => ({ id: uuid(), ...p, created_at: now, updated_at: now }));
    await qi.bulkInsert(T('permissions'), permRows);
    const permByKey = Object.fromEntries(permRows.map((p) => [p.key, p.id]));

    const roleRows = ROLES.map((r) => ({
      id: uuid(), key: r.key, name: r.name, is_system: !!r.isSystem,
      created_at: now, updated_at: now,
    }));
    await qi.bulkInsert(T('roles'), roleRows);
    const roleByKey = Object.fromEntries(roleRows.map((r) => [r.key, r.id]));

    const grants = [];
    for (const r of ROLES) {
      const wanted = r.perms === '*' ? PERMISSIONS.map((p) => p.key) : r.perms;
      for (const pk of wanted) {
        grants.push({ id: uuid(), role_id: roleByKey[r.key], permission_id: permByKey[pk], created_at: now, updated_at: now });
      }
    }
    await qi.bulkInsert(T('role_permissions'), grants);

    const flat = [];
    const flatten = (items, parentId = null) => {
      for (const it of items) {
        const id = uuid();
        flat.push({
          id, parent_id: parentId, key: it.key, label: it.label, icon: it.icon || null,
          path: it.path || null, permission_key: it.permissionKey || null,
          sort_order: it.sortOrder, is_active: true, created_at: now, updated_at: now,
          _roles: it.roles,
        });
        if (it.children) flatten(it.children, id);
      }
    };
    flatten(MENUS);
    await qi.bulkInsert(T('menus'), flat.map(({ _roles, ...r }) => r));

    const mp = [];
    for (const m of flat) {
      for (const rk of m._roles || []) {
        if (!roleByKey[rk]) continue;
        mp.push({ id: uuid(), menu_id: m.id, role_id: roleByKey[rk], created_at: now, updated_at: now });
      }
    }
    if (mp.length) await qi.bulkInsert(T('menu_permissions'), mp);

    const adminId = uuid();
    const hash = await bcrypt.hash('Admin@12345', 12);
    await qi.bulkInsert(T('users'), [{
      id: adminId, first_name: 'Super', last_name: 'Admin',
      email: 'admin@example.com', password: hash,
      is_active: true, email_verified_at: now,
      created_at: now, updated_at: now,
    }]);
    await qi.bulkInsert(T('user_roles'), [{
      id: uuid(), user_id: adminId, role_id: roleByKey['super_admin'],
      assigned_at: now, created_at: now, updated_at: now,
    }]);
  },

  async down(qi) {
    for (const t of ['user_roles','menu_permissions','menus','role_permissions','roles','permissions']) {
      await qi.bulkDelete(T(t), null, {});
    }
    await qi.bulkDelete(T('users'), { email: 'admin@example.com' });
  },
};
