import { useState } from 'react';
import { Link } from 'react-router-dom';

/* ── Constants ─────────────────────────────────────────────────────── */
const LAMBDA_API = 'https://ixthoe12fe.execute-api.ap-south-1.amazonaws.com/prod';

/* ── Colors (same dark theme as AwsDemoPage) ────────────────────────── */
const C = {
  bg:      '#060b18',
  panel:   '#0a0f1e',
  card:    '#0f1629',
  border:  '#1e293b',
  blue:    '#1d4ed8',
  blueL:   '#60a5fa',
  green:   '#15803d',
  greenL:  '#4ade80',
  teal:    '#0d9488',
  tealL:   '#2dd4bf',
  amber:   '#b45309',
  amberL:  '#fbbf24',
  purple:  '#7c3aed',
  purpleL: '#a78bfa',
  red:     '#ef4444',
  muted:   '#475569',
  text:    '#e2e8f0',
  sub:     '#94a3b8',
};

const inputStyle = {
  width: '100%', padding: '6px 8px',
  background: '#060b18', border: `1px solid ${C.border}`,
  borderRadius: 4, color: C.text, fontSize: 12, marginBottom: 6,
};

/* ── Outbox Flow Steps ──────────────────────────────────────────────── */
const FLOW_STEPS = [
  { id: 1, label: 'Form Submit',        color: C.blueL,   detail: 'Browser → Lambda API Gateway → Lambda fn' },
  { id: 2, label: 'BEGIN Transaction',  color: C.amberL,  detail: 'pg.query("BEGIN") — dono operations ek saath' },
  { id: 3, label: 'INSERT orders',      color: C.tealL,   detail: 'INSERT INTO orders (order_id, customer_id, ...)' },
  { id: 4, label: 'INSERT outbox_event',color: C.purpleL, detail: 'INSERT INTO outbox_events (event_type, aggregate_id, payload)' },
  { id: 5, label: 'COMMIT',             color: C.greenL,  detail: 'Atomic — ya dono hoga ya dono nahi (ROLLBACK)' },
  { id: 6, label: 'Worker (1 min)',      color: C.amberL,  detail: 'EventBridge → outbox-worker Lambda' },
  { id: 7, label: 'DynamoDB Sync',      color: C.tealL,   detail: 'PutItem / UpdateItem → mark DONE in PostgreSQL' },
];

/* ── Consistency Problem Explainer ─────────────────────────────────── */
function ProblemCard() {
  return (
    <div style={{ background: '#1a0505', border: `1px solid ${C.red}44`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ color: C.red, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Problem — Dual Write Inconsistency
      </div>
      <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.8, fontFamily: 'monospace' }}>
        <span style={{ color: C.blueL }}>Step 1:</span> <span style={{ color: C.greenL }}>PostgreSQL INSERT</span> <span style={{ color: C.greenL }}>✅</span><br />
        <span style={{ color: C.blueL }}>Step 2:</span> <span style={{ color: C.tealL }}>DynamoDB UPDATE</span> <span style={{ color: C.red }}>❌ fail</span><br />
        <span style={{ color: C.muted }}>→ PostgreSQL mein data hai</span><br />
        <span style={{ color: C.muted }}>→ DynamoDB mein nahi</span><br />
        <span style={{ color: C.red }}>→ DATA INCONSISTENCY !</span>
      </div>
    </div>
  );
}

