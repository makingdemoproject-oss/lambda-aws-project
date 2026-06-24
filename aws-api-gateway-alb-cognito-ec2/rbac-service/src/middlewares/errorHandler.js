const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const config = require('../config');

const errorHandler = (err, req, res, _next) => {
  let e = err;
  if (e?.name === 'SequelizeValidationError') {
    e = new ApiError(400, 'Validation failed', e.errors?.map((x) => ({ field: x.path, message: x.message })));
  } else if (e?.name === 'SequelizeUniqueConstraintError') {
    e = new ApiError(409, 'Resource already exists');
  } else if (e?.name === 'JsonWebTokenError') e = new ApiError(401, 'Invalid token');
  else if (e?.name === 'TokenExpiredError') e = new ApiError(401, 'Token expired');
  else if (!(e instanceof ApiError)) e = new ApiError(500, e.message || 'Internal server error', null, false);

  if (!e.isOperational || e.statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} → ${err.message}`, { stack: err.stack });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} → ${err.message}`);
  }

  res.status(e.statusCode).json({
    success: false, message: e.message, details: e.details || undefined,
    ...(config.env === 'development' && { stack: err.stack }),
  });
};

const notFoundHandler = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

module.exports = { errorHandler, notFoundHandler };
