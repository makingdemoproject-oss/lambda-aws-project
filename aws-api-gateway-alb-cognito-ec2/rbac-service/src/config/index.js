require('dotenv').config();

module.exports = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),

  db: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'rbac_app',
    password: process.env.DB_PASSWORD || 'rbac_pw',
    database: process.env.DB_NAME || 'app',
    schema: process.env.DB_SCHEMA || 'rbac',
    ssl: process.env.DB_SSL === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },

  redis: { url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  bcrypt: { saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12 },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 300,
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  },

  log: { level: process.env.LOG_LEVEL || 'info' },
});
