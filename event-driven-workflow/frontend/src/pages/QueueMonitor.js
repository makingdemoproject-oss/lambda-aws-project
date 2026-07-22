import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

export default function QueueMonitor() {
  const [queues, setQueues] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/queues/status');
      setQueues(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchQueues();
    let interval;
    if (autoRefresh) { interval = setInterval(fetchQueues, 5000); }
    return () => clearInterval(interval);
  }, [fetchQueues, autoRefresh]);

  const queueDefs = [
    {
      key: 'eventBuffer',
      name: 'Event Buffer Queue (SQS Queue 1)',
      desc: 'Receives events from EventBridge → triggers Lambda 1',
      color: '#34d399',
    },
    {
      key: 'notification',
      name: 'Notification Queue (SQS Queue 2)',
      desc: 'Receives from SNS → triggers Lambda 2 (SES email)',
      color: '#60a5fa',
    },
    {
      key: 'dlq',
      name: 'Dead Letter Queue (DLQ)',
      desc: 'Failed messages after 3 retries → archived to S3',
      color: '#f87171',
    },
  ];

  return (
    <div>
      <div className="page-title">🔄 Queue Monitor</div>
      <div className="page-subtitle">Real-time SQS queue depths — visible, in-flight, and delayed messages</div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={fetchQueues} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
          <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
          Auto-refresh every 5s
        </label>
        {autoRefresh && <span className="badge badge-green">● LIVE</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {queueDefs.map(qd => {
          const q = queues?.[qd.key] || {};
          const hasError = !!q.error;
          return (
            <div key={qd.key} className="section" style={{ borderLeft: `3px solid ${qd.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{qd.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{qd.desc}</div>
                  {q.url && <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontFamily: 'monospace' }}>{q.url}</div>}
                  {hasError && <div style={{ fontSize: 12, color: '#f87171', marginTop: 4 }}>Error: {q.error}</div>}
                </div>
                {!hasError && (
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: qd.color, fontVariantNumeric: 'tabular-nums' }}>
                        {loading ? '...' : (q.visible ?? '-')}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Visible</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>
                        {loading ? '...' : (q.inFlight ?? '-')}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>In-Flight</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        {loading ? '...' : (q.delayed ?? '-')}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Delayed</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="section" style={{ marginTop: 8 }}>
        <div className="section-title">Message Lifecycle</div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: '#94a3b8' }}>
          <div>📌 <strong style={{ color: '#e2e8f0' }}>Visible</strong> — waiting to be picked up by Lambda</div>
          <div>✈️ <strong style={{ color: '#e2e8f0' }}>In-Flight</strong> — Lambda is processing (visibility timeout active)</div>
          <div>⏳ <strong style={{ color: '#e2e8f0' }}>Delayed</strong> — held by delivery delay (not yet visible)</div>
          <div>💀 <strong style={{ color: '#e2e8f0' }}>DLQ</strong> — failed after 3 retries → goes to DLQ Manager</div>
        </div>
      </div>
    </div>
  );
}
