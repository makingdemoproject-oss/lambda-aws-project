const r = require('express').Router();
const v = require('../validators');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');
const c = require('../controllers/menu.controller');

r.use(authenticate, rbac.require('menu:manage'));

r.get   ('/',         c.list);
r.get   ('/:id',      validate(v.menuId),     c.get);
r.post  ('/',         validate(v.menuCreate), c.create);
r.patch ('/:id',      validate(v.menuUpdate), c.update);
r.delete('/:id',      validate(v.menuId),     c.remove);

module.exports = r;
