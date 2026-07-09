/**
 * Lambda 1 — S3 Trigger Handler (Outbox Pattern)
 *
 * S3 file upload होती है → यह Lambda trigger होती है
 * PostgreSQL में file_events + outbox दोनों एक SINGLE TRANSACTION में insert होते हैं
 * अगर commit हो गया → event कभी नहीं खोएगा (outbox में safe है)
 * अगर Lambda crash भी हो जाए → S3 retry करेगा, ON CONFLICT DO NOTHING से duplicate safe है
 */

const { getPool } = require('../shared/db');

exports.handler = async (event) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    for (const record of event.Records) {
      const bucket  = record.s3.bucket.name;
      const fileKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      const fileSize = record.s3.object.size;
      // S3 eTag → idempotency key (same event दो बार आए तो duplicate नहीं होगा)
      const eventId  = record.s3.object.eTag?.replace(/"/g, '') || `${bucket}-${fileKey}`;

      console.log(`Processing S3 event: bucket=${bucket} key=${fileKey} eventId=${eventId}`);

      await client.query('BEGIN');

      // Step 1: business data insert
      await client.query(
        `INSERT INTO file_events (event_id, bucket, file_key, file_size, status)
         VALUES ($1, $2, $3, $4, 'uploaded')
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId, bucket, fileKey, fileSize]
      );

      // Step 2: outbox event insert — यही magic है
      // यह row DynamoDB को बाद में update करने का "ticket" है
      await client.query(
        `INSERT INTO outbox (event_id, event_type, payload, status)
         VALUES ($1, $2, $3, 'PENDING')
         ON CONFLICT (event_id) DO NOTHING`,
        [
          eventId,
          'FILE_UPLOADED',
          JSON.stringify({ eventId, bucket, fileKey, fileSize, uploadedAt: new Date().toISOString() })
        ]
      );

      await client.query('COMMIT');
      console.log(`✅ Transaction committed — event ${eventId} saved to outbox`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction failed, rolled back:', err.message);
    throw err; // Lambda retry के लिए re-throw
  } finally {
    client.release();
  }
};
