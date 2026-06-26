const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });
const BUCKET = process.env.UPLOADS_BUCKET;

const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const filename = params.filename;
  const contentType = params.contentType || 'text/csv';

  if (!filename) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ message: 'filename query param required' }) };
  }

  const key = `uploads/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 300 });

  return {
    statusCode: 200,
    headers: cors,
    body: JSON.stringify({ uploadUrl: url, key, bucket: BUCKET, expiresIn: 300 }),
  };
};
