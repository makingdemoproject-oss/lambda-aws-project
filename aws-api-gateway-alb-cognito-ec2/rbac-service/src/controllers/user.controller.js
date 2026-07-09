const asyncHandler = require('../utils/asyncHandler');
const R = require('../utils/ApiResponse');
const svc = require('../services/user.service');
const menuSvc = require('../services/menu.service');

exports.list      = asyncHandler(async (req, res) => R.ok(res, await svc.list(req.query)));
exports.get       = asyncHandler(async (req, res) => R.ok(res, await svc.getById(req.params.id)));
exports.setActive = asyncHandler(async (req, res) => R.ok(res, await svc.setActive(req.params.id, !!req.body.isActive), 'Updated'));
exports.updateRoles = asyncHandler(async (req, res) =>
  R.ok(res, await svc.updateRoles(req.params.id, req.body.roleIds, req.user.id), 'Roles updated'));
exports.myMenu = asyncHandler(async (req, res) => R.ok(res, await menuSvc.buildForUser(req.user)));
