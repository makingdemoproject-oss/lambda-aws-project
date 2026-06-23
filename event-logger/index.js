const { Client } = require('pg');

const DB_CONFIG = {
  host:     '13.207.251.13',
  port:     5432,
  database: 'rbacdb',
  user:     'lambdauser',
  password: 'Lambda@1234',
  ssl:      false,
  connectionTimeoutMillis: 10000,
};

// Queue ARN → readable name
const QUEUE_MAP = {
  'notification-queue':  { queueName: 'notification-queue',  topic: 'user-events'    },
  'audit-log-queue':     { queueName: 'audit-log-queue',     topic: 'user-events'    },
  'order-process-queue': { queueName: 'order-process-queue', topic: 'order-events'   },
  'inventory-queue':     { queueName: 'inventory-queue',     topic: 'order-events'   },
  'invoice-queue':       { queueName: 'invoice-queue',       topic: 'payment-events' },
  'wallet-queue':        { queueName: 'wallet-queue',        topic: 'payment-events' },
  'notification-queue-production': { queueName: 'notification-queue-production', topic: 'order-events-production' },
};

function getQueueInfo(eventSourceArn) {
  const queueName = eventSourceArn.split(':').pop();
  return QUEUE_MAP[queueName] || { queueName, topic: 'unknown' };
}

exports.handler = async (event) => {
  const client = new Client(DB_CONFIG);
  await client.connect();

  try {
    for (const record of event.Records) {
      let payload;
      try {
        payload = JSON.parse(record.body);
      } catch {
        payload = { raw: record.body };
      }

      const { queueName, topic } = getQueueInfo(record.eventSourceARN);
      const eventType = payload.eventType || payload.event || 'unknown';

      await client.query(
        `INSERT INTO event_logs (event_type, queue_name, topic_name, payload)
         VALUES ($1, $2, $3, $4)`,
        [eventType, queueName, topic, JSON.stringify(payload)]
      );

      console.log(JSON.stringify({
        eventType,
        queueName,
        topic,
        messageId: record.messageId,
        payload,
      }));
    }

    return { statusCode: 200, processed: event.Records.length };
  } finally {
    await client.end();
  }
};
