const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' }));
const TABLE = process.env.UPLOADS_TABLE;

exports.handler = async (event) => {
  const results = [];

  for (const sqsRecord of event.Records) {
    let s3Event;
    try {
      s3Event = JSON.parse(sqsRecord.body);
    } catch {
      console.error('Failed to parse SQS body:', sqsRecord.body);
      continue;
    }

    // S3 test event (sent on bucket creation) — skip
    if (s3Event.Event === 's3:TestEvent') continue;

    for (const s3Record of (s3Event.Records || [])) {
      if (!s3Record.s3) continue;

      const bucket   = s3Record.s3.bucket.name;
      const key      = decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, ' '));
      const fileSize = s3Record.s3.object.size;
      const eTag     = s3Record.s3.object.eTag || '';
      const fileName = key.split('/').pop();
      const fileId   = randomUUID();

      const item = {
        fileId,
        fileName,
        s3Key: key,
        bucket,
        fileSize,
        eTag,
        status: 'processed',
        uploadedAt: new Date().toISOString(),
        sqsMessageId: sqsRecord.messageId,
      };

      await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
      results.push(fileId);
      console.log('Saved to DynamoDB:', item);
    }
  }

  return { batchItemFailures: [], processed: results.length };
};
