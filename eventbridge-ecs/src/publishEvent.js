const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');

const eb   = new EventBridgeClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const BUS  = process.env.EVENT_BUS_NAME;
const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch { /* ignore */ }

  const detail = {
    eventType:  body.eventType  || 'OrderCreated',
    orderId:    body.orderId    || `ORD-${Date.now()}`,
    userId:     body.userId     || 'user-demo',
    amount:     body.amount     || Math.floor(Math.random() * 50000) + 500,
    product:    body.product    || 'Laptop Pro',
    source:     'ec2-express-server',
    timestamp:  new Date().toISOString(),
  };

  const result = await eb.send(new PutEventsCommand({
    Entries: [{
      Source:       'ec2.express',
      DetailType:   detail.eventType,
      Detail:       JSON.stringify(detail),
      EventBusName: BUS,
    }],
  }));

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({
      success:  true,
      message:  'Event published to EventBridge',
      detail,
      eventId:  result.Entries?.[0]?.EventId,
      targets:  ['Lambda (store)', 'SQS (queue)', 'SNS (notify)', 'ECS (process)'],
    }),
  };
};
