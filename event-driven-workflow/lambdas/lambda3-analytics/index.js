const { Client } = require('pg');

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
  console.log('Lambda3 Analytics triggered. Records:', event.Records.length);

  const db = getDBClient();
  try {
    await db.connect();

    for (const record of event.Records) {
      // SNS sends message as record.Sns.Message
      let snsData, snsMessage;
      try {
        snsData = record.Sns || JSON.parse(record.body);
        snsMessage = JSON.parse(snsData.Message);
      } catch {
        console.error('Failed to parse SNS message:', record);
        continue;
      }

      const { eventId, eventType, source, processedAt } = snsMessage;

      // Upsert analytics — count by event type per day
      await db.query(
        `INSERT INTO analytics (event_type, source, event_date, count, last_event_id, last_processed_at)
         VALUES ($1, $2, CURRENT_DATE, 1, $3, $4)
         ON CONFLICT (event_type, source, event_date)
         DO UPDATE SET
           count = analytics.count + 1,
           last_event_id = EXCLUDED.last_event_id,
           last_processed_at = EXCLUDED.last_processed_at`,
        [eventType, source, eventId, processedAt || new Date().toISOString()]
      );

      // Store notification record
      await db.query(
        `INSERT INTO notifications (event_id, event_type, channel, status, created_at)
         VALUES ($1, $2, 'analytics', 'recorded', NOW())`,
        [eventId, eventType]
      );

      console.log('Analytics updated for event:', eventId, 'type:', eventType);
    }
  } finally {
    await db.end();
  }

  return { statusCode: 200 };
};
