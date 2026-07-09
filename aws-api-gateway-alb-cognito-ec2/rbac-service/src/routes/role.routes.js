const r = require('express').Router();
const v = require('../validators');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');
const c = require('../controllers/role.controller');

r.use(authenticate, rbac.require('role:manage'));

r.get   ('/permissions',                       c.permissions);
r.get   ('/',                                  c.list);
r.get   ('/:id',     validate(v.roleId),       c.get);
r.post  ('/',        validate(v.roleCreate),   c.create);
r.patch ('/:id',     validate(v.roleUpdate),   c.update);
r.delete('/:id',     validate(v.roleId),       c.remove);

module.exports = r;
