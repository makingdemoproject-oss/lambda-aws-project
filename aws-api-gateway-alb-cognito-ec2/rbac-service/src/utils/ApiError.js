class ApiError extends Error {
  constructor(statusCode, message, details = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
  static badRequest  (m='Bad request', d) { return new ApiError(400, m, d); }
  static unauthorized(m='Unauthorized', d) { return new ApiError(401, m, d); }
  static forbidden   (m='Forbidden', d) { return new ApiError(403, m, d); }
  static notFound    (m='Not found', d) { return new ApiError(404, m, d); }
  static conflict    (m='Conflict', d) { return new ApiError(409, m, d); }
}
module.exports = ApiError;
