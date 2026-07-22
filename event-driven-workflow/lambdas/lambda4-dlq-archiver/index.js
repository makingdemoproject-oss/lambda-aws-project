const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const BUCKET = process.env.DLQ_ARCHIVAL_BUCKET;

exports.handler = async (event) => {
  console.log('DLQ Archiver triggered. Records:', event.Records.length);

  for (const record of event.Records) {
    const messageId = record.messageId;
    const receiveCount = record.attributes?.ApproximateReceiveCount || 'unknown';
    const sentTimestamp = record.attributes?.SentTimestamp;

    const archiveDate = new Date(sentTimestamp ? parseInt(sentTimestamp) : Date.now());
    const datePath = `${archiveDate.getUTCFullYear()}/${String(archiveDate.getUTCMonth() + 1).padStart(2, '0')}/${String(archiveDate.getUTCDate()).padStart(2, '0')}`;
    const s3Key = `dlq-archive/${datePath}/${messageId}.json`;

    const archivePayload = {
      messageId,
      receiveCount,
      sentTimestamp: archiveDate.toISOString(),
      archivedAt: new Date().toISOString(),
      body: record.body,
      attributes: record.attributes,
      messageAttributes: record.messageAttributes,
    };

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: JSON.stringify(archivePayload, null, 2),
      ContentType: 'application/json',
      Metadata: {
        'message-id': messageId,
        'receive-count': String(receiveCount),
      },
    }));

    console.log(`Archived DLQ message ${messageId} → s3://${BUCKET}/${s3Key}`);
  }

  return { statusCode: 200, archived: event.Records.length };
};
