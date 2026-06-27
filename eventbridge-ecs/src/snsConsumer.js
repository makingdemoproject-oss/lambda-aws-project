const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' }));
const TABLE  = process.env.EVENTS_TABLE;

// SNS subscription Lambda — SNS → this Lambda → DynamoDB
exports.handler = async (event) => {
  for (const record of event.Records) {
    let detail = {};
    let detailType = 'SNSEvent';
    try {
      const msg = JSON.parse(record.Sns.Message);
      detail = msg.detail || msg;
      detailType = msg['detail-type'] || record.Sns.Subject || 'SNSEvent';
    } catch { continue; }

    const item = {
      eventId:    randomUUID(),
      source:     'ec2.express',
      detailType,
      detail,
      receivedAt: new Date().toISOString(),
      target:     'SNS→Lambda',
      snsMessageId: record.Sns.MessageId,
    };

    await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
    console.log('SNS event stored:', item.eventId);
  }
  return { statusCode: 200 };
};
