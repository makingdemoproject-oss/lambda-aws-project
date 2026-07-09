import { useState } from 'react';

const APIGW_URL = 'https://6mckcp04v9.execute-api.ap-south-1.amazonaws.com/prod';
const EC2_DIRECT = window.location.protocol === 'https:'
  ? 'https://firstbyrajesh.duckdns.org/api-ec2'
  : 'http://13.200.198.212:3002';

const ROUTES = [
  { no: 1,  method: 'GET',    path: '/health',          auth: false, group: 'Public',   desc: 'Server health check — service status, uptime' },
  { no: 2,  method: 'POST',   path: '/auth/login',      auth: false, group: 'Public',   desc: 'Login → JWT token milta hai (demo123 password)' },
  { no: 3,  method: 'GET',    path: '/orders',          auth: true,  group: 'Orders',   desc: 'Saare orders list karo' },
  { no: 4,  method: 'POST',   path: '/orders',          auth: true,  group: 'Orders',   desc: 'Naya order create karo' },
  { no: 5,  method: 'GET',    path: '/orders/{id}',     auth: true,  group: 'Orders',   desc: 'ID se specific order fetch karo' },
  { no: 6,  method: 'PUT',    path: '/orders/{id}',     auth: true,  group: 'Orders',   desc: 'Order update karo (poora replace)' },
  { no: 7,  method: 'PATCH',  path: '/orders/{id}',     auth: true,  group: 'Orders',   desc: 'Order partial update — sirf status ya qty' },
  { no: 8,  method: 'DELETE', path: '/orders/{id}',     auth: true,  group: 'Orders',   desc: 'Order delete karo' },
  { no: 8,  method: 'GET',    path: '/products',        auth: true,  group: 'Products', desc: 'All products — category filter supported' },
  { no: 9,  method: 'POST',   path: '/products',        auth: true,  group: 'Products', desc: 'Naya product add karo (admin only)' },
  { no: 10, method: 'GET',    path: '/products/{id}',   auth: true,  group: 'Products', desc: 'Single product by ID' },
  { no: 11, method: 'PUT',    path: '/products/{id}',   auth: true,  group: 'Products', desc: 'Product update karo (poora replace, admin only)' },
  { no: 12, method: 'PATCH',  path: '/products/{id}',   auth: true,  group: 'Products', desc: 'Product partial update — sirf price ya stock (admin only)' },
  { no: 13, method: 'DELETE', path: '/products/{id}',   auth: true,  group: 'Products', desc: 'Product delete karo (admin only)' },
  { no: 14, method: 'GET',    path: '/users',           auth: true,  group: 'Users',    desc: 'All users list (admin only)' },
  { no: 15, method: 'POST',   path: '/users',           auth: true,  group: 'Users',    desc: 'Naya user create karo (admin only)' },
  { no: 16, method: 'GET',    path: '/users/{id}',      auth: true,  group: 'Users',    desc: 'User profile by ID' },
];

