import { useState, useEffect } from 'react';

const DEFAULT_API = localStorage.getItem('ebApi') || 'https://YOUR_API_ID.execute-api.ap-south-1.amazonaws.com/prod';

const EVENT_TYPES = ['OrderCreated', 'PaymentSuccess', 'UserRegistered', 'InventoryLow', 'OrderShipped'];
const PRODUCTS    = ['Laptop Pro', 'Smartphone X12', 'Smart Watch', 'Headphones', 'Tablet Air'];

export default function EventBridgePage() {
  const [apiUrl, setApiUrl]     = useState(DEFAULT_API);
  const [editApi, setEditApi]   = useState(false);
  const [events, setEvents]     = useState([]);
  const [firing, setFiring]     = useState(false);
  const [lastEvent, setLast]    = useState(null);
  const [form, setForm]         = useState({ eventType: 'OrderCreated', product: 'Laptop Pro', amount: '25000' });

  const saveApi = (v) => { localStorage.setItem('ebApi', v); setApiUrl(v); setEditApi(false); };

  const fetchEvents = async () => {
    try {
      const r = await fetch(`${apiUrl}/events`);
      const d = await r.json();
      setEvents(d.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchEvents(); }, [apiUrl]);

  const fireEvent = async () => {
    setFiring(true);
    try {
      const r = await fetch(`${apiUrl}/publish-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      setLast(d);
      setTimeout(fetchEvents, 2000);
      setTimeout(fetchEvents, 5000);
    } catch (e) {
      setLast({ error: e.message });
    } finally {
      setFiring(false);
    }
  };

  const TARGETS = [
    { icon: '⚡', label: 'Lambda',        color: '#f59e0b', desc: 'eb-ecs-event-handler → stores event to DynamoDB immediately' },
    { icon: '📨', label: 'SQS',           color: '#3b82f6', desc: 'ec2-events-queue → Lambda consumer polls & stores with target=SQS→Lambda' },
    { icon: '📣', label: 'SNS',           color: '#8b5cf6', desc: 'ec2-events-topic → publish to all subscribers (email, HTTP, Lambda)' },
    { icon: '🐳', label: 'ECS (Fargate)', color: '#10b981', desc: 'Fargate container processes event — Docker image from ECR' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: 'monospace', padding: 20 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <a href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>&larr; ShopSphere</a>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
          EC2 &rarr; EventBridge &rarr; Lambda / SQS / SNS / ECS
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>
          EC2 Express server publishes custom event → EventBridge routes to multiple targets simultaneously
        </p>

        {/* API URL */}
        <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>API:</span>
          {editApi ? (
            <>
              <input defaultValue={apiUrl} onBlur={e => saveApi(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveApi(e.target.value)} autoFocus
                style={{ flex: 1, background: '#0f1117', border: '1px solid #4f46e5', borderRadius: 4, padding: '4px 8px', color: '#e2e8f0', fontSize: 12 }} />
              <button onClick={() => setEditApi(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
            </>
          ) : (
            <>
              <code style={{ flex: 1, color: '#a5b4fc', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apiUrl}</code>
              <button onClick={() => setEditApi(true)} style={{ background: 'none', border: '1px solid #2d3148', borderRadius: 4, color: '#94a3b8', cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}>Edit</button>
            </>
          )}
        </div>

        {/* Architecture */}
        <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: 18, marginBottom: 20 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>Architecture</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { icon: '🖥️', label: 'EC2 Express', color: '#334155' },
              null,
              { icon: '🔀', label: 'EventBridge', color: '#7c3aed' },
            ].map((item, i) => item ? (
              <div key={i} style={{ background: item.color, borderRadius: 8, padding: '10px 16px', textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 20 }}>{item.icon}</div>
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>{item.label}</div>
              </div>
            ) : <div key={i} style={{ color: '#4f46e5', fontSize: 20, padding: '0 4px' }}>&rarr;</div>)}
            <div style={{ color: '#4f46e5', fontSize: 18 }}>&rarr;</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {TARGETS.map((t) => (
                <div key={t.label} style={{ background: '#0f1117', border: `1px solid ${t.color}40`, borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span style={{ fontSize: 11, color: t.color, fontWeight: 600 }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Fire Event */}
          <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: 18 }}>
            <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>Fire Event from EC2</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Event Type</label>
                <select value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value })}
                  style={{ width: '100%', background: '#0f1117', border: '1px solid #334155', borderRadius: 4, padding: '6px 8px', color: '#e2e8f0', fontSize: 12 }}>
                  {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Product</label>
                <select value={form.product} onChange={e => setForm({ ...form, product: e.target.value })}
                  style={{ width: '100%', background: '#0f1117', border: '1px solid #334155', borderRadius: 4, padding: '6px 8px', color: '#e2e8f0', fontSize: 12 }}>
                  {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Amount (₹)</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  style={{ width: '100%', background: '#0f1117', border: '1px solid #334155', borderRadius: 4, padding: '6px 8px', color: '#e2e8f0', fontSize: 12 }} />
              </div>
              <button onClick={fireEvent} disabled={firing}
                style={{ background: firing ? '#334155' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: firing ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
                {firing ? 'Publishing...' : '⚡ Fire Event to EventBridge'}
              </button>
            </div>
          </div>

          {/* Targets Info */}
          <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: 18 }}>
            <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>EventBridge Targets</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TARGETS.map(t => (
                <div key={t.label} style={{ background: '#0f1117', borderRadius: 6, padding: '10px 12px', borderLeft: `3px solid ${t.color}` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.color, marginBottom: 3 }}>{t.icon} {t.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Last response */}
        {lastEvent && (
          <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Last Response</h2>
              <button onClick={fetchEvents} style={{ background: 'none', border: '1px solid #334155', borderRadius: 4, padding: '3px 10px', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>Refresh Events</button>
            </div>
            <pre style={{ background: '#0f1117', padding: 12, borderRadius: 6, fontSize: 11, color: '#a5b4fc', margin: 0, overflow: 'auto', maxHeight: 180 }}>
              {JSON.stringify(lastEvent, null, 2)}
            </pre>
          </div>
        )}

        {/* Events Table */}
        <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
              DynamoDB — ec2-eventbridge-events ({events.length})
            </h2>
            <button onClick={fetchEvents} style={{ background: 'none', border: '1px solid #334155', borderRadius: 4, padding: '4px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>Refresh</button>
          </div>
          {events.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 13 }}>No events yet. Fire an event above.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['detailType', 'target', 'source', 'receivedAt'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#64748b', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={e.eventId || i} style={{ borderBottom: '1px solid #1e2130' }}>
                      <td style={{ padding: '6px 10px', color: '#f1f5f9' }}>{e.detailType}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{ background: e.target === 'Lambda' ? '#7c3aed30' : '#3b82f630', color: e.target === 'Lambda' ? '#a78bfa' : '#60a5fa', padding: '2px 6px', borderRadius: 4 }}>
                          {e.target}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{e.source}</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>{e.receivedAt ? new Date(e.receivedAt).toLocaleTimeString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ECS + CodeBuild info */}
        <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: 18, marginTop: 16 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>ECS + ECR + CodeBuild</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { title: 'ECR Repository', value: 'ec2-express-ecs-production', color: '#f59e0b' },
              { title: 'ECS Cluster', value: 'ec2-events-cluster-production', color: '#10b981' },
              { title: 'CodeBuild Project', value: 'ec2-ecs-docker-build-production', color: '#3b82f6' },
            ].map(item => (
              <div key={item.title} style={{ background: '#0f1117', borderRadius: 6, padding: '12px 14px', borderTop: `2px solid ${item.color}` }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>{item.title}</div>
                <code style={{ fontSize: 11, color: item.color }}>{item.value}</code>
              </div>
            ))}
          </div>
          <p style={{ color: '#475569', fontSize: 11, marginTop: 12, marginBottom: 0 }}>
            CodeBuild → docker build → push to ECR → ECS pulls latest image → Fargate task runs
          </p>
        </div>

      </div>
    </div>
  );
}
