const Redis = require('ioredis');
const config = require('../config');
const logger = require('./logger');

const redis = new Redis(config.redis.url, { maxRetriesPerRequest: null, enableReadyCheck: true });
redis.on('error', (e) => logger.warn(`[redis] ${e.message}`));
redis.on('connect', () => logger.info('[redis] connected'));

module.exports = redis;
