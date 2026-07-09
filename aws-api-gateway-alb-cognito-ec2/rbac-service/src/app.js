const express = require('express');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const config = require('./config');
const logger = require('./utils/logger');
const security = require('./middlewares/security');
const { globalLimiter } = require('./middlewares/rateLimit');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const passport = require('./middlewares/passport');
const routes = require('./routes');

const app = express();
app.set('trust proxy', 1);

app.use(security.helmet);
app.use(security.cors);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(security.hpp);
app.use(compression());
app.use(passport.initialize());

if (config.env !== 'test') {
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev', {
    stream: { write: (m) => logger.info(m.trim()) },
  }));
}

app.use(config.apiPrefix, globalLimiter, routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
