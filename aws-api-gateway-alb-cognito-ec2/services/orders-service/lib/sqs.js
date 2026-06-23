const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const client = new SQSClient({ region: process.env.AWS_REGION || 'ap-south-1' });

async function sendToSQS(queueName, message) {
  const QUEUE_URL = process.env[`SQS_${queueName.toUpperCase().replace(/-/g,'_')}_URL`] || '';
  if (!QUEUE_URL) {
    console.log(`[SQS MOCK] → ${queueName}:`, JSON.stringify(message));
    return { messageId: 'mock-' + Date.now() };
  }
  return client.send(new SendMessageCommand({ QueueUrl: QUEUE_URL, MessageBody: JSON.stringify(message) }));
}

module.exports = { sendToSQS };
