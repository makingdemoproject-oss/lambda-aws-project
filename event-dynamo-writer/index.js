const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

const client    = new DynamoDBClient({ region: process.env.REGION || 'ap-south-1' });
const TABLE     = process.env.TABLE_NAME || 'event-store-production';

const QUEUE_MAP = {
  'order-processing-queue-production': { topic: 'order-events-production' },
  'notification-queue-production':     { topic: 'order-events-production' },
  'analytics-queue-production':        { topic: 'order-events-production' },
  // legacy queues
  'notification-queue':  { topic: 'user-events'    },
  'audit-log-queue':     { topic: 'user-events'    },
  'order-process-queue': { topic: 'order-events'   },
  'inventory-queue':     { topic: 'order-events'   },
  'invoice-queue':       { topic: 'payment-events' },
  'wallet-queue':        { topic: 'payment-events' },
};

function getQueueInfo(eventSourceArn) {
  const queueName = eventSourceArn.split(':').pop();
  return { queueName, topic: (QUEUE_MAP[queueName] || {}).topic || 'unknown' };
}

exports.handler = async (event) => {
  const results = [];

  for (const record of event.Records) {
    let payload;
    try {
      payload = JSON.parse(record.body);
    } catch {
      payload = { raw: record.body };
    }

    const { queueName, topic }   = getQueueInfo(record.eventSourceARN);
    const eventType  = payload.eventType || payload.event || 'unknown';
    const userId     = payload.userId    || payload.user_id || 'N/A';
    const orderId    = payload.orderId   || 'N/A';
    const receivedAt = new Date().toISOString();
    const ttl        = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60); // 90 days

    // PK: eventType#user.registered  SK: 2026-06-22T16:00:00.000Z#messageId
    const item = {
      pk:          `eventType#${eventType}`,
      sk:          `${receivedAt}#${record.messageId}`,
      eventType,
      queueName,
      topicName:   topic,
      userId,
      orderId,
      payload,
      receivedAt,
      messageId:   record.messageId,
      ttl,
    };

    await client.send(new PutItemCommand({
      TableName: TABLE,
      Item:      marshall(item, { removeUndefinedValues: true }),
    }));

    console.log(JSON.stringify({
      status:    'inserted',
      pk:        item.pk,
      sk:        item.sk,
      eventType,
      queueName,
      topicName: topic,
      userId,
      payload,
    }));

    results.push({ messageId: record.messageId, eventType, queueName });
  }

  return { statusCode: 200, processed: results.length, results };
};
