/**
 * lambdaAuthorizer.js
 *
 * Express middleware that mirrors what AWS Lambda Authorizer does:
 *
 *  AWS Flow:
 *    Browser -> API Gateway -> Lambda Authorizer -> Lambda fn
 *
 *  Express equivalent:
 *    Browser -> Express -> lambdaAuthorizer middleware -> route handler
 *
 * In AWS, the Lambda Authorizer returns { isAuthorized, context }.
 * Here, we attach context to req.lambdaContext if authorized.
 */

const jwt = require('jsonwebtoken');

const lambdaAuthorizer = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // Step 1: Extract token (same as Lambda Authorizer extracting identitySource)
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized — no Authorization header' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // Step 2: Verify JWT (same as Lambda Authorizer calling jwt.verify)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Step 3: Attach context (same as Lambda Authorizer returning context)
    // In Lambda: event.requestContext.authorizer.lambda.userId
    // Here:      req.lambdaContext.userId
    req.lambdaContext = {
      userId: String(decoded.userId),
      email:  decoded.email,
    };

    next(); // isAuthorized: true -> proceed to route handler

  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized — invalid token' }); // isAuthorized: false
  }
};

module.exports = lambdaAuthorizer;
