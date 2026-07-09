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
    <div style={{ minHeight: '100vh', background: '#f1f5f9', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <a href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>&larr; ShopSphere</a>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
          EC2 &rarr; EventBridge &rarr; Lambda / SQS / SNS / ECS
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>
          EC2 Express publishes event → EventBridge routes to 4 targets → all store to DynamoDB
        </p>

        {/* API URL */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>API:</span>
          {editApi ? (
            <>
              <input defaultValue={apiUrl} onBlur={e => { setApiUrl(e.target.value); setEditApi(false); }}
                onKeyDown={e => e.key === 'Enter' && (setApiUrl(e.target.value), setEditApi(false))} autoFocus
                style={{ flex: 1, background: '#f8fafc', border: '1px solid #4f46e5', borderRadius: 4, padding: '4px 8px', color: '#0f172a', fontSize: 12 }} />
              <button onClick={() => setEditApi(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
            </>
          ) : (
            <>
              <code style={{ flex: 1, color: '#4f46e5', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apiUrl}</code>
              <button onClick={() => setEditApi(true)} style={{ background: 'none', border: '1px solid #2d3148', borderRadius: 4, color: '#64748b', cursor: 'pointer', padding: '2px 8px', fontSize: 12 }}>Edit</button>
            </>
          )}
        </div>

        {/* How It Works — Service Call Flow */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderRadius: 8, padding: 18, marginBottom: 20 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1 }}>
            How EventBridge Works — Kaun Kaun Service Call Ho Rahi Hai
          </h2>

          {/* Step 1: React → API Gateway → Lambda */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>STEP 1 — Event Publish</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {[
                { icon: '🌐', label: 'React UI', sub: 'Fire Event button', color: '#1d4ed8' },
                { arrow: 'POST /publish-event' },
                { icon: '🔗', label: 'API Gateway', sub: 'HTTP API', color: '#0369a1' },
                { arrow: 'invoke' },
                { icon: 'λ', label: 'Lambda', sub: 'eb-ecs-publish-event', color: '#92400e' },
                { arrow: 'PutEvents()' },
                { icon: '🔀', label: 'EventBridge', sub: 'ec2-events-bus-production', color: '#5b21b6' },
              ].map((item, i) =>
                item.arrow
                  ? <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ color: '#64748b', fontSize: 16 }}>→</span>
                      <span style={{ color: '#64748b', fontSize: 9 }}>{item.arrow}</span>
                    </div>
                  : <div key={i} style={{ background: item.color + '30', border: `1px solid ${item.color}60`, borderRadius: 6, padding: '8px 12px', textAlign: 'center', minWidth: 90 }}>
                      <div style={{ fontSize: 16 }}>{item.icon}</div>
                      <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{item.sub}</div>
                    </div>
              )}
            </div>
          </div>

          {/* Step 2: EventBridge → 4 Targets */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>STEP 2 — EventBridge Routes to 4 Targets Simultaneously</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                {
                  color: '#f59e0b', icon: '⚡', target: 'Lambda (Direct)',
                  flow: [
                    { label: 'EventBridge', sub: 'rule matches', icon: '🔀' },
                    { arrow: 'invoke' },
                    { label: 'Lambda', sub: 'eb-ecs-event-handler', icon: 'λ' },
                    { arrow: 'PutItem' },
                    { label: 'DynamoDB', sub: 'target="Lambda"', icon: '🗄️' },
                  ],
                  time: '~1.3 sec',
                },
                {
                  color: '#3b82f6', icon: '📨', target: 'SQS → Lambda',
                  flow: [
                    { label: 'EventBridge', sub: 'rule matches', icon: '🔀' },
                    { arrow: 'SendMessage' },
                    { label: 'SQS Queue', sub: 'ec2-events-queue', icon: '📦' },
                    { arrow: 'trigger (ESM)' },
                    { label: 'Lambda', sub: 'eb-ecs-sqs-consumer', icon: 'λ' },
                    { arrow: 'PutItem' },
                    { label: 'DynamoDB', sub: 'target="SQS→Lambda"', icon: '🗄️' },
                  ],
                  time: '~1.2 sec',
                },
                {
                  color: '#8b5cf6', icon: '📣', target: 'SNS → Lambda',
                  flow: [
                    { label: 'EventBridge', sub: 'rule matches', icon: '🔀' },
                    { arrow: 'Publish' },
                    { label: 'SNS Topic', sub: 'ec2-events-topic', icon: '📡' },
                    { arrow: 'notify subscriber' },
                    { label: 'Lambda', sub: 'eb-ecs-sns-consumer', icon: 'λ' },
                    { arrow: 'PutItem' },
                    { label: 'DynamoDB', sub: 'target="SNS→Lambda"', icon: '🗄️' },
                  ],
                  time: '~1.4 sec',
                },
                {
                  color: '#10b981', icon: '🐳', target: 'ECS Fargate (SQS Polling)',
                  flow: [
                    { label: 'EventBridge', sub: 'rule matches', icon: '🔀' },
                    { arrow: 'SendMessage' },
                    { label: 'SQS Queue', sub: 'ec2-events-ecs-queue', icon: '📦' },
                    { arrow: 'polls every 5s' },
                    { label: 'ECS Container', sub: 'Node.js Express', icon: '🐳' },
                    { arrow: 'PutItem' },
                    { label: 'DynamoDB', sub: 'target="ECS"', icon: '🗄️' },
                  ],
                  time: '~0.8 sec',
                },
              ].map(row => (
                <div key={row.target} style={{ background: '#f8fafc', borderRadius: 6, padding: '10px 14px', borderLeft: `3px solid ${row.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: row.color, fontWeight: 700, fontSize: 12 }}>{row.icon} {row.target}</span>
                    <span style={{ color: '#64748b', fontSize: 10 }}>⏱ {row.time}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {row.flow.map((item, i) =>
                      item.arrow
                        ? <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ color: '#94a3b8', fontSize: 16 }}>→</span>
                            <span style={{ color: '#94a3b8', fontSize: 9 }}>{item.arrow}</span>
                          </div>
                        : <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                            <div style={{ fontSize: 12 }}>{item.icon}</div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>{item.label}</div>
                            <div style={{ fontSize: 9, color: '#64748b' }}>{item.sub}</div>
                          </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 3: React reads back */}
          <div>
            <div style={{ fontSize: 11, color: '#4f46e5', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>STEP 3 — UI Reads Events Back (Auto-refresh 10s)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {[
                { icon: '🗄️', label: 'DynamoDB', sub: 'ec2-eventbridge-events', color: '#1d4ed8' },
                { arrow: 'Scan/Query' },
                { icon: 'λ', label: 'Lambda', sub: 'eb-ecs-get-events', color: '#92400e' },
                { arrow: 'GET /events' },
                { icon: '🔗', label: 'API Gateway', sub: 'HTTP API', color: '#0369a1' },
                { arrow: 'JSON response' },
                { icon: '🌐', label: 'React UI', sub: 'table + badges', color: '#1d4ed8' },
              ].map((item, i) =>
                item.arrow
                  ? <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ color: '#64748b', fontSize: 16 }}>→</span>
                      <span style={{ color: '#64748b', fontSize: 9 }}>{item.arrow}</span>
                    </div>
                  : <div key={i} style={{ background: item.color + '20', border: `1px solid ${item.color}40`, borderRadius: 6, padding: '8px 12px', textAlign: 'center', minWidth: 85 }}>
                      <div style={{ fontSize: 16 }}>{item.icon}</div>
                      <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 600 }}>{item.label}</div>
                      <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{item.sub}</div>
                    </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Fire Event */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderRadius: 8, padding: 18 }}>
            <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>Fire Event from EC2</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Event Type</label>
                <select value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value })}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 8px', color: '#0f172a', fontSize: 12 }}>
                  {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Product</label>
                <select value={form.product} onChange={e => setForm({ ...form, product: e.target.value })}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 8px', color: '#0f172a', fontSize: 12 }}>
                  {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Amount (₹)</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 8px', color: '#0f172a', fontSize: 12 }} />
              </div>
              <button onClick={fireEvent} disabled={firing}
                style={{ background: firing ? '#334155' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: firing ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13 }}>
                {firing ? 'Publishing...' : '⚡ Fire Event to EventBridge'}
              </button>
            </div>
          </div>

          {/* Targets Info */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderRadius: 8, padding: 18 }}>
            <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>EventBridge Targets (4)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TARGETS.map(t => (
                <div key={t.label} style={{ background: '#f8fafc', borderRadius: 6, padding: '10px 12px', borderLeft: `3px solid ${t.color}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.color, marginBottom: 3 }}>{t.icon} {t.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{t.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Last response */}
        {lastEvent && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Last Response</h2>
              <button onClick={fetchEvents} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 10px', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>Refresh Events</button>
            </div>
            <pre style={{ background: '#f8fafc', padding: 12, borderRadius: 6, fontSize: 11, color: '#4f46e5', margin: 0, overflow: 'auto', maxHeight: 180 }}>
              {JSON.stringify(lastEvent, null, 2)}
            </pre>
          </div>
        )}

        {/* Events Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderRadius: 8, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
              DynamoDB — ec2-eventbridge-events ({events.length} records)
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={fetchEvents}
                style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 12px', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>
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
            <p style={{ color: '#64748b', fontSize: 13 }}>No events yet. Fire an event above.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {['#', 'detailType', 'target', 'detail.product', 'detail.amount', 'receivedAt'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#64748b', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={e.eventId || i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{i + 1}</td>
                      <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 600 }}>{e.detailType}</td>
                      <td style={{ padding: '6px 10px' }}>{targetBadge(e.target)}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{e.detail?.product || '-'}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{e.detail?.amount ? `₹${e.detail.amount}` : '-'}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{e.receivedAt ? new Date(e.receivedAt).toLocaleTimeString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* EventBridge vs SNS — Is Project Ke Context Mein */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderRadius: 8, padding: 18, marginTop: 16 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: 1 }}>
            EventBridge vs SNS — Is Project Mein Dono Kyun Hain?
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* EventBridge Card */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, border: '1px solid #7c3aed40' }}>
              <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔀 EventBridge — Is Project Mein Kya Karta Hai</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { point: 'Smart Router hai', detail: 'Ek event aaya → rule dekha (source=ec2.express) → 4 targets ko simultaneously bheja' },
                  { point: 'Pattern Matching', detail: 'source="ec2.express" match hone par hi fire karta hai — dusre sources ignore' },
                  { point: 'Multiple targets', detail: 'Lambda + SQS + SNS + ECS-Queue — ek saath sab ko route karta hai' },
                  { point: 'Custom Bus', detail: 'ec2-events-bus-production — sirf is project ke events, AWS events nahi' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#7c3aed', fontSize: 10, marginTop: 3 }}>▶</span>
                    <div>
                      <span style={{ color: '#c4b5fd', fontSize: 11, fontWeight: 600 }}>{item.point}: </span>
                      <span style={{ color: '#64748b', fontSize: 11 }}>{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 6, padding: '8px 10px', marginTop: 12, fontFamily: 'monospace', fontSize: 11, color: '#334155' }}>
                <div style={{ color: '#a78bfa', marginBottom: 4 }}>// Is project mein EventBridge ka kaam:</div>
                <div>EventBridge.putEvents(&#123;</div>
                <div style={{ paddingLeft: 12 }}>Source: <span style={{ color: '#34d399' }}>"ec2.express"</span>,</div>
                <div style={{ paddingLeft: 12 }}>Bus: <span style={{ color: '#34d399' }}>"ec2-events-bus-production"</span>,</div>
                <div style={{ paddingLeft: 12 }}>Detail: &#123; orderId, product, amount &#125;</div>
                <div>&#125;) <span style={{ color: '#64748b' }}>// → 4 targets simultaneously</span></div>
              </div>
            </div>

            {/* SNS Card */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, border: '1px solid #8b5cf640' }}>
              <div style={{ color: '#c084fc', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📡 SNS — Is Project Mein Ek Target Ke Roop Mein</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { point: 'Fan-out karta hai', detail: 'EventBridge → SNS topic → SNS ke sabhi subscribers ko notify karta hai' },
                  { point: 'Sirf ek target yahan', detail: 'SNS ka subscriber = snsConsumer Lambda (future mein email/SMS bhi add ho sakta hai)' },
                  { point: 'Protocol: Lambda', detail: 'SNS Subscription: Protocol=lambda → snsConsumer Lambda trigger hoti hai' },
                  { point: 'snsMessageId milta hai', detail: 'DynamoDB record mein snsMessageId field — SNS ka proof' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: '#8b5cf6', fontSize: 10, marginTop: 3 }}>▶</span>
                    <div>
                      <span style={{ color: '#d8b4fe', fontSize: 11, fontWeight: 600 }}>{item.point}: </span>
                      <span style={{ color: '#64748b', fontSize: 11 }}>{item.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: 6, padding: '8px 10px', marginTop: 12, fontFamily: 'monospace', fontSize: 11, color: '#334155' }}>
                <div style={{ color: '#c084fc', marginBottom: 4 }}>// SNS Flow yahan:</div>
                <div>EventBridge → SNS.publish(message)</div>
                <div>SNS → Lambda(snsConsumer) <span style={{ color: '#64748b' }}>// subscriber</span></div>
                <div>Lambda → DynamoDB.put(&#123;</div>
                <div style={{ paddingLeft: 12 }}>target: <span style={{ color: '#34d399' }}>"SNS→Lambda"</span>,</div>
                <div style={{ paddingLeft: 12 }}>snsMessageId: <span style={{ color: '#34d399' }}>"a7a96a74..."</span></div>
                <div>&#125;)</div>
              </div>
            </div>
          </div>

          {/* Key Difference Table */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14 }}>
            <div style={{ color: '#64748b', fontWeight: 700, fontSize: 11, marginBottom: 12, textTransform: 'uppercase' }}>Is Project Mein Dono Ka Fark</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e2130' }}>
                  {['Feature', 'EventBridge (yahan)', 'SNS (yahan)'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#64748b', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Kaam',           'Event router — 4 targets ko route karta hai',     'Fan-out — sirf subscriber ko notify'],
                  ['Pattern match',  'Haan — source=ec2.express se hi fire',             'Nahi — jo bhi publish karo, sab subscribers ko'],
                  ['Targets',        'Lambda, SQS, SNS, ECS-Queue (4 saath)',            'Lambda only (is project mein)'],
                  ['Retry',          'Built-in (24 hrs)',                                 'Built-in (3 retries)'],
                  ['Is flow mein',   'Starting point — sab kuch EventBridge se shuru',   'Intermediate step — EB → SNS → Lambda'],
                  ['DynamoDB proof', 'target="Lambda" record',                           'target="SNS→Lambda", snsMessageId field'],
                ].map(([feat, eb, sns], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                    <td style={{ padding: '7px 10px', color: '#64748b', fontWeight: 600 }}>{feat}</td>
                    <td style={{ padding: '7px 10px', color: '#a78bfa' }}>{eb}</td>
                    <td style={{ padding: '7px 10px', color: '#c084fc' }}>{sns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ECS + CodeBuild info */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderRadius: 8, padding: 18, marginTop: 16 }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>ECS + ECR + CodeBuild</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { title: 'ECR Repository', value: 'ec2-express-ecs-production', color: '#f59e0b' },
              { title: 'ECS Cluster',    value: 'ec2-events-cluster-production', color: '#10b981' },
              { title: 'CodeBuild',      value: 'ec2-ecs-docker-build-production', color: '#3b82f6' },
            ].map(item => (
              <div key={item.title} style={{ background: '#f8fafc', borderRadius: 6, padding: '12px 14px', borderTop: `2px solid ${item.color}` }}>
                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>{item.title}</div>
                <code style={{ fontSize: 11, color: item.color }}>{item.value}</code>
              </div>
            ))}
          </div>
          <p style={{ color: '#64748b', fontSize: 11, marginTop: 12, marginBottom: 0 }}>
            ECS polls SQS every 5s → inserts event to DynamoDB (target=ECS) • CodeBuild → docker build → ECR push → ECS deploy
          </p>
        </div>

      </div>
    </div>
  );
}
