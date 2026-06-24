/**
 * Index router — wires per-feature route modules + Swagger UI.
 *
 *   /docs                   Swagger UI (interactive)
 *   /docs/openapi.json      raw OpenAPI 3.0 spec
 *   /auth/*    → auth.routes.js
 *   /users/*   → user.routes.js
 *   /roles/*   → role.routes.js
 *   /menus/*   → menu.routes.js
 */
const r = require('express').Router();
const swaggerUi = require('swagger-ui-express');
const openapi = require('../openapi');

r.get('/health', (_q, s) => s.json({ status: 'ok', service: 'rbac', uptime: process.uptime() }));
r.get('/ready',  (_q, s) => s.json({ status: 'ready' }));

r.get('/docs/openapi.json', (_q, res) => res.json(openapi));
r.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'rbac-service · API docs',
  customCss: '.topbar { display: none } .swagger-ui .info { margin: 20px 0 }',
}));

r.use('/auth',  require('./auth.routes'));
r.use('/users', require('./user.routes'));
r.use('/roles', require('./role.routes'));
r.use('/menus', require('./menu.routes'));

module.exports = r;
