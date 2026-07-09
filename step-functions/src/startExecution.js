const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');
const { randomUUID } = require('crypto');

const sfn = new SFNClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN;

exports.handler = async (event) => {
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || event);
  const { target = 'ALL', product = 'Laptop Pro', amount = '25000', eventType = 'OrderCreated' } = body;

  const input = {
    executionId: randomUUID(),
    target,
    product,
    amount,
    eventType,
    orderId: `ORD-${Date.now()}`,
    source: 'step-functions-demo',
  };

  const res = await sfn.send(new StartExecutionCommand({
    stateMachineArn: STATE_MACHINE_ARN,
    name: `exec-${target}-${Date.now()}`,
    input: JSON.stringify(input),
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      executionArn: res.executionArn,
      startDate: res.startDate,
      target,
      input,
    }),
  };
};
