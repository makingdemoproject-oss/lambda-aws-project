const express = require('express');
const cors    = require('cors');
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const app    = express();
const PORT   = process.env.PORT   || 8080;
const REGION = process.env.AWS_REGION || 'ap-south-1';
const QUEUE  = process.env.ECS_QUEUE_URL;
const TABLE  = process.env.EVENTS_TABLE;

const sqs    = new SQSClient({ region: REGION });
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'ecs-event-processor',
  instance: process.env.ECS_TASK_ID || 'local',
  queueConnected: !!QUEUE,
  tableConnected: !!TABLE,
  timestamp: new Date().toISOString(),
}));

// Poll SQS every 5 seconds → insert to DynamoDB
async function pollQueue() {
  if (!QUEUE || !TABLE) return;
  try {
    const res = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: QUEUE, MaxNumberOfMessages: 10, WaitTimeSeconds: 5,
    }));
    for (const msg of (res.Messages || [])) {
      try {
        const body   = JSON.parse(msg.Body);
        const detail = body.detail || body;
        const item   = {
          eventId:    randomUUID(),
          source:     body.source     || 'ec2.express',
          detailType: body['detail-type'] || detail.eventType || 'ECSEvent',
          detail,
          receivedAt: new Date().toISOString(),
          target:     'ECS',
          ecsMsgId:   msg.MessageId,
          ecsTaskId:  process.env.ECS_TASK_ID || 'local',
        };
        await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
        await sqs.send(new DeleteMessageCommand({ QueueUrl: QUEUE, ReceiptHandle: msg.ReceiptHandle }));
        console.log('ECS stored event to DynamoDB:', item.eventId, item.detailType);
      } catch (e) { console.error('msg error:', e.message); }
    }
  } catch (e) { console.error('poll error:', e.message); }
}

setInterval(pollQueue, 5000);

app.listen(PORT, () => {
  console.log(`ECS event processor running on :${PORT}`);
  console.log(`SQS Queue: ${QUEUE || 'NOT SET'}`);
  console.log(`DynamoDB Table: ${TABLE || 'NOT SET'}`);
});
