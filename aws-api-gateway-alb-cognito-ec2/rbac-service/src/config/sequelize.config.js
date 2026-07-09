require('dotenv').config();

const common = {
  username: process.env.DB_USERNAME || 'rbac_app',
  password: process.env.DB_PASSWORD || 'rbac_pw',
  database: process.env.DB_NAME || 'app',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  dialect: process.env.DB_DIALECT || 'postgres',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  define: { underscored: true, timestamps: true, schema: process.env.DB_SCHEMA || 'rbac' },
  pool: { max: 20, min: 2, acquire: 30000, idle: 10000 },
};

module.exports = {
  development: { ...common },
  test: { ...common, database: `${common.database}_test` },
  production: {
    ...common,
    logging: false,
    dialectOptions: process.env.DB_SSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
  },
};