/* ── Solution Architecture ──────────────────────────────────────────── */
function ArchCard() {
  return (
    <div style={{ background: '#030c1f', border: `1px solid ${C.teal}44`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ color: C.tealL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Solution — Outbox Pattern
      </div>
      <div style={{ fontSize: 11, color: C.sub, lineHeight: 2, fontFamily: 'monospace' }}>
        <span style={{ color: C.blueL }}>Form</span>
        <span style={{ color: C.muted }}> → </span>
        <span style={{ color: '#f59e0b' }}>Lambda API GW</span>
        <span style={{ color: C.muted }}> → </span>
        <span style={{ color: C.greenL }}>Lambda fn</span>
        <br />
        <span style={{ color: C.muted, paddingLeft: 12 }}>↓</span>
        <br />
        <span style={{ color: C.amberL, paddingLeft: 12 }}>PostgreSQL TRANSACTION</span>
        <br />
        <span style={{ color: C.muted, paddingLeft: 24 }}>├ INSERT orders</span>
        <br />
        <span style={{ color: C.muted, paddingLeft: 24 }}>└ INSERT outbox_events (PENDING)</span>
        <br />
        <span style={{ color: C.muted, paddingLeft: 12 }}>↓ COMMIT (atomic)</span>
        <br />
        <span style={{ color: C.purpleL, paddingLeft: 12 }}>EventBridge</span>
        <span style={{ color: C.muted }}> every 1 min → </span>
        <span style={{ color: C.greenL }}>outbox-worker</span>
        <br />
        <span style={{ color: C.muted, paddingLeft: 24 }}>├ DynamoDB PUT/UPDATE</span>
        <br />
        <span style={{ color: C.muted, paddingLeft: 24 }}>└ mark DONE in PostgreSQL</span>
      </div>
    </div>
  );
}

/* ── Flow Step Indicator ────────────────────────────────────────────── */
function FlowSteps({ activeStep }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
      <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
        Live Flow
      </div>
      {FLOW_STEPS.map((step) => {
        const isActive = activeStep === step.id;
        const isDone   = activeStep > step.id;
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
              background: isDone ? step.color + '33' : isActive ? step.color + '22' : '#1e293b',
              border: `1px solid ${isDone ? step.color : isActive ? step.color : C.border}`,
              color: isDone ? step.color : isActive ? step.color : C.muted,
            }}>
              {isDone ? '✓' : step.id}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isActive || isDone ? step.color : C.muted }}>
                {step.label}
              </div>
              {(isActive || isDone) && (
                <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{step.detail}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── SQL Snippet ────────────────────────────────────────────────────── */
function SqlCard({ orderId, customerId }) {
  const sql = `BEGIN;

INSERT INTO orders (order_id, customer_id, product_id, quantity, amount)
VALUES ('${orderId}', '${customerId}', 'PROD-001', 2, 999.00);

INSERT INTO outbox_events (event_type, aggregate_id, payload)
VALUES (
  'ORDER_CREATED',
  '${orderId}',
  '{"PK":"ORDER#${orderId}","SK":"CUSTOMER#${customerId}",...}'
);

COMMIT;  -- atomic: ya dono ya koi nahi`;

  return (
    <div style={{ background: '#020816', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ padding: '5px 10px', background: '#0a0f1e', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>PostgreSQL Transaction SQL</span>
      </div>
      <pre style={{ margin: 0, padding: 10, color: '#7dd3fc', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
        {sql}
      </pre>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function PostgreSQLPage() {
  // Form fields
  const [orderId,     setOrderId]     = useState(`ORD-${Math.floor(Math.random()*9000+1000)}`);
  const [customerId,  setCustomerId]  = useState('CUST-123');
  const [productId,   setProductId]   = useState('PROD-001');
  const [quantity,    setQuantity]    = useState('2');
  const [amount,      setAmount]      = useState('999.00');

  // UI state
  const [tab,        setTab]        = useState('create');
  const [activeStep, setActiveStep] = useState(0);
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState('');

  const addLog = (src, status, path, data) =>
    setLogs(p => [{ id: Date.now(), src, status, path, data, ts: new Date().toLocaleTimeString() }, ...p]);

  /* ── API Calls ── */

  // Step 1+2+3+4+5: Create order → PostgreSQL transaction (orders + outbox_event)
  const createOrder = async () => {
    setLoading('create');
    setActiveStep(1);
    try {
      await sleep(300); setActiveStep(2);
      await sleep(300); setActiveStep(3);

      const r = await fetch(LAMBDA_API + '/outbox/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, customerId, productId, quantity: +quantity, amount: +amount }),
      });
      const d = await r.json();

      setActiveStep(4);
      await sleep(200);
      setActiveStep(5);
      addLog('PostgreSQL', r.status, 'POST /outbox/orders', d);
      // Generate a new orderId for next use
      setOrderId(`ORD-${Math.floor(Math.random()*9000+1000)}`);
    } catch (e) {
      addLog('PostgreSQL', 'ERR', 'POST /outbox/orders', { error: e.message, note: 'RDS starting / Lambda not deployed yet?' });
    } finally {
      setLoading('');
    }
  };

  // Fetch orders from PostgreSQL
  const fetchOrders = async () => {
    setLoading('orders');
    try {
      const r = await fetch(LAMBDA_API + '/outbox/orders');
      const d = await r.json();
      addLog('PostgreSQL', r.status, 'GET /outbox/orders', d);
    } catch (e) {
      addLog('PostgreSQL', 'ERR', 'GET /outbox/orders', { error: e.message });
    } finally { setLoading(''); }
  };

  // Fetch outbox_events table
  const fetchOutboxEvents = async () => {
    setLoading('events');
    try {
      const r = await fetch(LAMBDA_API + '/outbox/events');
      const d = await r.json();
      addLog('outbox_events', r.status, 'GET /outbox/events', d);
    } catch (e) {
      addLog('outbox_events', 'ERR', 'GET /outbox/events', { error: e.message });
    } finally { setLoading(''); }
  };

  // Step 6+7: Manually trigger outbox worker → DynamoDB sync
  const processOutbox = async () => {
    setLoading('process');
    setActiveStep(6);
    try {
      await sleep(400); setActiveStep(7);
      const r = await fetch(LAMBDA_API + '/outbox/process', { method: 'POST' });
      const d = await r.json();
      addLog('DynamoDB', r.status, 'POST /outbox/process', d);
    } catch (e) {
      addLog('DynamoDB', 'ERR', 'POST /outbox/process', { error: e.message });
    } finally { setLoading(''); }
  };

  // Read DynamoDB table
  const fetchDynamoDB = async () => {
    setLoading('dynamo');
    try {
      const r = await fetch(LAMBDA_API + '/outbox/dynamodb');
      const d = await r.json();
      addLog('DynamoDB', r.status, 'GET /outbox/dynamodb', d);
    } catch (e) {
      addLog('DynamoDB', 'ERR', 'GET /outbox/dynamodb', { error: e.message });
    } finally { setLoading(''); }
  };

  const btnStyle = (color, bg, disabled) => ({
    width: '100%', padding: '7px 10px', background: disabled ? '#0a0f1e' : bg,
    border: `1px solid ${disabled ? C.border : color}`, borderRadius: 5,
    color: disabled ? C.muted : color, cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12, fontWeight: 600, marginBottom: 6, textAlign: 'left',
    display: 'flex', alignItems: 'center', gap: 8,
    opacity: disabled ? 0.6 : 1,
  });

  const srcColors = {
    PostgreSQL:    C.tealL,
    outbox_events: C.purpleL,
    DynamoDB:      C.amberL,
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Segoe UI', sans-serif", fontSize: 14 }}>

      {/* Top header */}
      <div style={{ background: '#070d1f', padding: '0 20px', borderBottom: `2px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 0, height: 48 }}>
        <span style={{ color: C.tealL, fontWeight: 800, fontSize: 15, marginRight: 20 }}>PostgreSQL Outbox Pattern</span>
        <span style={{ color: C.muted, fontSize: 11 }}>S3 trigger nahi — direct form → PostgreSQL TRANSACTION → DynamoDB sync</span>

        {/* Tabs */}
        {[
          { id: 'create',  label: 'Create Order',       color: C.tealL  },
          { id: 'monitor', label: 'Monitor Tables',     color: C.purpleL },
          { id: 'explain', label: 'Why Outbox?',        color: C.amberL  },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 16px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
            color: tab === t.id ? t.color : C.muted,
            fontWeight: tab === t.id ? 700 : 400, fontSize: 13, marginLeft: 8,
          }}>
            {t.label}
          </button>
        ))}

        <Link to="/" style={{ marginLeft: 'auto', color: C.muted, fontSize: 12 }}>← Back</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', height: 'calc(100vh - 48px)' }}>

        {/* ═══════════ LEFT PANEL ═══════════ */}
        <div style={{ padding: 12, overflowY: 'auto', borderRight: `1px solid ${C.border}`, background: C.panel, display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* ── CREATE ORDER TAB ── */}
          {tab === 'create' && (<>
            <ProblemCard />
            <ArchCard />

            {/* Order Form */}
            <div style={{ background: C.card, border: `1px solid ${C.teal}44`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.tealL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                New Order — Direct Form (no S3)
              </div>

              <label style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Order ID</label>
              <input value={orderId} onChange={e => setOrderId(e.target.value)} style={inputStyle} />

              <label style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Customer ID</label>
              <input value={customerId} onChange={e => setCustomerId(e.target.value)} style={inputStyle} />

              <label style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Product ID</label>
              <input value={productId} onChange={e => setProductId(e.target.value)} style={inputStyle} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quantity</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Amount (₹)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <button
                onClick={createOrder}
                disabled={loading === 'create'}
                style={btnStyle(C.tealL, '#021a17', loading === 'create')}
              >
                <span style={{ fontSize: 14 }}>📝</span>
                {loading === 'create' ? 'Processing...' : 'Create Order → PostgreSQL TRANSACTION'}
              </button>
            </div>

            {/* Live SQL preview */}
            <SqlCard orderId={orderId} customerId={customerId} />

            {/* Flow steps */}
            <FlowSteps activeStep={activeStep} />
          </>)}

          {/* ── MONITOR TAB ── */}
          {tab === 'monitor' && (<>
            <div style={{ background: '#021a0a', border: `1px solid ${C.green}44`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.greenL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                PostgreSQL Tables
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>
                orders — business data<br />
                outbox_events — PENDING → DONE sync tracker
              </div>

              <button onClick={fetchOrders} disabled={loading === 'orders'} style={btnStyle(C.greenL, '#021a0a', loading === 'orders')}>
                <span>🗃</span> {loading === 'orders' ? 'Loading...' : 'GET /outbox/orders'}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: C.muted }}>PostgreSQL</span>
              </button>

              <button onClick={fetchOutboxEvents} disabled={loading === 'events'} style={btnStyle(C.purpleL, '#1a0b2e', loading === 'events')}>
                <span>📋</span> {loading === 'events' ? 'Loading...' : 'GET /outbox/events'}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: C.muted }}>outbox_events</span>
              </button>
            </div>

            <div style={{ background: '#1a0f02', border: `1px solid ${C.amber}44`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.amberL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                DynamoDB Table — orders-cache
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>
                PK: ORDER#&lt;orderId&gt;<br />
                SK: CUSTOMER#&lt;customerId&gt;<br />
                Synced by outbox-worker Lambda
              </div>

              <button onClick={processOutbox} disabled={loading === 'process'} style={btnStyle(C.amberL, '#1a0f02', loading === 'process')}>
                <span>⚙️</span> {loading === 'process' ? 'Processing...' : 'POST /outbox/process  (trigger worker)'}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: C.muted }}>Worker</span>
              </button>

              <button onClick={fetchDynamoDB} disabled={loading === 'dynamo'} style={btnStyle(C.amberL, '#1a0f02', loading === 'dynamo')}>
                <span>⚡</span> {loading === 'dynamo' ? 'Loading...' : 'GET /outbox/dynamodb'}
                <span style={{ marginLeft: 'auto', fontSize: 10, color: C.muted }}>DynamoDB</span>
              </button>
            </div>

            {/* Status info */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Table Schema
              </div>
              <pre style={{ margin: 0, fontSize: 10, color: '#7dd3fc', fontFamily: 'monospace', lineHeight: 1.7, overflowX: 'auto' }}>
{`outbox_events:
  id, event_id (UUID)
  event_type   ORDER_CREATED
  aggregate_id order_id
  payload      JSON → DynamoDB item
  status       PENDING → DONE
  retry_count  0..5
  created_at, processed_at`}
              </pre>
            </div>
          </>)}

          {/* ── WHY OUTBOX TAB ── */}
          {tab === 'explain' && (<>
            <div style={{ background: '#1a0505', border: `1px solid ${C.red}44`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.red, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Without Outbox — 3 Failure Cases
              </div>
              {[
                { step: 'Case 1', text: 'PostgreSQL ✅ → DynamoDB ❌ → inconsistency', color: C.red },
                { step: 'Case 2', text: 'Lambda timeout after PostgreSQL → DynamoDB never called', color: C.red },
                { step: 'Case 3', text: 'Network fail on DynamoDB → no retry mechanism', color: C.red },
              ].map(c => (
                <div key={c.step} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: c.color, fontSize: 10, fontWeight: 700, minWidth: 50 }}>{c.step}</span>
                  <span style={{ color: C.sub, fontSize: 11 }}>{c.text}</span>
                </div>
              ))}
            </div>

            <div style={{ background: '#021a0a', border: `1px solid ${C.green}44`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.greenL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                With Outbox — Guaranteed Consistency
              </div>
              {[
                { step: 'Guarantee 1', text: 'PostgreSQL TRANSACTION = atomic. Ya dono ya koi nahi', color: C.greenL },
                { step: 'Guarantee 2', text: 'DynamoDB fail → event PENDING → automatic retry (max 5)', color: C.greenL },
                { step: 'Guarantee 3', text: 'Worker crash → events PENDING → next EventBridge run pe retry', color: C.greenL },
                { step: 'Guarantee 4', text: 'Duplicate write → PutItem overwrites same key (idempotent)', color: C.greenL },
              ].map(c => (
                <div key={c.step} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: c.color, fontSize: 10, fontWeight: 700, minWidth: 70 }}>{c.step}</span>
                  <span style={{ color: C.sub, fontSize: 11 }}>{c.text}</span>
                </div>
              ))}
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.sub, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Trade-offs
              </div>
              <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.8 }}>
                <span style={{ color: C.amberL }}>Delay:</span> DynamoDB sync ~1 minute (not real-time)<br />
                <span style={{ color: C.amberL }}>Extra table:</span> outbox_events manage karni padti hai<br />
                <span style={{ color: C.amberL }}>Worker cost:</span> Lambda invocation every 1 minute<br />
                <span style={{ color: C.greenL }}>Benefit:</span> Eventual consistency guaranteed ✅<br />
                <span style={{ color: C.greenL }}>Benefit:</span> No data loss on any failure ✅
              </div>
            </div>

            {/* Interview answer */}
            <div style={{ background: '#0d0a1f', border: `1px solid ${C.purple}55`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.purpleL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Interview Answer
              </div>
              <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.8 }}>
                <span style={{ color: C.purpleL }}>Q:</span> PostgreSQL + DynamoDB consistent kaise rakhoge?<br /><br />
                <span style={{ color: C.purpleL }}>A:</span> Outbox Pattern. PostgreSQL TRANSACTION mein<br />
                business data + outbox_event INSERT karo.<br />
                Separate worker (EventBridge every 1 min)<br />
                PENDING events read karo → DynamoDB sync<br />
                karo → DONE mark karo.<br /><br />
                <span style={{ color: C.greenL }}>Key:</span> Transaction = atomic guarantee.<br />
                <span style={{ color: C.greenL }}>Key:</span> Retry = eventual consistency.
              </div>
            </div>
          </>)}

          {/* Clear logs */}
          {logs.length > 0 && (
            <button onClick={() => { setLogs([]); setActiveStep(0); }}
              style={{ padding: '6px 0', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 5, color: C.muted, cursor: 'pointer', fontSize: 11 }}>
              Clear Logs
            </button>
          )}
        </div>

        {/* ═══════════ RIGHT PANEL — Response Log ═══════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: '#080e1f', borderBottom: `1px solid ${C.border}`, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: C.text }}>Response Log</span>
            {Object.entries(srcColors).map(([src, col]) => {
              const count = logs.filter(l => l.src === src).length;
              const ok    = logs.filter(l => l.src === src && typeof l.status === 'number' && l.status >= 200 && l.status < 300).length;
              return count > 0 ? (
                <span key={src} style={{ background: col + '22', color: col, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                  {src}: {ok}/{count}
                </span>
              ) : null;
            })}
            <span style={{ marginLeft: 'auto', color: C.muted, fontSize: 11 }}>{logs.length} requests</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, background: '#020816' }}>
            {logs.length === 0 && (
              <div style={{ color: '#1e293b', marginTop: 40, textAlign: 'center', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🗄</div>
                <div>Create Order button dabao</div>
                <div style={{ fontSize: 12, marginTop: 6, color: '#0f1f3a' }}>
                  PostgreSQL → outbox_events → DynamoDB flow yahan dikhega
                </div>
              </div>
            )}
            {logs.map((log) => {
              const isOk = typeof log.status === 'number' && log.status >= 200 && log.status < 300;
              const col  = srcColors[log.src] || C.muted;
              return (
                <div key={log.id} style={{ marginBottom: 8, borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: isOk ? '#070d1f' : '#1a0505', borderLeft: `3px solid ${col}` }}>
                    <span style={{ background: col + '22', color: col, padding: '1px 6px', borderRadius: 3, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{log.src}</span>
                    <span style={{ color: isOk ? C.greenL : C.red, fontWeight: 700 }}>{log.status}</span>
                    <span style={{ color: C.sub, flex: 1, fontSize: 11 }}>{log.path}</span>
                    <span style={{ color: C.muted, fontSize: 10 }}>{log.ts}</span>
                  </div>
                  <div style={{ background: '#040810', padding: '6px 10px', border: `1px solid ${C.border}`, borderTop: 0, borderRadius: '0 0 5px 5px', maxHeight: 200, overflowY: 'auto' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 11, color: '#7dd3fc' }}>
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
