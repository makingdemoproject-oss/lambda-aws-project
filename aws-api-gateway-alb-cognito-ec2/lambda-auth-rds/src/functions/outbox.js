// outbox.js — Outbox Pattern: routes /outbox/*
// Routes: POST /outbox/orders | GET /outbox/orders | GET /outbox/events
//         POST /outbox/process | GET /outbox/dynamodb

'use strict';
const { Pool } = require('pg');
const { DynamoDBClient, PutItemCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

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

const ok  = (body) => ({ statusCode: 200, headers: cors(), body: JSON.stringify(body) });
const err = (code, msg) => ({ statusCode: code, headers: cors(), body: JSON.stringify({ error: msg }) });
const cors = () => ({ 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });

// ── Ensure tables exist (idempotent) ────────────────────────────────────────
async function ensureTables(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id    TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      product_id  TEXT NOT NULL,
      quantity    INT  NOT NULL,
      amount      NUMERIC(10,2) NOT NULL,
      status      TEXT DEFAULT 'CREATED',
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS outbox_events (
      id            SERIAL PRIMARY KEY,
      event_id      UUID DEFAULT gen_random_uuid(),
      event_type    TEXT NOT NULL,
      aggregate_id  TEXT NOT NULL,
      payload       JSONB NOT NULL,
      status        TEXT DEFAULT 'PENDING',
      retry_count   INT  DEFAULT 0,
      created_at    TIMESTAMPTZ DEFAULT NOW(),
      processed_at  TIMESTAMPTZ
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_events(status) WHERE status = 'PENDING'
  `);
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /outbox/orders — PostgreSQL TRANSACTION: INSERT orders + INSERT outbox_event
// ══════════════════════════════════════════════════════════════════════════════
async function createOrder(body) {
  const { orderId, customerId, productId, quantity, amount } = JSON.parse(body || '{}');
  if (!orderId || !customerId || !productId || !quantity || !amount)
    return err(400, 'orderId, customerId, productId, quantity, amount required');

  const client = await pool.connect();
  try {
    await ensureTables(client);

    // Single ACID transaction: INSERT orders + INSERT outbox_event
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO orders (order_id, customer_id, product_id, quantity, amount)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (order_id) DO NOTHING`,
      [orderId, customerId, productId, quantity, amount]
    );

    const payload = {
      PK: `ORDER#${orderId}`,
      SK: `CUSTOMER#${customerId}`,
      orderId, customerId, productId,
      quantity, amount,
      status: 'CREATED',
      createdAt: new Date().toISOString(),
    };

    const eventResult = await client.query(
      `INSERT INTO outbox_events (event_type, aggregate_id, payload)
       VALUES ($1, $2, $3)
       RETURNING id, event_id, status`,
      ['ORDER_CREATED', orderId, JSON.stringify(payload)]
    );

    await client.query('COMMIT');

    return ok({
      success: true,
      message: 'Order + outbox_event inserted in single ATOMIC transaction',
      orderId,
      outboxEvent: eventResult.rows[0],
      nextStep: 'outbox-worker runs every 1 min → DynamoDB sync',
    });
  } catch (e) {
    await client.query('ROLLBACK');
    return err(500, `Transaction failed (ROLLBACK): ${e.message}`);
  } finally {
    client.release();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /outbox/orders — Read orders table
// ══════════════════════════════════════════════════════════════════════════════
async function getOrders() {
  const client = await pool.connect();
  try {
    await ensureTables(client);
    const result = await client.query(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT 20'
    );
    return ok({ orders: result.rows, count: result.rowCount });
  } catch (e) {
    return err(500, e.message);
  } finally {
    client.release();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /outbox/events — Read outbox_events table (PENDING + DONE)
// ══════════════════════════════════════════════════════════════════════════════
async function getOutboxEvents() {
  const client = await pool.connect();
  try {
    await ensureTables(client);
    const result = await client.query(
      `SELECT id, event_id, event_type, aggregate_id, status, retry_count, created_at, processed_at
       FROM outbox_events ORDER BY created_at DESC LIMIT 30`
    );
    const pending = result.rows.filter(r => r.status === 'PENDING').length;
    const done    = result.rows.filter(r => r.status === 'DONE').length;
    return ok({ events: result.rows, total: result.rowCount, pending, done });
  } catch (e) {
    return err(500, e.message);
  } finally {
    client.release();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /outbox/process — Manually trigger outbox worker (same as EventBridge)
// ══════════════════════════════════════════════════════════════════════════════
async function processOutbox() {
  const client = await pool.connect();
  const results = [];
  try {
    // Fetch up to 10 PENDING events
    const { rows } = await client.query(
      `SELECT * FROM outbox_events WHERE status = 'PENDING' AND retry_count < 5
       ORDER BY created_at ASC LIMIT 10 FOR UPDATE SKIP LOCKED`
    );

    for (const event of rows) {
      try {
        const payload = typeof event.payload === 'string'
          ? JSON.parse(event.payload)
          : event.payload;

        // DynamoDB PUT (idempotent — same key overwrites safely)
        await dynamo.send(new PutItemCommand({
          TableName: DYNAMO_TABLE,
          Item: marshall({
            ...payload,
            eventId:      event.event_id,
            eventType:    event.event_type,
            syncedAt:     new Date().toISOString(),
          }),
        }));

        // Mark DONE in PostgreSQL
        await client.query(
          `UPDATE outbox_events SET status = 'DONE', processed_at = NOW() WHERE id = $1`,
          [event.id]
        );
        results.push({ id: event.id, aggregateId: event.aggregate_id, result: 'DONE' });
      } catch (dynErr) {
        // DynamoDB fail → increment retry, stay PENDING
        await client.query(
          `UPDATE outbox_events SET retry_count = retry_count + 1 WHERE id = $1`,
          [event.id]
        );
        results.push({ id: event.id, aggregateId: event.aggregate_id, result: 'RETRY', error: dynErr.message });
      }
    }

    return ok({
      processed: results.length,
      results,
      message: results.length === 0 ? 'No PENDING events' : `Processed ${results.length} events`,
    });
  } catch (e) {
    return err(500, e.message);
  } finally {
    client.release();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// GET /outbox/dynamodb — Read DynamoDB orders-cache
// ══════════════════════════════════════════════════════════════════════════════
async function getDynamoOrders() {
  try {
    const result = await dynamo.send(new ScanCommand({
      TableName: DYNAMO_TABLE,
      Limit: 20,
    }));
    const items = (result.Items || []).map(i => unmarshall(i));
    return ok({ items, count: items.length, tableName: DYNAMO_TABLE });
  } catch (e) {
    return err(500, e.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Main handler — routes by method + path
// ══════════════════════════════════════════════════════════════════════════════
exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path   = event.rawPath || event.path || '/';

  if (method === 'OPTIONS') return { statusCode: 200, headers: cors(), body: '' };

  if (method === 'POST' && path.endsWith('/outbox/orders'))  return createOrder(event.body);
  if (method === 'GET'  && path.endsWith('/outbox/orders'))  return getOrders();
  if (method === 'GET'  && path.endsWith('/outbox/events'))  return getOutboxEvents();
  if (method === 'POST' && path.endsWith('/outbox/process')) return processOutbox();
  if (method === 'GET'  && path.endsWith('/outbox/dynamodb'))return getDynamoOrders();

  return err(404, `Route not found: ${method} ${path}`);
};
