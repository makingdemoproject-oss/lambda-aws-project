const { randomUUID } = require('crypto');

exports.handler = async (event) => {
  const { orderId, product, amount, target, eventType } = event;
  if (!product || !amount) throw new Error('product and amount are required');
  return {
    ...event,
    executionId: event.executionId || randomUUID(),
    orderId: orderId || `ORD-${Date.now()}`,
    eventType: eventType || 'OrderCreated',
    validated: true,
    validatedAt: new Date().toISOString(),
  };
};
