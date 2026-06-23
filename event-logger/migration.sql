-- event_logs table — SNS/SQS events ko DB mein store karo
CREATE TABLE IF NOT EXISTS event_logs (
  id           SERIAL PRIMARY KEY,
  event_type   VARCHAR(100)  NOT NULL,
  queue_name   VARCHAR(100)  NOT NULL,
  topic_name   VARCHAR(100),
  payload      JSONB         NOT NULL,
  received_at  TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_logs_event_type  ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_received_at ON event_logs(received_at);
