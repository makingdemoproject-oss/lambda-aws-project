require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { EventBridgeClient, PutEventsCommand } = require('@aws-sdk/client-eventbridge');
const { SQSClient, GetQueueAttributesCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { EC2Client, StartInstancesCommand, StopInstancesCommand, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const { CloudFormationClient, CreateStackCommand, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
const fs = require('fs');
const path = require('path');
const db = require('./db/postgres');

const app = express();
const PORT = process.env.PORT || 5000;
const REGION = process.env.AWS_REGION || 'ap-south-1';

app.use(cors());
app.use(express.json());

const eb = new EventBridgeClient({ region: REGION });
const sqs = new SQSClient({ region: REGION });
const s3 = new S3Client({ region: REGION });
const ec2 = new EC2Client({ region: REGION });
const cf = new CloudFormationClient({ region: REGION });

// ─── Health ─────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Send Event to EventBridge ───────────────────────────────────────────────
app.post('/api/events/send', async (req, res) => {
  const { eventType, source, payload, email } = req.body;
  if (!eventType) return res.status(400).json({ error: 'eventType is required' });

  try {
    const result = await eb.send(new PutEventsCommand({
      Entries: [{
        EventBusName: process.env.EVENT_BUS_NAME || 'workflow-event-bus-dev',
        Source: source || 'com.myapp.manual',
        DetailType: eventType,
        Detail: JSON.stringify({ ...payload, email, eventType }),
        Time: new Date(),
      }],
    }));

    const entry = result.Entries[0];
    if (entry.ErrorCode) {
      return res.status(500).json({ error: entry.ErrorMessage });
    }

    res.json({ success: true, eventId: entry.EventId, message: 'Event sent to EventBridge' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Events Log (from PostgreSQL) ────────────────────────────────────────────
app.get('/api/events', async (req, res) => {
  const { limit = 50, offset = 0, status, eventType } = req.query;
  try {
    let whereClause = 'WHERE 1=1';
    const params = [];
    if (status) { params.push(status); whereClause += ` AND status = $${params.length}`; }
    if (eventType) { params.push(eventType); whereClause += ` AND event_type = $${params.length}`; }
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(
      `SELECT * FROM events ${whereClause} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    const countResult = await db.query(`SELECT COUNT(*) FROM events ${whereClause}`, params.slice(0, -2));

    res.json({ events: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Queue Status ─────────────────────────────────────────────────────────────
app.get('/api/queues/status', async (req, res) => {
  const queueUrls = {
    eventBuffer: process.env.EVENT_BUFFER_QUEUE_URL,
    notification: process.env.NOTIFICATION_QUEUE_URL,
    dlq: process.env.DLQ_QUEUE_URL,
  };

  const attrs = ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible', 'ApproximateNumberOfMessagesDelayed'];

  const results = {};
  for (const [name, url] of Object.entries(queueUrls)) {
    if (!url) { results[name] = { error: 'URL not configured' }; continue; }
    try {
      const data = await sqs.send(new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: attrs }));
      results[name] = {
        visible: parseInt(data.Attributes.ApproximateNumberOfMessages || 0),
        inFlight: parseInt(data.Attributes.ApproximateNumberOfMessagesNotVisible || 0),
        delayed: parseInt(data.Attributes.ApproximateNumberOfMessagesDelayed || 0),
        url,
      };
    } catch (err) {
      results[name] = { error: err.message };
    }
  }
  res.json(results);
});

// ─── Analytics (from PostgreSQL) ──────────────────────────────────────────────
app.get('/api/analytics', async (req, res) => {
  const { days = 7 } = req.query;
  try {
    const [daily, totals, recent] = await Promise.all([
      db.query(
        `SELECT event_type, source, event_date, count
         FROM analytics
         WHERE event_date >= CURRENT_DATE - $1::int
         ORDER BY event_date DESC, count DESC`,
        [parseInt(days)]
      ),
      db.query(
        `SELECT event_type, SUM(count)::int as total
         FROM analytics
         WHERE event_date >= CURRENT_DATE - $1::int
         GROUP BY event_type
         ORDER BY total DESC`,
        [parseInt(days)]
      ),
      db.query(
        `SELECT event_type, COUNT(*)::int as count, MAX(created_at) as last_seen
         FROM events
         WHERE created_at >= NOW() - INTERVAL '24 hours'
         GROUP BY event_type
         ORDER BY count DESC`
      ),
    ]);
    res.json({ daily: daily.rows, totals: totals.rows, last24h: recent.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DLQ Messages ─────────────────────────────────────────────────────────────
app.get('/api/dlq/messages', async (req, res) => {
  const dlqUrl = process.env.DLQ_QUEUE_URL;
  if (!dlqUrl) return res.status(400).json({ error: 'DLQ_QUEUE_URL not configured' });

  try {
    const data = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: dlqUrl,
      MaxNumberOfMessages: 10,
      AttributeNames: ['All'],
      MessageAttributeNames: ['All'],
    }));
    res.json({ messages: data.Messages || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Archive DLQ message to DB + delete from queue
app.post('/api/dlq/archive', async (req, res) => {
  const { receiptHandle, messageId, body } = req.body;
  const dlqUrl = process.env.DLQ_QUEUE_URL;
  if (!dlqUrl || !receiptHandle) return res.status(400).json({ error: 'Missing receiptHandle or DLQ_QUEUE_URL' });

  try {
    await db.query(
      `INSERT INTO dlq_archive (message_id, queue_url, body, archived_at) VALUES ($1, $2, $3, NOW())`,
      [messageId, dlqUrl, JSON.stringify(body)]
    );
    await sqs.send(new DeleteMessageCommand({ QueueUrl: dlqUrl, ReceiptHandle: receiptHandle }));
    res.json({ success: true, message: 'Message archived and removed from DLQ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dlq/archived', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM dlq_archive ORDER BY archived_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── EC2 Manager ──────────────────────────────────────────────────────────────
const PG_EC2_INSTANCE_ID = process.env.PG_EC2_INSTANCE_ID || 'i-0dda96ea16a03281d';

app.get('/api/ec2/status', async (req, res) => {
  try {
    const data = await ec2.send(new DescribeInstancesCommand({
      InstanceIds: [PG_EC2_INSTANCE_ID],
    }));
    const instance = data.Reservations?.[0]?.Instances?.[0];
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    res.json({
      instanceId: instance.InstanceId,
      state: instance.State.Name,
      publicIp: instance.PublicIpAddress || null,
      privateIp: instance.PrivateIpAddress || null,
      instanceType: instance.InstanceType,
      launchTime: instance.LaunchTime,
      name: instance.Tags?.find(t => t.Key === 'Name')?.Value || '',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ec2/start', async (req, res) => {
  try {
    await ec2.send(new StartInstancesCommand({ InstanceIds: [PG_EC2_INSTANCE_ID] }));
    res.json({ success: true, message: 'EC2 instance starting...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ec2/stop', async (req, res) => {
  try {
    await ec2.send(new StopInstancesCommand({ InstanceIds: [PG_EC2_INSTANCE_ID] }));
    res.json({ success: true, message: 'EC2 instance stopping...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Infrastructure — Deploy CloudFormation ───────────────────────────────────
app.post('/api/infra/deploy', async (req, res) => {
  const { stackName = 'event-driven-workflow-dev', environment = 'dev' } = req.body;
  const templatePath = path.join(__dirname, '..', 'cloudformation', 'stack.yaml');

  try {
    const templateBody = fs.readFileSync(templatePath, 'utf8');
    await cf.send(new CreateStackCommand({
      StackName: stackName,
      TemplateBody: templateBody,
      Capabilities: ['CAPABILITY_NAMED_IAM'],
      Parameters: [
        { ParameterKey: 'Environment', ParameterValue: environment },
        { ParameterKey: 'PostgreSQLHost', ParameterValue: process.env.PG_HOST || '13.207.251.13' },
        { ParameterKey: 'PostgreSQLPassword', ParameterValue: process.env.PG_PASSWORD || 'Lambda@1234' },
        { ParameterKey: 'SESFromEmail', ParameterValue: process.env.SES_FROM_EMAIL || 'demo-notif-36508@yopmail.com' },
        { ParameterKey: 'LambdaCodeBucket', ParameterValue: process.env.LAMBDA_CODE_BUCKET || 'event-workflow-lambda-code' },
      ],
      Tags: [{ Key: 'Project', Value: 'event-driven-workflow' }],
    }));
    res.json({ success: true, message: `Stack ${stackName} creation initiated` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/infra/status', async (req, res) => {
  const { stackName = 'event-driven-workflow-dev' } = req.query;
  try {
    const data = await cf.send(new DescribeStacksCommand({ StackName: stackName }));
    const stack = data.Stacks?.[0];
    if (!stack) return res.status(404).json({ error: 'Stack not found' });

    res.json({
      stackName: stack.StackName,
      status: stack.StackStatus,
      statusReason: stack.StackStatusReason || null,
      outputs: stack.Outputs || [],
      createdAt: stack.CreationTime,
      updatedAt: stack.LastUpdatedTime,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Event-Driven Workflow backend running on port ${PORT}`);
  console.log(`Region: ${REGION}`);
});
