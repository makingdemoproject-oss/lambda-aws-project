import { useState, useEffect } from 'react';

const SF_API = 'https://23jjd14noa.execute-api.ap-south-1.amazonaws.com/prod';

const TARGET_CONFIG = {
  Lambda: { color: '#f59e0b', icon: '⚡', desc: 'Sirf Lambda invoke → DynamoDB' },
  SQS:    { color: '#3b82f6', icon: '📨', desc: 'SQS queue → Lambda consumer → DynamoDB' },
  SNS:    { color: '#8b5cf6', icon: '📣', desc: 'SNS topic → Lambda subscriber → DynamoDB' },
  ECS:    { color: '#10b981', icon: '🐳', desc: 'ECS SQS queue → ECS container polls → DynamoDB' },
  ALL:    { color: '#ef4444', icon: '🔄', desc: 'Parallel: Lambda + SQS + SNS + ECS ek saath' },
};

const STATUS_COLOR = {
  RUNNING:   '#f59e0b',
  SUCCEEDED: '#10b981',
  FAILED:    '#ef4444',
  TIMED_OUT: '#64748b',
};

const STEP_META = {
  ExecutionStarted:         { label: 'START',          color: '#334155' },
  TaskStateEntered:         { label: 'STEP ENTERED',   color: '#1d4ed8' },
  LambdaFunctionScheduled:  { label: 'LAMBDA INVOKE',  color: '#92400e' },
  LambdaFunctionSucceeded:  { label: 'LAMBDA OK',      color: '#065f46' },
  LambdaFunctionFailed:     { label: 'LAMBDA FAIL',    color: '#7f1d1d' },
  TaskStateExited:          { label: 'STEP DONE',      color: '#1d4ed8' },
  ChoiceStateEntered:       { label: 'ROUTING',        color: '#4c1d95' },
  ChoiceStateExited:        { label: 'ROUTE DONE',     color: '#4c1d95' },
  ParallelStateEntered:     { label: 'PARALLEL START', color: '#134e4a' },
  ParallelStateSucceeded:   { label: 'PARALLEL DONE',  color: '#065f46' },
  TaskSucceeded:            { label: 'TASK OK',        color: '#065f46' },
  ExecutionSucceeded:       { label: 'END ✓',          color: '#065f46' },
  ExecutionFailed:          { label: 'END ✗',          color: '#7f1d1d' },
};

const PRODUCTS = ['Laptop Pro', 'Smartphone X12', 'Smart Watch', 'Tablet Air', 'Headphones'];
const EVENT_TYPES = ['OrderCreated', 'PaymentSuccess', 'UserRegistered', 'InventoryLow'];

