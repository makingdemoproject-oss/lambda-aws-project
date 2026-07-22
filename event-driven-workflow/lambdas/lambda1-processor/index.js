const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { Client } = require('pg');

const sns = new SNSClient({ region: 'ap-south-1' });

function getDBClient() {
  return new Client({
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE || 'rbacdb',
    user: process.env.PG_USER || 'lambdauser',
    password: process.env.PG_PASSWORD,
    port: 5432,
    connectionTimeoutMillis: 10000,
  });
}

exports.handler = async (event) => {
  console.log('Lambda1 triggered. Records:', event.Records.length);

  const db = getDBClient();
  try {
    await db.connect();

    for (const record of event.Records) {
      let body;
      try {
        body = JSON.parse(record.body);
      } catch {
        console.error('Invalid JSON in SQS message:', record.body);
        continue;
      }

      // EventBridge wraps event in detail field
      const eventData = body.detail || body;
      const eventType = body['detail-type'] || eventData.eventType || 'unknown';
      const source = body.source || 'manual';

      console.log('Processing event:', eventType, 'from source:', source);

      // 1. Store event in PostgreSQL
      const insertResult = await db.query(
        `INSERT INTO events (event_type, source, payload, status, created_at)
         VALUES ($1, $2, $3, 'processing', NOW())
         RETURNING id`,
        [eventType, source, JSON.stringify(eventData)]
      );
      const eventId = insertResult.rows[0].id;

      // 2. Publish to SNS for fan-out
      const snsMessage = {
        eventId,
        eventType,
        source,
        payload: eventData,
        processedAt: new Date().toISOString(),
        lambdaRequestId: record.messageId,
      };

      await sns.send(new PublishCommand({
        TopicArn: process.env.SNS_TOPIC_ARN,
        Message: JSON.stringify(snsMessage),
        Subject: `Event: ${eventType}`,
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: eventType,
          },
          source: {
            DataType: 'String',
            StringValue: source,
          },
        },
      }));

      console.log('Published to SNS, eventId:', eventId);

      // 3. Update event status to published
      await db.query(
        `UPDATE events SET status = 'published', updated_at = NOW() WHERE id = $1`,
        [eventId]
      );
    }
  } finally {
    await db.end();
  }

  return { statusCode: 200, body: 'Processed' };
};
