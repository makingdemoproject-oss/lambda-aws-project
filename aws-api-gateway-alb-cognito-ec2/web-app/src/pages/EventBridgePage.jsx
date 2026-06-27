import { useState, useEffect } from 'react';

const DEFAULT_API = 'https://glld8xowg5.execute-api.ap-south-1.amazonaws.com/prod';
localStorage.removeItem('ebApi');

const EVENT_TYPES = ['OrderCreated', 'PaymentSuccess', 'UserRegistered', 'InventoryLow', 'OrderShipped'];
const PRODUCTS    = ['Laptop Pro', 'Smartphone X12', 'Smart Watch', 'Headphones', 'Tablet Air'];

const TARGET_META = {
  'Lambda':     { color: '#f59e0b', icon: '⚡' },
  'SQS→Lambda': { color: '#3b82f6', icon: '📨' },
  'SNS→Lambda': { color: '#8b5cf6', icon: '📣' },
  'ECS':        { color: '#10b981', icon: '🐳' },
};

function targetBadge(target) {
  const m = TARGET_META[target] || { color: '#64748b', icon: '•' };
  return (
    <span style={{ background: m.color + '25', color: m.color, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
      {m.icon} {target}
    </span>
  );
}

export default function EventBridgePage() {
  const [apiUrl, setApiUrl]   = useState(DEFAULT_API);
  const [editApi, setEditApi] = useState(false);
  const [events, setEvents]   = useState([]);
  const [firing, setFiring]   = useState(false);
  const [lastEvent, setLast]  = useState(null);
  const [form, setForm]       = useState({ eventType: 'OrderCreated', product: 'Laptop Pro', amount: '25000' });

  const fetchEvents = async () => {
    try {
      const r = await fetch(`${apiUrl}/events`);
      const d = await r.json();
      setEvents(d.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchEvents(); const t = setInterval(fetchEvents, 10000); return () => clearInterval(t); }, [apiUrl]);

  const fireEvent = async () => {
    setFiring(true);
    try {
      const r = await fetch(`${apiUrl}/publish-event`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      setLast(d);
      setTimeout(fetchEvents, 2000);
      setTimeout(fetchEvents, 6000);
      setTimeout(fetchEvents, 12000);
    } catch (e) { setLast({ error: e.message }); }
    finally { setFiring(false); }
  };

  const downloadJSON = () => {
    const log = {
      title: 'EventBridge Flow Log', generatedAt: new Date().toISOString(),
      apiUrl, dynamoTable: 'ec2-eventbridge-events', totalEvents: events.length,
      targets: ['Lambda', 'SQS→Lambda', 'SNS→Lambda', 'ECS'],
      events,
    };
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `eventbridge-log-${Date.now()}.json`;
    a.click();
  };

  const TARGETS = [
    { icon: '⚡', label: 'Lambda',        color: '#f59e0b', desc: 'EventBridge → eb-ecs-event-handler → DynamoDB (target=Lambda)' },
    { icon: '📨', label: 'SQS→Lambda',    color: '#3b82f6', desc: 'EventBridge → SQS → eb-ecs-sqs-consumer → DynamoDB (target=SQS→Lambda)' },
    { icon: '📣', label: 'SNS→Lambda',    color: '#8b5cf6', desc: 'EventBridge → SNS → eb-ecs-sns-consumer → DynamoDB (target=SNS→Lambda)' },
    { icon: '🐳', label: 'ECS (Fargate)', color: '#10b981', desc: 'EventBridge → SQS → ECS polls queue → DynamoDB (target=ECS)' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: 'monospace', padding: 20 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <a href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>&larr; ShopSphere</a>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: '0 0 4px' }}>
          EC2 &rarr; EventBridge &rarr; Lambda / SQS / SNS / ECS
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>
          EC2 Express publishes event → EventBridge routes to 4 targets → all store to DynamoDB
        </p>

        {/* API URL */}
        <div style={{ background: '#1e2130', border: '1px solid #2d3148', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>API:</span>
          {editApi ? (
            <>
              <input defaultValue={apiUrl} onBlur={e => { setApiUrl(e.target.value); setEditApi(false); }}
                onKeyDown={e => e.key === 'Enter' && (setApiUrl(e.target.value), setEditApi(false))} autoFocus
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
            {[{ icon: '🖥️', label: 'EC2 Express', color: '#334155' }, null, { icon: '🔀', label: 'EventBridge', color: '#7c3aed' }]
              .map((item, i) => item
                ? <div key={i} style={{ background: item.color, borderRadius: 8, padding: '10px 16px', textAlign: 'center', minWidth: 100 }}>
                    <div style={{ fontSize: 20 }}>{item.icon}</div>
                    <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>{item.label}</div>
                  </div>
                : <div key={i} style={{ color: '#4f46e5', fontSize: 20 }}>&rarr;</div>
              )}
            <div style={{ color: '#4f46e5', fontSize: 18 }}>&rarr;</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {TARGETS.map(t => (
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
            <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>EventBridge Targets (4)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TARGETS.map(t => (
                <div key={t.label} style={{ background: '#0f1117', borderRadius: 6, padding: '10px 12px', borderLeft: `3px solid ${t.color}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.color, marginBottom: 3 }}>{t.icon} {t.label}</div>
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
              DynamoDB — ec2-eventbridge-events ({events.length} records)
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={fetchEvents}
                style={{ background: 'none', border: '1px solid #334155', borderRadius: 4, padding: '4px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}>
                Refresh
              </button>
              <button onClick={downloadJSON} disabled={events.length === 0}
                style={{ background: events.length > 0 ? '#10b98120' : 'none', border: '1px solid #10b981', borderRadius: 4, padding: '4px 12px', color: '#10b981', cursor: events.length > 0 ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 600 }}>
                ↓ Download JSON
              </button>
            </div>
          </div>

          {/* Target summary badges */}
          {events.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {Object.entries(
                events.reduce((acc, e) => { acc[e.target] = (acc[e.target] || 0) + 1; return acc; }, {})
              ).map(([t, count]) => (
                <span key={t} style={{ background: (TARGET_META[t]?.color || '#64748b') + '20', color: TARGET_META[t]?.color || '#64748b', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                  {TARGET_META[t]?.icon} {t}: {count}
                </span>
              ))}
            </div>
          )}

          {events.length === 0 ? (
            <p style={{ color: '#475569', fontSize: 13 }}>No events yet. Fire an event above.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['#', 'detailType', 'target', 'detail.product', 'detail.amount', 'receivedAt'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#64748b', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={e.eventId || i} style={{ borderBottom: '1px solid #0f1117', background: i % 2 === 0 ? '#ffffff05' : 'transparent' }}>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>{i + 1}</td>
                      <td style={{ padding: '6px 10px', color: '#f1f5f9', fontWeight: 600 }}>{e.detailType}</td>
                      <td style={{ padding: '6px 10px' }}>{targetBadge(e.target)}</td>
                      <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{e.detail?.product || '-'}</td>
                      <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{e.detail?.amount ? `₹${e.detail.amount}` : '-'}</td>
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
              { title: 'ECS Cluster',    value: 'ec2-events-cluster-production', color: '#10b981' },
              { title: 'CodeBuild',      value: 'ec2-ecs-docker-build-production', color: '#3b82f6' },
            ].map(item => (
              <div key={item.title} style={{ background: '#0f1117', borderRadius: 6, padding: '12px 14px', borderTop: `2px solid ${item.color}` }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>{item.title}</div>
                <code style={{ fontSize: 11, color: item.color }}>{item.value}</code>
              </div>
            ))}
          </div>
          <p style={{ color: '#475569', fontSize: 11, marginTop: 12, marginBottom: 0 }}>
            ECS polls SQS every 5s → inserts event to DynamoDB (target=ECS) • CodeBuild → docker build → ECR push → ECS deploy
          </p>
        </div>

      </div>
    </div>
  );
}
