const helmet = require('helmet');
const hpp = require('hpp');
const cors = require('cors');
const config = require('../config');

module.exports = {
  helmet: helmet(),
  hpp: hpp(),
  cors: cors({
    origin: (origin, cb) => {
      if (!origin || config.corsOrigin.includes(origin) || config.corsOrigin.includes('*')) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
  }),
};
