import React, { useState } from 'react';
import axios from 'axios';

const EVENT_TYPES = ['UserRegistered', 'OrderPlaced', 'PaymentProcessed', 'UserUpdated'];
const SOURCES = ['com.myapp.web', 'com.myapp.mobile', 'com.myapp.manual', 'com.myapp.api'];

export default function SendEvent() {
  const [form, setForm] = useState({
    eventType: 'UserRegistered',
    source: 'com.myapp.manual',
    email: '',
    payload: '{\n  "userId": "user-001",\n  "name": "Test User"\n}',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      let payload;
      try { payload = JSON.parse(form.payload); } catch { payload = { raw: form.payload }; }

      const res = await axios.post('/api/events/send', {
        eventType: form.eventType,
        source: form.source,
        email: form.email,
        payload,
      });
      setResult({ type: 'success', message: `Event sent! ID: ${res.data.eventId}`, data: res.data });
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || err.message });
    }
    setLoading(false);
  };

  const flowSteps = [
    { label: 'EventBridge', desc: 'Routes event by type' },
    { label: 'SQS Queue 1', desc: 'Buffers the event' },
    { label: 'Lambda 1', desc: 'Processes & publishes to SNS' },
    { label: 'SNS', desc: 'Fan-out to subscribers' },
    { label: 'SQS Queue 2', desc: 'Notification queue' },
    { label: 'Lambda 2', desc: 'Sends SES email' },
    { label: 'Lambda 3', desc: 'Updates analytics DB' },
  ];

  return (
    <div>
      <div className="page-title">📤 Send Event</div>
      <div className="page-subtitle">Publish an event to EventBridge — triggers the full workflow</div>

      {result && (
        <div className={`alert ${result.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {result.message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <form onSubmit={handleSubmit} className="form-card">
          <div className="form-group">
            <label>Event Type</label>
            <select name="eventType" value={form.eventType} onChange={handleChange}>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Source</label>
            <select name="source" value={form.source} onChange={handleChange}>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Recipient Email (for SES notification)</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="user@example.com"
            />
          </div>

          <div className="form-group">
            <label>Payload (JSON)</label>
            <textarea
              name="payload"
              value={form.payload}
              onChange={handleChange}
              style={{ fontFamily: 'monospace', fontSize: 13 }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending...' : '⚡ Send to EventBridge'}
          </button>
        </form>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="section">
            <div className="section-title">Workflow Triggered</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {flowSteps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#1e3a5f', color: '#38bdf8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{step.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result?.type === 'success' && result.data && (
            <div className="section" style={{ marginTop: 16 }}>
              <div className="section-title">Response</div>
              <pre style={{ fontSize: 12, color: '#94a3b8', overflowX: 'auto' }}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
