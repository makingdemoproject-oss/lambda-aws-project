const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' }));
const TABLE = process.env.TABLE_NAME;

exports.handler = async (event) => {
  const item = {
    executionId: event.executionId || randomUUID(),
    target: 'SF-Lambda',
    step: 'ProcessWithLambda',
    orderId: event.orderId,
    product: event.product,
    amount: event.amount,
    eventType: event.eventType,
    processedAt: new Date().toISOString(),
    status: 'SUCCEEDED',
  };
  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
  return { ...event, lambdaDone: true, stepResult: 'Lambda processed order' };
};
