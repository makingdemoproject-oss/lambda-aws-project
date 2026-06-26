const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const client = new SQSClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const QUEUE_URL = process.env.SQS_QUEUE_URL || '';

async function sendToSQS(queueName, data) {
  if (!QUEUE_URL) {
    console.log(`[SQS MOCK] ${queueName}:`, JSON.stringify(data));
    return { messageId: 'mock-' + Date.now() };
  }
  const cmd = new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify({ queueName, data, timestamp: new Date().toISOString() }),
  });
  const resp = await client.send(cmd);
  return resp;
}

module.exports = { sendToSQS };
