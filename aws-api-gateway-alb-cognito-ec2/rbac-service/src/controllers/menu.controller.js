const asyncHandler = require('../utils/asyncHandler');
const R = require('../utils/ApiResponse');
const svc = require('../services/menu.service');

exports.list   = asyncHandler(async (_req, res) => R.ok(res, await svc.list()));
exports.get    = asyncHandler(async (req, res)  => R.ok(res, await svc.getById(req.params.id)));
exports.create = asyncHandler(async (req, res)  => R.created(res, await svc.create(req.body), 'Menu created'));
exports.update = asyncHandler(async (req, res)  => R.ok(res, await svc.update(req.params.id, req.body), 'Menu updated'));
exports.remove = asyncHandler(async (req, res)  => { await svc.remove(req.params.id); return R.ok(res, null, 'Menu deleted'); });
