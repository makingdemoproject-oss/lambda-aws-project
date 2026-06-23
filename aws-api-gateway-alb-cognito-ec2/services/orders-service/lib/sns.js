const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const client = new SNSClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const TOPIC_ARN = process.env.SNS_TOPIC_ARN || '';

async function publishToSNS(eventType, data) {
  if (!TOPIC_ARN) {
    console.log(`[SNS MOCK] ${eventType}:`, JSON.stringify(data));
    return { messageId: 'mock-' + Date.now() };
  }
  const resp = await client.send(new PublishCommand({
    TopicArn: TOPIC_ARN,
    Message: JSON.stringify({ eventType, data, timestamp: new Date().toISOString() }),
    Subject: eventType,
  }));
  return resp;
}

module.exports = { publishToSNS };
