// outbox-worker.js — EventBridge triggered every 1 minute
// PENDING outbox_events → DynamoDB sync → mark DONE

'use strict';
const { Pool } = require('pg');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl:      { rejectUnauthorized: false },
  max: 2,
});

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const DYNAMO_TABLE = process.env.DYNAMO_TABLE || 'outbox-orders-cache';

exports.handler = async (event) => {
  console.log('outbox-worker triggered:', JSON.stringify(event));
  const client = await pool.connect();
  const summary = { processed: 0, failed: 0, skipped: 0 };

  try {
    // SELECT PENDING with pessimistic lock (SKIP LOCKED = no deadlock with other workers)
    const { rows } = await client.query(
      `SELECT * FROM outbox_events
       WHERE status = 'PENDING' AND retry_count < 5
       ORDER BY created_at ASC LIMIT 20
       FOR UPDATE SKIP LOCKED`
    );

    console.log(`Found ${rows.length} PENDING events`);

    for (const event of rows) {
      const payload = typeof event.payload === 'string'
        ? JSON.parse(event.payload)
        : event.payload;

      try {
        // DynamoDB idempotent write — same PK/SK overwrites safely
        await dynamo.send(new PutItemCommand({
          TableName: DYNAMO_TABLE,
          Item: marshall({
            ...payload,
            eventId:   event.event_id,
            eventType: event.event_type,
            syncedAt:  new Date().toISOString(),
          }),
        }));

        // Mark DONE
        await client.query(
          `UPDATE outbox_events
           SET status = 'DONE', processed_at = NOW()
           WHERE id = $1`,
          [event.id]
        );
        summary.processed++;
        console.log(`Event ${event.id} (${event.aggregate_id}) → DONE`);
      } catch (dynErr) {
        // DynamoDB failed → keep PENDING, increment retry
        await client.query(
          `UPDATE outbox_events SET retry_count = retry_count + 1 WHERE id = $1`,
          [event.id]
        );
        summary.failed++;
        console.error(`Event ${event.id} DynamoDB error (retry ${event.retry_count + 1}):`, dynErr.message);
      }
    }

    // Clean up events that exceeded max retries
    const dead = await client.query(
      `UPDATE outbox_events SET status = 'DEAD'
       WHERE status = 'PENDING' AND retry_count >= 5
       RETURNING id`
    );
    summary.skipped = dead.rowCount;

    console.log('Summary:', summary);
    return summary;
  } catch (e) {
    console.error('outbox-worker fatal error:', e);
    throw e;
  } finally {
    client.release();
  }
};
