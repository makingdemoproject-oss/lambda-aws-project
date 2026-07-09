const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' }));
const TABLE = process.env.TABLE_NAME;

exports.handler = async (event) => {
  const result = Array.isArray(event) ? event[event.length - 1] : event;
  const item = {
    executionId: result.executionId || randomUUID(),
    target: `SF-${result.target || 'ALL'}`,
    step: 'SaveResult',
    orderId: result.orderId,
    product: result.product,
    amount: result.amount,
    eventType: result.eventType,
    savedAt: new Date().toISOString(),
    status: 'COMPLETED',
    rawResult: JSON.stringify(event),
  };
  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
  return { success: true, executionId: item.executionId, savedAt: item.savedAt };
};
