const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' }));
const TABLE  = process.env.EVENTS_TABLE;

// SQS target — EventBridge → SQS → this Lambda
exports.handler = async (event) => {
  for (const record of event.Records) {
    let detail = {};
    try { detail = JSON.parse(record.body); } catch { continue; }

    const item = {
      eventId:    randomUUID(),
      source:     detail.source     || 'ec2.express',
      detailType: detail['detail-type'] || 'SQSEvent',
      detail:     detail.detail     || detail,
      receivedAt: new Date().toISOString(),
      target:     'SQS→Lambda',
      sqsMsgId:   record.messageId,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    console.log('SQS event stored:', item.eventId);
  }
  return { batchItemFailures: [] };
};
