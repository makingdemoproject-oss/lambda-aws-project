/**
 * Sequelize loader for the rbac-service.
 *
 * All tables live in the `rbac` schema of the shared Postgres instance.
 * `define.schema` sets the default for every model; the search_path is
 * also forced on each new pooled connection so ad-hoc queries are
 * scoped to the rbac schema too.
 */
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  config.db.database,
  config.db.username,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: config.db.logging ? (m) => logger.debug(m) : false,
    define: { underscored: true, timestamps: true, schema: config.db.schema },
    pool: { max: 20, min: 2, acquire: 30000, idle: 10000 },
    dialectOptions: config.db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  },
);

sequelize.afterConnect(async (conn) => {
  await conn.query(`SET search_path TO "${config.db.schema}", public;`);
});

const db = { sequelize, Sequelize };
fs.readdirSync(__dirname)
  .filter((f) => f.endsWith('.model.js'))
  .forEach((file) => {
    const m = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[m.name] = m;
  });
Object.values(db).forEach((m) => m?.associate?.(db));

module.exports = db;
