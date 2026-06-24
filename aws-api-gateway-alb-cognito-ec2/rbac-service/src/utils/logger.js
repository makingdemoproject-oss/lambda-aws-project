const winston = require('winston');
const config = require('../config');

const { combine, timestamp, errors, splat, json, colorize, printf } = winston.format;

const consoleFmt = combine(
  colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), splat(),
  printf(({ level, message, timestamp: ts, stack }) => `${ts} [rbac][${level}] ${stack || message}`),
);
const jsonFmt = combine(timestamp(), errors({ stack: true }), splat(), json());

module.exports = winston.createLogger({
  level: config.log.level,
  format: config.env === 'production' ? jsonFmt : consoleFmt,
  transports: [new winston.transports.Console()],
  exitOnError: false,
});