const METHOD_COLOR = {
  GET:    { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  POST:   { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  PUT:    { bg: '#fef9c3', color: '#a16207', border: '#fde047' },
  PATCH:  { bg: '#f3e8ff', color: '#7c3aed', border: '#d8b4fe' },
  DELETE: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
};

const CONCEPTS = [
  {
    icon: '🌐',
    title: 'API Gateway Kya Hai?',
    color: '#4f46e5',
    body: `AWS API Gateway ek managed service hai jo aapki APIs ka "main gate" hota hai. Jaise bade mall ka security guard — har request pehle yahan aati hai, check hoti hai, tab andar jaati hai.\n\n✅ Automatic scaling\n✅ Rate limiting / throttling\n✅ CORS handle karta hai\n✅ Logs CloudWatch mein\n✅ No server manage karna`,
  },
  {
    icon: '🔐',
    title: 'Lambda Authorizer Kaise Kaam Karta Hai?',
    color: '#7c3aed',
    body: `Jab koi request aati hai:\n\n1. API Gateway request rok leta hai\n2. Lambda Authorizer ko call karta hai\n3. Authorizer JWT token validate karta hai\n4. Agar valid → { isAuthorized: true } return\n5. API Gateway request EC2 ko forward karta hai\n6. Agar invalid → 401 Unauthorized\n\nYe EC2 ko protect karta hai bina EC2 mein auth code likhe.`,
  },
  {
    icon: '🆚',
    title: 'REST API vs HTTP API',
    color: '#0891b2',
    body: `REST API (v1):\n• Zyada features (usage plans, API keys, WAF)\n• Slow + costly ($3.50/million)\n• Complex configuration\n\nHTTP API (v2) — Is Project Mein:\n• Faster (low latency)\n• 70% cheaper ($1/million)\n• Simple routes + Lambda Authorizer\n• Zyada modern approach\n\n👉 New projects mein HTTP API prefer karo.`,
  },
  {
    icon: '🔗',
    title: 'EC2 Integration Without ALB',
    color: '#059669',
    body: `ALB ke bina direct EC2 integration:\n\nAPI Gateway → HTTP_PROXY Integration → EC2 public IP:port\n\nFayda:\n• Simple setup (ALB chahiye nahi)\n• Less cost\n\nNuksan:\n• EC2 restart pe IP change ho sakta hai\n• No health checks\n• Single point of failure\n\nProduction mein ALB prefer karo (auto-scaling, health checks).`,
  },
  {
    icon: '⚡',
    title: 'Request Flow — Step by Step',
    color: '#d97706',
    body: `1. Client: POST /orders { product, qty }\n   + Authorization: Bearer <JWT>\n\n2. API Gateway: Route match karta hai\n   "POST /orders" → AuthorizationType: CUSTOM\n\n3. Lambda Authorizer call hoti hai:\n   JWT verify → { isAuthorized: true }\n\n4. EC2 ko forward:\n   http://EC2_IP:3001/orders\n\n5. Express handler run hota hai\n   → order save → response\n\n6. API Gateway response client ko deta hai`,
  },
  {
    icon: '🛡️',
    title: 'Throttling & Rate Limiting',
    color: '#dc2626',
    body: `Is project mein:\n• Burst limit: 100 req/sec (ek second mein max)\n• Rate limit: 50 req/sec (average)\n\nJab limit exceed ho:\n→ 429 Too Many Requests\n\nKyun important hai:\n• DDoS protection\n• EC2 ko overload se bachata hai\n• Cost control (per-request billing)\n\nPer-route alag throttling bhi set kar sakte ho.`,
  },
];

const PAGE_STYLE = { fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', color: '#0f172a' };
const SECTION = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 };

export default function ApiGatewayPage() {
  const [token, setToken] = useState('');
  const [loginResult, setLoginResult] = useState(null);
  const [testUrl, setTestUrl] = useState(EC2_DIRECT);
  const [tryRoute, setTryRoute] = useState(null);
  const [tryBody, setTryBody] = useState('');
  const [tryResult, setTryResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState('All');

  const login = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${testUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rajan@example.com', password: 'demo123' }),
      });
      const data = await r.json();
      if (data.token) { setToken(data.token); setLoginResult({ ok: true, data }); }
      else setLoginResult({ ok: false, data });
    } catch (e) { setLoginResult({ ok: false, error: e.message }); }
    setLoading(false);
  };

  const runRoute = async (route) => {
    setTryRoute(route);
    setTryResult(null);
    setLoading(true);
    const sampleId = route.group === 'Products' ? 'pro-002' : route.group === 'Users' ? 'user-1' : 'ord-002';
    let url = `${testUrl}${route.path.replace('{id}', sampleId)}`;
    const headers = { 'Content-Type': 'application/json' };
    if (route.auth && token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method: route.method, headers };
    if (route.path === '/auth/login') {
      opts.body = JSON.stringify({ email: 'rajan@example.com', password: 'demo123' });
    } else if (['POST', 'PUT'].includes(route.method) && route.group === 'Orders') {
      opts.body = JSON.stringify({ product: 'Test Item', qty: 1, price: 5000 });
    } else if (route.method === 'PATCH' && route.group === 'Orders') {
      opts.body = JSON.stringify({ status: 'shipped' });
    } else if (['POST', 'PUT'].includes(route.method) && route.group === 'Products') {
      opts.body = JSON.stringify({ name: 'Test Product', category: 'Electronics', price: 9999, stock: 5 });
    } else if (route.method === 'PATCH' && route.group === 'Products') {
      opts.body = JSON.stringify({ price: 49999, stock: 20 });
    } else if (['POST', 'PUT'].includes(route.method) && route.group === 'Users') {
      opts.body = JSON.stringify({ name: 'Test User', email: 'test@example.com', role: 'customer' });
    }
    try {
      const res = await fetch(url, opts);
      const data = await res.json();
      setTryResult({ status: res.status, ok: res.ok, data, url });
    } catch (e) { setTryResult({ status: 0, ok: false, error: e.message, url }); }
    setLoading(false);
  };

  const groups = ['All', 'Public', 'Orders', 'Products', 'Users'];
  const filteredRoutes = activeGroup === 'All' ? ROUTES : ROUTES.filter(r => r.group === activeGroup);

  return (
    <div style={PAGE_STYLE}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)', padding: '28px 32px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 32 }}>🔗</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>AWS API Gateway — Deep Dive</div>
              <div style={{ fontSize: 13, color: '#c7d2fe' }}>HTTP API + Lambda Authorizer + EC2 Backend (15 Routes)</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {['HTTP API v2', 'Lambda Authorizer', 'EC2 Direct Integration', '15 Routes', 'JWT Auth'].map(t => (
              <span key={t} style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>

        {/* Architecture Flow */}
        <div style={SECTION}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1e1b4b' }}>🏗️ Architecture — Request Kaise Flow Hoti Hai</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '8px 0' }}>
            {[
              { icon: '🖥️', label: 'React App', sub: 'Browser', color: '#4f46e5' },
              { arrow: 'POST /orders\n+ JWT Token' },
              { icon: '🔗', label: 'API Gateway', sub: 'HTTP API v2', color: '#0891b2' },
              { arrow: 'Route match\ncheck' },
              { icon: '🔐', label: 'Lambda\nAuthorizer', sub: 'JWT validate', color: '#7c3aed' },
              { arrow: 'isAuthorized\n= true' },
              { icon: '⚙️', label: 'HTTP Proxy\nIntegration', sub: 'to EC2:3002', color: '#d97706' },
              { arrow: 'forward\nrequest' },
              { icon: '🖥️', label: 'EC2 Express', sub: 'order-processing\n:3002', color: '#059669' },
            ].map((item, i) => (
              item.arrow ? (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px', minWidth: 60 }}>
                  <div style={{ fontSize: 18, color: '#94a3b8' }}>→</div>
                  <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', whiteSpace: 'pre' }}>{item.arrow}</div>
                </div>
              ) : (
                <div key={i} style={{ background: '#fff', border: `2px solid ${item.color}20`, borderTop: `3px solid ${item.color}`, borderRadius: 8, padding: '10px 14px', textAlign: 'center', minWidth: 90, boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 20 }}>{item.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', marginTop: 4, whiteSpace: 'pre' }}>{item.label}</div>
                  <div style={{ fontSize: 9, color: '#64748b', marginTop: 2, whiteSpace: 'pre' }}>{item.sub}</div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* ANY vs Specific Methods */}
        <div style={{ ...SECTION, marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#1e1b4b' }}>⚡ ANY vs Specific HTTP Methods — Kya Fark Hai?</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>AWS Console mein jo aapne dekha — POST, PUT, GET, PATCH, DELETE alag alag dikh rahe the. Yeh explain karta hoon:</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* ANY side */}
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16, border: '2px solid #86efac' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d', marginBottom: 10 }}>✅ ANY Method (Is Project Mein)</div>
              <div style={{ fontSize: 11, color: '#334155', marginBottom: 12, lineHeight: 1.7 }}>
                Ek hi integration — sab methods handle kare.<br/>
                API Gateway incoming method dekh ke same method se EC2 ko bhejta hai.
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 11 }}>
                <div style={{ color: '#64748b', marginBottom: 6 }}>CloudFormation mein:</div>
                <div style={{ color: '#059669' }}>IntegrationMethod: ANY</div>
                <div style={{ color: '#059669' }}>IntegrationUri: http://EC2:3002</div>
                <div style={{ color: '#64748b', marginTop: 8 }}>↓ Yeh sab handle karta hai:</div>
                {['GET /orders', 'POST /orders', 'PUT /orders/{id}', 'DELETE /orders/{id}'].map(r => (
                  <div key={r} style={{ color: '#0f172a', marginTop: 2 }}>→ {r}</div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: '#15803d', fontWeight: 600 }}>✅ Simple — 1 integration, sab routes</div>
            </div>

            {/* Specific side */}
            <div style={{ background: '#fef2f2', borderRadius: 10, padding: 16, border: '2px solid #fca5a5' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#dc2626', marginBottom: 10 }}>❌ Specific Methods (Aapne Console Mein Dekha)</div>
              <div style={{ fontSize: 11, color: '#334155', marginBottom: 12, lineHeight: 1.7 }}>
                Har method ke liye alag integration banana padta hai.<br/>
                Isliye console mein 5 alag entries dikh rahe the.
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: 12, fontFamily: 'monospace', fontSize: 11 }}>
                <div style={{ color: '#64748b', marginBottom: 6 }}>5 alag integrations:</div>
                {[
                  { method: 'GET',    color: '#15803d', bg: '#dcfce7' },
                  { method: 'POST',   color: '#1d4ed8', bg: '#dbeafe' },
                  { method: 'PUT',    color: '#a16207', bg: '#fef9c3' },
                  { method: 'PATCH',  color: '#7c3aed', bg: '#f3e8ff' },
                  { method: 'DELETE', color: '#dc2626', bg: '#fee2e2' },
                ].map(m => (
                  <div key={m.method} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ background: m.bg, color: m.color, borderRadius: 3, padding: '1px 6px', fontWeight: 700, fontSize: 10 }}>{m.method}</span>
                    <span style={{ color: '#64748b' }}>→ http://EC2:3002</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: '#dc2626', fontWeight: 600 }}>❌ Complex — 5 integrations, same result</div>
            </div>
          </div>

          {/* How our 15 routes work */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 14, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e1b4b', marginBottom: 10 }}>🔍 Is Project Mein Kaise Kaam Karta Hai — 15 Routes + 1 Integration</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
              {[
                { label: '15 Routes\n(specific methods)', sub: 'GET /orders\nPOST /orders\nDELETE /orders/{id}\n...', color: '#4f46e5' },
                { arrow: 'sab ek hi\nintegration ko\npoint karte hain →' },
                { label: '1 Integration\n(ANY method)', sub: 'IntegrationMethod: ANY\nhttp://EC2:3002', color: '#059669' },
                { arrow: 'same method\nforward →' },
                { label: 'EC2 Express\n:3002', sub: 'app.get("/orders")\napp.post("/orders")\napp.delete("/orders/:id")', color: '#d97706' },
              ].map((item, i) => (
                item.arrow ? (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', whiteSpace: 'pre', lineHeight: 1.5 }}>{item.arrow}</div>
                  </div>
                ) : (
                  <div key={i} style={{ background: '#fff', border: `2px solid ${item.color}30`, borderTop: `3px solid ${item.color}`, borderRadius: 8, padding: '10px 14px', minWidth: 160, flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 11, color: item.color, whiteSpace: 'pre', marginBottom: 6 }}>{item.label}</div>
                    <pre style={{ fontSize: 10, color: '#64748b', margin: 0, whiteSpace: 'pre', fontFamily: 'monospace' }}>{item.sub}</pre>
                  </div>
                )
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#64748b', lineHeight: 1.7 }}>
              <strong>Conclusion:</strong> Route key (GET /orders) sirf <em>matching</em> ke liye hai. Integration ka method (ANY) decide karta hai ki EC2 ko <em>kaise</em> request bhejein. ANY ka matlab — jo method client ne bheja, wohi EC2 ko forward hoga.
            </div>
          </div>
        </div>

        {/* Concepts Grid */}
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#1e1b4b' }}>📚 API Gateway — Deep Knowledge</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
          {CONCEPTS.map((c, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: 20, borderLeft: `4px solid ${c.color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{c.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: c.color }}>{c.title}</span>
              </div>
              <pre style={{ fontFamily: 'inherit', fontSize: 12, color: '#334155', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.7 }}>{c.body}</pre>
            </div>
          ))}
        </div>

        {/* Live Tester */}
        <div style={SECTION}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1e1b4b' }}>🧪 Live Route Tester</div>

          {/* URL selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Test via:</span>
            <button onClick={() => setTestUrl(EC2_DIRECT)}
              style={{ padding: '6px 14px', borderRadius: 6, border: `2px solid ${testUrl === EC2_DIRECT ? '#059669' : '#e2e8f0'}`, background: testUrl === EC2_DIRECT ? '#f0fdf4' : '#fff', color: testUrl === EC2_DIRECT ? '#059669' : '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              EC2 Direct :3001
            </button>
            <button onClick={() => setTestUrl(APIGW_URL)}
              style={{ padding: '6px 14px', borderRadius: 6, border: `2px solid ${testUrl === APIGW_URL ? '#4f46e5' : '#e2e8f0'}`, background: testUrl === APIGW_URL ? '#eef2ff' : '#fff', color: testUrl === APIGW_URL ? '#4f46e5' : '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
              API Gateway (after deploy)
            </button>
          </div>

          {/* Step 1: Login */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 16, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#334155' }}>Step 1 — Login karke JWT token lo</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>email: rajan@example.com | password: demo123</div>
            <button onClick={login} disabled={loading}
              style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Logging in…' : '🔑 Login → Get Token'}
            </button>
            {loginResult && (
              <div style={{ marginTop: 10 }}>
                {loginResult.ok
                  ? <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: 10, fontSize: 12, color: '#15803d' }}>
                      ✅ Token mila! Ab protected routes test kar sakte ho.<br />
                      <code style={{ fontSize: 10, wordBreak: 'break-all', display: 'block', marginTop: 4 }}>{loginResult.data.token?.slice(0, 80)}…</code>
                    </div>
                  : <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: 10, fontSize: 12, color: '#dc2626' }}>
                      ❌ {JSON.stringify(loginResult.error || loginResult.data)}
                    </div>
                }
              </div>
            )}
          </div>

          {/* Group filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {groups.map(g => (
              <button key={g} onClick={() => setActiveGroup(g)}
                style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${activeGroup === g ? '#4f46e5' : '#e2e8f0'}`, background: activeGroup === g ? '#4f46e5' : '#fff', color: activeGroup === g ? '#fff' : '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                {g}
              </button>
            ))}
          </div>

          {/* Routes table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['#', 'Method', 'Path', 'Auth', 'Description', 'Try'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 11, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((r) => {
                  const mc = METHOD_COLOR[r.method];
                  return (
                    <tr key={r.no} style={{ borderBottom: '1px solid #f1f5f9', background: tryRoute?.no === r.no ? '#faf5ff' : '#fff' }}>
                      <td style={{ padding: '8px 12px', color: '#94a3b8', fontWeight: 600 }}>{r.no}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ background: mc.bg, color: mc.color, border: `1px solid ${mc.border}`, borderRadius: 4, padding: '2px 8px', fontWeight: 700, fontSize: 10 }}>{r.method}</span>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#1e1b4b', fontWeight: 600 }}>{r.path}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {r.auth
                          ? <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>🔐 JWT</span>
                          : <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>✅ Public</span>
                        }
                      </td>
                      <td style={{ padding: '8px 12px', color: '#475569' }}>{r.desc}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {r.path === '/auth/login'
                          ? <span style={{ fontSize: 10, color: '#94a3b8' }}>↑ Step 1</span>
                          : <button onClick={() => runRoute(r)} disabled={loading}
                              style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#4f46e5' }}>
                              ▶ Run
                            </button>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Try Result */}
          {tryResult && (
            <div style={{ marginTop: 16, background: tryResult.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${tryResult.ok ? '#86efac' : '#fca5a5'}`, borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: tryResult.ok ? '#15803d' : '#dc2626' }}>
                  {tryResult.ok ? '✅' : '❌'} HTTP {tryResult.status}
                </span>
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{tryResult.url}</span>
              </div>
              <pre style={{ fontFamily: 'monospace', fontSize: 11, margin: 0, color: '#334155', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', background: '#fff', padding: 10, borderRadius: 6 }}>
                {JSON.stringify(tryResult.data || tryResult.error, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Lambda Authorizer Flow */}
        <div style={SECTION}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1e1b4b' }}>🔐 Lambda Authorizer — Internal Flow</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { step: '1', title: 'Request Aati Hai', desc: 'Client POST /orders + Authorization: Bearer eyJ...', color: '#4f46e5' },
              { step: '2', title: 'API GW Rokti Hai', desc: 'Route mein AuthorizationType: CUSTOM set hai', color: '#7c3aed' },
              { step: '3', title: 'Authorizer Call', desc: 'Lambda function invoke hoti hai with headers', color: '#0891b2' },
              { step: '4', title: 'JWT Verify', desc: 'jwt.verify(token, SECRET) → decoded payload', color: '#d97706' },
              { step: '5', title: 'Allow/Deny', desc: '{ isAuthorized: true/false, context: {...} }', color: '#059669' },
              { step: '6', title: 'EC2 Forward', desc: 'Agar allowed → request EC2 Express ko jati hai', color: '#dc2626' },
            ].map((s) => (
              <div key={s.step} style={{ background: '#fff', border: `1px solid ${s.color}30`, borderRadius: 8, padding: 14, borderTop: `3px solid ${s.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ background: s.color, color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.step}</span>
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>{s.title}</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Deploy Instructions */}
        <div style={SECTION}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1e1b4b' }}>🚀 Deploy Kaise Karein</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#059669', marginBottom: 8 }}>Step 1 — EC2 Par Backend Deploy</div>
              <pre style={{ background: '#f1f5f9', borderRadius: 6, padding: 12, fontSize: 11, color: '#334155', margin: 0, overflowX: 'auto' }}>
{`# SSH mein:
cd /home/ec2-user/services
mkdir order-processing && cd order-processing
# Files upload karo (S3 se ya SCP se)
npm install
node server.js &

# Port 3001 open karo Security Group mein`}
              </pre>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#4f46e5', marginBottom: 8 }}>Step 2 — CloudFormation Deploy</div>
              <pre style={{ background: '#f1f5f9', borderRadius: 6, padding: 12, fontSize: 11, color: '#334155', margin: 0, overflowX: 'auto' }}>
{`aws cloudformation deploy \\
  --template-file cloudformation.yaml \\
  --stack-name api-gateway-ec2-production \\
  --capabilities CAPABILITY_NAMED_IAM \\
  --parameter-overrides \\
    Ec2PublicIp=13.200.198.212 \\
    BackendPort=3001`}
              </pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
