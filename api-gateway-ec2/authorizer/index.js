const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'order-api-secret-2024';

exports.handler = async (event) => {
  console.log('Authorizer event:', JSON.stringify({ routeArn: event.routeArn, headers: event.headers }));

  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (!token) {
    console.log('No token provided — DENY');
    throw new Error('Unauthorized');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token valid for user:', decoded.userId);

    return {
      isAuthorized: true,
      context: {
        userId: decoded.userId,
        name:   decoded.name,
        role:   decoded.role,
      },
    };
  } catch (err) {
    console.log('Token invalid:', err.message);
    throw new Error('Unauthorized');
  }
};
