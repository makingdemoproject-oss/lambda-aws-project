/**
 * OpenAPI 3.0 spec for rbac-service.
 *
 * Served at:
 *   GET  /api/v1/docs            → Swagger UI
 *   GET  /api/v1/docs/openapi.json → raw spec (Postman, openapi-generator, etc.)
 *
 * The spec is hand-written here because:
 *   - We get the freedom to add detailed examples + auth descriptions
 *   - A code-first generator (joi-to-openapi, swagger-jsdoc) tends to drift
 *     out of sync; a single canonical file is easier to audit + diff.
 */
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'rbac-service',
    version: '1.0.0',
    description: `
Authentication, user, role, permission and menu management service for the
platform. The **only signer of JWTs**. Other services validate tokens by
calling \`POST /auth/verify\` here.

* Bearer access tokens: \`iss=rbac, aud=platform\`, 15-minute expiry.
* Refresh tokens: 7 days, stored as SHA-256 hashes, rotated on every refresh.
* Password reset tokens: 30 minutes, single-use.
    `,
    contact: { name: 'Platform team', email: 'support@ecommerce-rajesh.com' },
  },
  servers: [
    { url: 'http://localhost:4000/api/v1', description: 'Local dev' },
    { url: 'https://api.rajesh-project.com/api/v1', description: 'Production' },
  ],
  tags: [
    { name: 'Auth',  description: 'Login, refresh, password reset, token introspection' },
    { name: 'Users', description: 'User management + my menu (RBAC-pruned sidebar)' },
    { name: 'Roles', description: 'Role + permission management' },
    { name: 'Menus', description: 'Dynamic sidebar menu CRUD' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' }, message: { type: 'string' },
          data: {}, meta: { type: 'object', nullable: true },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          details: { type: 'array', items: { type: 'object' }, nullable: true },
        },
      },
      LoginRequest:  { type: 'object', required: ['email','password'], properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
      }},
      LoginResponse: { type: 'object', properties: {
        accessToken:  { type: 'string' },
        refreshToken: { type: 'string' },
        user: { $ref: '#/components/schemas/UserBundle' },
      }},
      UserBundle: { type: 'object', properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        firstName: { type: 'string' }, lastName: { type: 'string' },
        roleKeys: { type: 'array', items: { type: 'string' } },
        permissions: { type: 'array', items: { type: 'string' } },
      }},
      RegisterRequest: { type: 'object', required: ['firstName','email','password'], properties: {
        firstName: { type: 'string' }, lastName: { type: 'string' },
        email: { type: 'string', format: 'email' }, phone: { type: 'string' },
        password: { type: 'string', minLength: 10,
          description: 'Min 10 chars, must include upper/lower/digit/symbol; cannot contain email handle or common passwords' },
      }},
      ForgotRequest: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } },
      ResetRequest:  { type: 'object', required: ['token','password'], properties: {
        token: { type: 'string', minLength: 64, maxLength: 64 },
        password: { type: 'string' },
      }},
      ChangePasswordRequest: { type: 'object', required: ['currentPassword','newPassword'], properties: {
        currentPassword: { type: 'string' }, newPassword: { type: 'string' },
      }},
      VerifyRequest:  { type: 'object', properties: { token: { type: 'string' } } },
    },
  },
  security: [],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Create a new account',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          409: { description: 'Email already in use' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Sign in',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: {
          200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } } },
          401: { description: 'Invalid credentials' },
          429: { description: 'Too many failed attempts (rate limited)' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'], summary: 'Rotate refresh token',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
        responses: { 200: { description: 'OK' }, 401: { description: 'Invalid / revoked refresh token' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'], summary: 'Request a password-reset link',
        description: 'Always returns 200 to avoid leaking whether the email is registered. The email is sent via the RabbitMQ email.send queue.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotRequest' } } } },
        responses: { 200: { description: 'Generic success' }, 429: { description: 'Rate limited' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'], summary: 'Consume a reset token + set new password',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetRequest' } } } },
        responses: { 200: { description: 'Password reset' }, 400: { description: 'Invalid or expired token' } },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'], summary: 'Change password (authenticated)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } } } },
        responses: { 200: { description: 'Changed — all sessions revoked' }, 401: { description: 'Current password incorrect' } },
      },
    },
    '/auth/verify': {
      post: {
        tags: ['Auth'],
        summary: 'Token introspection (called by peer services)',
        description: 'Validates the JWT and returns the user bundle + effective permissions. Cached on the caller side for 60s.',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyRequest' } } } },
        responses: {
          200: { description: 'Verified', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserBundle' } } } },
          401: { description: 'Invalid / expired token' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'], security: [{ bearerAuth: [] }], summary: 'Get the current user',
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserBundle' } } } } },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'], security: [{ bearerAuth: [] }], summary: 'Revoke refresh token (or all)',
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/users/me/menu': {
      get: {
        tags: ['Users'], security: [{ bearerAuth: [] }],
        summary: 'Get the navigation tree pruned to current permissions',
        responses: { 200: { description: 'Tree of menu nodes' } },
      },
    },
    '/users': {
      get: {
        tags: ['Users'], security: [{ bearerAuth: [] }], summary: 'List users (admin)',
        parameters: [
          { in: 'query', name: 'q',      schema: { type: 'string' } },
          { in: 'query', name: 'limit',  schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { in: 'query', name: 'offset', schema: { type: 'integer', minimum: 0 } },
        ],
        responses: { 200: { description: 'OK' }, 403: { description: 'Missing user:read' } },
      },
    },
    '/users/{id}/active': {
      patch: {
        tags: ['Users'], security: [{ bearerAuth: [] }], summary: 'Enable / disable a user',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['isActive'], properties: { isActive: { type: 'boolean' } } } } } },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/users/{id}/roles': {
      put: {
        tags: ['Users'], security: [{ bearerAuth: [] }], summary: 'Replace a user\'s role set',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['roleIds'], properties: { roleIds: { type: 'array', items: { type: 'string', format: 'uuid' } } } } } } },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/roles': {
      get:  { tags: ['Roles'], security: [{ bearerAuth: [] }], summary: 'List roles', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Roles'], security: [{ bearerAuth: [] }], summary: 'Create role', responses: { 201: { description: 'Created' } } },
    },
    '/roles/{id}': {
      get:    { tags: ['Roles'], security: [{ bearerAuth: [] }], summary: 'Get role',    responses: { 200: { description: 'OK' } } },
      patch:  { tags: ['Roles'], security: [{ bearerAuth: [] }], summary: 'Update role (non-system)', responses: { 200: { description: 'OK' } } },
      delete: { tags: ['Roles'], security: [{ bearerAuth: [] }], summary: 'Delete role (non-system)', responses: { 200: { description: 'OK' } } },
    },
    '/roles/permissions': {
      get: { tags: ['Roles'], security: [{ bearerAuth: [] }], summary: 'Read-only permission catalogue', responses: { 200: { description: 'OK' } } },
    },
    '/menus': {
      get:  { tags: ['Menus'], security: [{ bearerAuth: [] }], summary: 'List menus (tree + flat)', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Menus'], security: [{ bearerAuth: [] }], summary: 'Create menu',              responses: { 201: { description: 'Created' } } },
    },
    '/menus/{id}': {
      get:    { tags: ['Menus'], security: [{ bearerAuth: [] }], summary: 'Get menu',    responses: { 200: { description: 'OK' } } },
      patch:  { tags: ['Menus'], security: [{ bearerAuth: [] }], summary: 'Update menu', responses: { 200: { description: 'OK' } } },
      delete: { tags: ['Menus'], security: [{ bearerAuth: [] }], summary: 'Delete menu', responses: { 200: { description: 'OK' } } },
    },
  },
};
