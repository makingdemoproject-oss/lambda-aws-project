const { verify } = require('../shared/jwt');

// HTTP API Lambda Authorizer — simple response format
exports.handler = async (event) => {
  // HTTP API passes identitySource as array — take first element
  const raw = event.identitySource;
  const authHeader = Array.isArray(raw) ? raw[0] : raw;
  if (!authHeader) return { isAuthorized: false };

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  try {
    const decoded = verify(token);
    return {
      isAuthorized: true,
      context: {
        userId: String(decoded.userId),
        email:  decoded.email,
      },
    };
  } catch {
    return { isAuthorized: false };
  }
};
