-- Event Driven Workflow — PostgreSQL Schema
-- DB: rbacdb, user: lambdauser

-- Events table: all raw events received
CREATE TABLE IF NOT EXISTS events (
  id           SERIAL PRIMARY KEY,
  event_type   VARCHAR(100) NOT NULL,
  source       VARCHAR(200),
  payload      JSONB,
  status       VARCHAR(50) DEFAULT 'received',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Notifications table: tracks each notification sent
CREATE TABLE IF NOT EXISTS notifications (
  id           SERIAL PRIMARY KEY,
  event_id     INT REFERENCES events(id) ON DELETE SET NULL,
  event_type   VARCHAR(100),
  channel      VARCHAR(50),   -- 'email', 'analytics', 'webhook'
  recipient    VARCHAR(200),
  status       VARCHAR(50) DEFAULT 'pending',
  error_msg    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- Analytics table: daily rollup per event_type + source
CREATE TABLE IF NOT EXISTS analytics (
  id                  SERIAL PRIMARY KEY,
  event_type          VARCHAR(100) NOT NULL,
  source              VARCHAR(200),
  event_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  count               INT DEFAULT 0,
  last_event_id       INT,
  last_processed_at   TIMESTAMPTZ,
  UNIQUE (event_type, source, event_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);

-- DLQ archive table: messages that hit dead letter queue
CREATE TABLE IF NOT EXISTS dlq_archive (
  id              SERIAL PRIMARY KEY,
  message_id      VARCHAR(200),
  queue_url       VARCHAR(500),
  body            TEXT,
  error_reason    TEXT,
  receive_count   INT DEFAULT 0,
  archived_at     TIMESTAMPTZ DEFAULT NOW()
);
