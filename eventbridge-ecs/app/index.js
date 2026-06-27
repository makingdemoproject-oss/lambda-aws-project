const express = require('express');
const cors    = require('cors');

const app    = express();
const PORT   = process.env.PORT || 8080;
const events = [];

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({
  status: 'ok', service: 'ecs-event-processor',
  instance: process.env.ECS_TASK_ID || 'local',
  timestamp: new Date().toISOString(),
}));

// EventBridge → ECS (called via Lambda bridge)
app.post('/process-event', (req, res) => {
  const event = { ...req.body, receivedAt: new Date().toISOString(), processedBy: 'ECS' };
  events.push(event);
  console.log('Event received from EventBridge:', JSON.stringify(event));
  res.json({ success: true, event });
});

app.get('/events', (req, res) => res.json({
  success: true, count: events.length,
  data: events.slice().reverse().slice(0, 50),
}));

app.listen(PORT, () => console.log(`ECS event processor running on :${PORT}`));
