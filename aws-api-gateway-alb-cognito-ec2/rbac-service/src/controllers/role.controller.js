const asyncHandler = require('../utils/asyncHandler');
const R = require('../utils/ApiResponse');
const svc = require('../services/role.service');

exports.list        = asyncHandler(async (req, res)  => R.ok(res, await svc.list(req.query)));
exports.permissions = asyncHandler(async (_req, res) => R.ok(res, await svc.listPermissions()));
exports.get         = asyncHandler(async (req, res)  => R.ok(res, await svc.getById(req.params.id)));
exports.create      = asyncHandler(async (req, res)  => R.created(res, await svc.create(req.body), 'Role created'));
exports.update      = asyncHandler(async (req, res)  => R.ok(res, await svc.update(req.params.id, req.body), 'Role updated'));
exports.remove      = asyncHandler(async (req, res)  => { await svc.remove(req.params.id); return R.ok(res, null, 'Deleted'); });
