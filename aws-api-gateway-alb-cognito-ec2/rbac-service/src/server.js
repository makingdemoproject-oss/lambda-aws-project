// MUST be the very first require — sets up OpenTelemetry monkey-patching
// before express / sequelize / pg are loaded by anything else.
require('./tracing');

const http = require('http');
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const db = require('./models');

const start = async () => {
  try { await db.sequelize.authenticate(); logger.info(`[db] connected (schema=${config.db.schema})`); }
  catch (e) { logger.warn(`[db] connect failed: ${e.message}`); }

  const server = http.createServer(app);
  server.listen(config.port, () => {
    logger.info(`rbac-service listening on :${config.port}${config.apiPrefix}`);
    if (process.send) process.send('ready');
  });

  const shutdown = (sig) => {
    logger.info(`${sig} — draining`);
    server.close(async () => {
      try { await db.sequelize.close(); } catch { /* ignore */ }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 25_000).unref();
  };
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (r) => logger.error('Unhandled rejection', r));
  process.on('uncaughtException',  (e) => logger.error('Uncaught exception', e));
};

start();
