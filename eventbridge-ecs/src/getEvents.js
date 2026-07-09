const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' }));
const TABLE  = process.env.EVENTS_TABLE;
const cors   = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

exports.handler = async () => {
  const result = await dynamo.send(new ScanCommand({ TableName: TABLE }));
  const items  = (result.Items || []).sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ success: true, count: items.length, data: items }),
  };
};
