const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const TOPIC_ARN = 'arn:aws:sns:ap-south-1:527055790362:order-events-production';
const client    = new SNSClient({ region: 'ap-south-1' });

const publish = async (eventType, payload) => {
  try {
    await client.send(new PublishCommand({
      TopicArn: TOPIC_ARN,
      Message: JSON.stringify({ eventType, ...payload, timestamp: new Date().toISOString() }),
      MessageAttributes: {
        eventType: { DataType: 'String', StringValue: eventType },
      },
    }));
  } catch (e) {
    console.error('[SNS] publish failed:', e.message);
  }
};

module.exports = { publish };
