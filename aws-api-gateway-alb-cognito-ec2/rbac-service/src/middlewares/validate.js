const ApiError = require('../utils/ApiError');

module.exports = (schemas) => (req, _res, next) => {
  try {
    for (const k of ['body','query','params']) {
      if (!schemas[k]) continue;
      const { value, error } = schemas[k].validate(req[k], { abortEarly: false, stripUnknown: true, convert: true });
      if (error) {
        return next(ApiError.badRequest('Validation failed', error.details.map((d) => ({
          field: d.path.join('.'), message: d.message,
        }))));
      }
      req[k] = value;
    }
    next();
  } catch (err) { next(err); }
};
