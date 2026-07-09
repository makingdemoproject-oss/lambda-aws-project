const Joi = require('joi');
const policy = require('../utils/passwordPolicy');
const uuid = Joi.string().uuid();

// Joi pre-check that enforces length/charset; the `.custom()` then runs the
// full policy module so messaging is consistent across endpoints.
const password = Joi.string()
  .min(policy.MIN).max(policy.MAX)
  .custom((v, h) => {
    const { ok, errors } = policy.check(v);
    return ok ? v : h.error('any.invalid', { message: errors.join('; ') });
  })
  .messages({ 'any.invalid': '{#message}' });

module.exports = {
  authRegister: { body: Joi.object({
    firstName: Joi.string().min(1).max(60).required(),
    lastName: Joi.string().max(60).optional(),
    email: Joi.string().email().required(),
    phone: Joi.string().max(20).optional(),
    password: password.required(),
  })},
  authLogin:   { body: Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() }) },
  authRefresh: { body: Joi.object({ refreshToken: Joi.string().required() }) },
  authVerify:  { body: Joi.object({ token: Joi.string().min(10).optional() }) },
  authForgot:  { body: Joi.object({ email: Joi.string().email().required() }) },
  authReset:   { body: Joi.object({
    token: Joi.string().length(64).hex().required(),
    password: password.required(),
  })},
  authChangePassword: { body: Joi.object({
    currentPassword: Joi.string().min(1).required(),
    newPassword: password.required(),
  })},
  authVerifyEmail: { body: Joi.object({
    token: Joi.string().length(64).hex().required(),
  })},
  authResendVerification: { body: Joi.object({
    email: Joi.string().email().required(),
  })},

  roleCreate: { body: Joi.object({
    key: Joi.string().pattern(/^[a-z0-9_]+$/).min(2).max(64).required(),
    name: Joi.string().min(1).max(120).required(),
    description: Joi.string().max(255).allow('', null).optional(),
    permissionIds: Joi.array().items(uuid).default([]),
  })},
  roleUpdate: {
    params: Joi.object({ id: uuid.required() }),
    body: Joi.object({
      name: Joi.string().min(1).max(120).optional(),
      description: Joi.string().max(255).allow('', null).optional(),
      permissionIds: Joi.array().items(uuid).optional(),
    }).min(1),
  },
  roleId: { params: Joi.object({ id: uuid.required() }) },

  userList: { query: Joi.object({
    q: Joi.string().max(64).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  })},
  userRoles: {
    params: Joi.object({ id: uuid.required() }),
    body: Joi.object({ roleIds: Joi.array().items(uuid).min(0).required() }),
  },

  menuId: { params: Joi.object({ id: uuid.required() }) },
  menuCreate: { body: Joi.object({
    parentId: uuid.allow(null).optional(),
    key:   Joi.string().pattern(/^[a-z0-9_-]+$/).min(2).max(96).required(),
    label: Joi.string().min(1).max(160).required(),
    icon:  Joi.string().max(64).allow('', null).optional(),
    path:  Joi.string().max(255).allow('', null).optional(),
    permissionKey: Joi.string().max(96).allow('', null).optional(),
    sortOrder: Joi.number().integer().min(0).default(0),
    isActive: Joi.boolean().default(true),
    roleIds: Joi.array().items(uuid).default([]),
  })},
  menuUpdate: {
    params: Joi.object({ id: uuid.required() }),
    body: Joi.object({
      parentId: uuid.allow(null).optional(),
      label: Joi.string().min(1).max(160).optional(),
      icon:  Joi.string().max(64).allow('', null).optional(),
      path:  Joi.string().max(255).allow('', null).optional(),
      permissionKey: Joi.string().max(96).allow('', null).optional(),
      sortOrder: Joi.number().integer().min(0).optional(),
      isActive: Joi.boolean().optional(),
      roleIds: Joi.array().items(uuid).optional(),
    }).min(1),
  },
};
