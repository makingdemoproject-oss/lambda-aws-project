const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

const client = new SQSClient({ region: process.env.AWS_REGION || 'ap-south-1' });

async function sendToSQS(queueName, message) {
  const QUEUE_URL = process.env[`SQS_${queueName.toUpperCase().replace(/-/g, '_')}_URL`] || '';
  if (!QUEUE_URL) {
    console.log(`[SQS MOCK] → ${queueName}:`, JSON.stringify(message));
    return { messageId: 'mock-' + Date.now() };
  }
  const cmd = new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(message),
    MessageAttributes: {
      service: { DataType: 'String', StringValue: 'products-service' },
    },
  });
  const resp = await client.send(cmd);
  console.log(`[SQS] Sent to ${queueName}: ${resp.MessageId}`);
  return resp;
}

async function receiveFromSQS(queueUrl, maxMessages = 5) {
  const cmd = new ReceiveMessageCommand({
    QueueUrl: queueUrl,
    MaxNumberOfMessages: maxMessages,
    WaitTimeSeconds: 5,
  });
  const resp = await client.send(cmd);
  return resp.Messages || [];
}

module.exports = { sendToSQS, receiveFromSQS };
