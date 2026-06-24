const r = require('express').Router();
const v = require('../validators');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');
const c = require('../controllers/user.controller');

r.use(authenticate);

// any authenticated user can fetch their own menu
r.get  ('/me/menu',     c.myMenu);

// admin endpoints
r.get  ('/',            validate(v.userList),  rbac.require('user:read'),   c.list);
r.get  ('/:id',                                rbac.require('user:read'),   c.get);
r.patch('/:id/active',                         rbac.require('user:manage'), c.setActive);
r.put  ('/:id/roles',   validate(v.userRoles), rbac.require('user:manage'), c.updateRoles);

module.exports = r;
