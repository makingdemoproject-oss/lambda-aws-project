const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' }));
const TABLE  = process.env.EVENTS_TABLE;

// EventBridge target — receives every event routed to this Lambda
exports.handler = async (event) => {
  console.log('EventBridge event received:', JSON.stringify(event));

  const item = {
    eventId:    randomUUID(),
    source:     event.source     || 'unknown',
    detailType: event['detail-type'] || 'unknown',
    detail:     event.detail     || {},
    account:    event.account,
    region:     event.region,
    time:       event.time || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    target:     'Lambda',
  };

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
  console.log('Stored to DynamoDB:', item.eventId);
  return { statusCode: 200 };
};