export default function StepFunctionPage() {
  const [executions, setExecutions] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [steps, setSteps]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [running, setRunning]       = useState(null);
  const [form, setForm]             = useState({ product: 'Laptop Pro', amount: '25000', eventType: 'OrderCreated' });
  const [activeTab, setActiveTab]   = useState('executions');

  const fetchExecutions = async () => {
    try {
      const r = await fetch(`${SF_API}/sf/executions`);
      const d = await r.json();
      setExecutions(d.executions || []);
    } catch { /* silent */ }
  };

  const fetchSteps = async (arn) => {
    setLoading(true);
    try {
      const r = await fetch(`${SF_API}/sf/execution?arn=${encodeURIComponent(arn)}`);
      const d = await r.json();
      setSteps(d.steps || []);
      setSelected(d);
    } catch { /* silent */ }
    setLoading(false);
  };

  const startExecution = async (target) => {
    setRunning(target);
    try {
      const r = await fetch(`${SF_API}/sf/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, ...form }),
      });
      const d = await r.json();
      setActiveTab('executions');
      setTimeout(fetchExecutions, 1500);
      setTimeout(fetchExecutions, 4000);
      setTimeout(fetchExecutions, 8000);
      if (d.executionArn) setTimeout(() => fetchSteps(d.executionArn), 3000);
    } catch { /* silent */ }
    setRunning(null);
  };

  useEffect(() => {
    fetchExecutions();
    const t = setInterval(fetchExecutions, 8000);
    return () => clearInterval(t);
  }, []);

  const card = (style, children) => (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderRadius: 8, padding: 18, ...style }}>
      {children}
    </div>
  );

  const sectionTitle = (text) => (
    <h2 style={{ fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 1 }}>{text}</h2>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif', padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <a href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: 13 }}>&larr; ShopSphere</a>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>
          AWS Step Functions — Order Workflow
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>
          State Machine: ValidateOrder → RouteToTarget → Process(Lambda/SQS/SNS/ECS/ALL) → SaveResult
        </p>

        {/* How Step Functions Work */}
        {card({ marginBottom: 20 },
          <>
            {sectionTitle('Step Functions Kaise Kaam Karta Hai — Is Project Mein')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Flow Diagram */}
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16 }}>
                <div style={{ color: '#475569', fontWeight: 600, fontSize: 11, marginBottom: 12, textTransform: 'uppercase' }}>State Machine Flow</div>
                {[
                  { step: '1', name: 'ValidateOrder',  type: 'Task',   color: '#1d4ed8', desc: 'Lambda: product, amount check karta hai' },
                  { step: '→', name: null },
                  { step: '2', name: 'RouteToTarget',  type: 'Choice', color: '#7c3aed', desc: 'target ke basis par route karta hai' },
                  { step: '→', name: null },
                  { step: '3', name: 'ProcessAll / Single Target', type: 'Task/Parallel', color: '#b45309', desc: 'Lambda / SQS / SNS / ECS / ALL (parallel)' },
                  { step: '→', name: null },
                  { step: '4', name: 'SaveResult',     type: 'Task',   color: '#065f46', desc: 'Lambda: DynamoDB mein result save karta hai' },
                ].map((item, i) =>
                  !item.name ? <div key={i} style={{ textAlign: 'center', color: '#334155', fontSize: 18, margin: '4px 0' }}>↓</div> :
                  <div key={i} style={{ background: '#ffffff', borderRadius: 8, padding: '10px 14px', borderLeft: `3px solid ${item.color}`, marginBottom: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ background: item.color, color: '#fff', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{item.type}</span>
                      <span style={{ color: '#0f172a', fontWeight: 600, fontSize: 12 }}>{item.name}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{item.desc}</div>
                  </div>
                )}
              </div>

              {/* Target Options */}
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16 }}>
                <div style={{ color: '#475569', fontWeight: 600, fontSize: 11, marginBottom: 12, textTransform: 'uppercase' }}>5 Execution Types</div>
                {Object.entries(TARGET_CONFIG).map(([t, cfg]) => (
                  <div key={t} style={{ background: '#ffffff', borderRadius: 8, padding: '10px 12px', marginBottom: 8, borderLeft: `3px solid ${cfg.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ color: cfg.color, fontWeight: 700, fontSize: 12, marginBottom: 3 }}>{cfg.icon} {t}</div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{cfg.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Step Functions over direct call */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14 }}>
              <div style={{ color: '#475569', fontWeight: 600, fontSize: 11, marginBottom: 10, textTransform: 'uppercase' }}>Direct Lambda vs Step Functions — Fark</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 11, marginBottom: 8 }}>❌ Direct Lambda Call (without SF)</div>
                  {['No visual workflow', 'Retry manually likhna padta', 'Error handling hata tedha', 'Steps track nahi hote', 'Parallel chalana mushkil'].map(t => (
                    <div key={t} style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>• {t}</div>
                  ))}
                </div>
                <div>
                  <div style={{ color: '#10b981', fontWeight: 600, fontSize: 11, marginBottom: 8 }}>✅ Step Functions (is project mein)</div>
                  {['AWS Console mein visual graph', 'Automatic retry per step', 'Catch errors → WorkflowFailed state', 'Har execution ka step-by-step log', 'Parallel: ALL target ek click mein'].map(t => (
                    <div key={t} style={{ color: '#475569', fontSize: 11, marginBottom: 4 }}>• {t}</div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Fire Buttons */}
        {card({ marginBottom: 20 },
          <>
            {sectionTitle('Execution Start Karo — Single ya All Together')}

            {/* Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
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
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Event Type</label>
                <select value={form.eventType} onChange={e => setForm({ ...form, eventType: e.target.value })}
                  style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 8px', color: '#0f172a', fontSize: 12 }}>
                  {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Target Buttons */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Single Target — sirf ek service ke through jaaye:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {['Lambda', 'SQS', 'SNS', 'ECS'].map(t => {
                  const cfg = TARGET_CONFIG[t];
                  return (
                    <button key={t} onClick={() => startExecution(t)} disabled={!!running}
                      style={{ background: running === t ? cfg.color : cfg.color + '20', border: `1px solid ${cfg.color}`, borderRadius: 6, padding: '8px 16px', color: running === t ? '#fff' : cfg.color, cursor: running ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 12 }}>
                      {running === t ? 'Starting...' : `${cfg.icon} Run ${t} Only`}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Combined — sabhi 4 services ek saath (Parallel state):</div>
              <button onClick={() => startExecution('ALL')} disabled={!!running}
                style={{ background: running === 'ALL' ? '#ef4444' : '#ef444420', border: '2px solid #ef4444', borderRadius: 6, padding: '10px 24px', color: running === 'ALL' ? '#fff' : '#ef4444', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>
                {running === 'ALL' ? 'Starting...' : '🔄 Run ALL Together (Parallel)'}
              </button>
            </div>
          </>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[['executions', 'Executions List'], ['steps', 'Step Details']].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ background: activeTab === tab ? '#4f46e5' : 'none', border: `1px solid ${activeTab === tab ? '#4f46e5' : '#e2e8f0'}`, borderRadius: 6, padding: '6px 16px', color: activeTab === tab ? '#fff' : '#64748b', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {label}
            </button>
          ))}
          <button onClick={fetchExecutions} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 12px', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>
            Refresh
          </button>
        </div>

        {/* Executions List Tab */}
        {activeTab === 'executions' && card({},
          <>
            {sectionTitle(`All Executions (${executions.length})`)}
            {executions.length === 0 ? (
              <p style={{ color: '#475569', fontSize: 13 }}>Koi execution nahi. Upar se ek target run karo.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      {['Target', 'Status', 'Product', 'Amount', 'OrderId', 'Started', 'Action'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#64748b', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((ex, i) => {
                      const cfg = TARGET_CONFIG[ex.target] || { color: '#64748b', icon: '•' };
                      const sc = STATUS_COLOR[ex.status] || '#64748b';
                      return (
                        <tr key={ex.executionArn || i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                          <td style={{ padding: '7px 10px' }}>
                            <span style={{ background: cfg.color + '25', color: cfg.color, padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                              {cfg.icon} {ex.target}
                            </span>
                          </td>
                          <td style={{ padding: '7px 10px' }}>
                            <span style={{ background: sc + '20', color: sc, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                              {ex.status}
                            </span>
                          </td>
                          <td style={{ padding: '7px 10px', color: '#475569' }}>{ex.product || '-'}</td>
                          <td style={{ padding: '7px 10px', color: '#475569' }}>{ex.amount ? `₹${ex.amount}` : '-'}</td>
                          <td style={{ padding: '7px 10px', color: '#475569', fontSize: 10 }}>{ex.orderId || '-'}</td>
                          <td style={{ padding: '7px 10px', color: '#475569' }}>{ex.startDate ? new Date(ex.startDate).toLocaleTimeString() : '-'}</td>
                          <td style={{ padding: '7px 10px' }}>
                            <button onClick={() => { fetchSteps(ex.executionArn); setActiveTab('steps'); }}
                              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '3px 10px', color: '#475569', cursor: 'pointer', fontSize: 10 }}>
                              View Steps
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Steps Detail Tab */}
        {activeTab === 'steps' && card({},
          <>
            {sectionTitle('Execution Step Details')}
            {!selected && <p style={{ color: '#475569', fontSize: 13 }}>Execution list mein "View Steps" dabao.</p>}
            {loading && <p style={{ color: '#f59e0b', fontSize: 13 }}>Steps load ho rahe hain...</p>}
            {selected && !loading && (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Target', value: selected.input?.target, color: TARGET_CONFIG[selected.input?.target]?.color || '#64748b' },
                    { label: 'Status', value: selected.status, color: STATUS_COLOR[selected.status] || '#64748b' },
                    { label: 'OrderId', value: selected.input?.orderId },
                    { label: 'Product', value: selected.input?.product },
                  ].map(item => (
                    <div key={item.label} style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 14px' }}>
                      <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', marginBottom: 3 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: item.color || '#e2e8f0', fontWeight: 600 }}>{item.value || '-'}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {steps.map((step, i) => {
                    const meta = STEP_META[step.type] || { label: step.type, color: '#334155' };
                    return (
                      <div key={step.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', borderRadius: 6, padding: '8px 12px' }}>
                        <span style={{ fontSize: 10, color: '#475569', minWidth: 24, textAlign: 'right' }}>#{step.id}</span>
                        <span style={{ background: meta.color + '40', color: meta.color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, minWidth: 120, textAlign: 'center' }}>
                          {meta.label}
                        </span>
                        <span style={{ color: '#64748b', fontSize: 11, flex: 1 }}>{step.name || step.type}</span>
                        <span style={{ color: '#475569', fontSize: 10 }}>
                          {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* AWS Resources */}
        {card({ marginTop: 16 },
          <>
            {sectionTitle('AWS Resources — Is Step Functions Setup Mein')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { title: 'State Machine',   value: 'order-workflow-production',        color: '#7c3aed' },
                { title: 'DynamoDB',        value: 'ec2-stepfn-executions-production', color: '#2563eb' },
                { title: 'Validate Lambda', value: 'sf-validate-order-production',     color: '#f59e0b' },
                { title: 'Process Lambda',  value: 'sf-process-lambda-production',     color: '#f59e0b' },
                { title: 'Save Lambda',     value: 'sf-save-result-production',        color: '#f59e0b' },
                { title: 'API Gateway',     value: '23jjd14noa.execute-api.ap-south-1', color: '#10b981' },
              ].map(item => (
                <div key={item.title} style={{ background: '#f8fafc', borderRadius: 6, padding: '10px 12px', borderTop: `2px solid ${item.color}` }}>
                  <div style={{ fontSize: 10, color: '#475569', marginBottom: 3, textTransform: 'uppercase' }}>{item.title}</div>
                  <code style={{ fontSize: 10, color: item.color }}>{item.value}</code>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
