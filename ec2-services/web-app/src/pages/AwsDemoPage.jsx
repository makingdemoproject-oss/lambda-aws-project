import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tokens } from '../utils/tokens.js';

/* ── Constants ─────────────────────────────────────────────────────── */
const COGNITO_API_GW = 'https://wxv12mu6bg.execute-api.ap-south-1.amazonaws.com/production';
const LAMBDA_API_GW  = 'https://ixthoe12fe.execute-api.ap-south-1.amazonaws.com/prod';
const COGNITO_URL    = 'https://cognito-idp.ap-south-1.amazonaws.com/';
const COGNITO_CLIENT = '20qlu1pvf3ev7a3hpl3l41dbrp';

/* ── Route definitions ──────────────────────────────────────────────── */
const LAMBDA_ROUTES = [
  { label: 'health',         method: 'GET',  path: '/health',         auth: false, tag: 'public',    flow: 'Browser → API GW → Lambda fn → RDS (SELECT 1)', code: 'health.js' },
  { label: 'auth/register',  method: 'POST', path: '/auth/register',  auth: false, tag: 'public',    flow: 'Browser → API GW → Lambda fn → RDS (INSERT lambda_users)', code: 'register.js', body: '{"email":"x@y.com","password":"Pass@123","name":"Test"}' },
  { label: 'auth/login',     method: 'POST', path: '/auth/login',     auth: false, tag: 'public',    flow: 'Browser → API GW → Lambda fn → RDS (SELECT + bcrypt) → JWT', code: 'login.js', body: '{"email":"test@lambda.com","password":"Test@12345"}' },
  { label: 'auth/me',        method: 'GET',  path: '/auth/me',        auth: true,  tag: 'protected', flow: 'Browser → API GW → Lambda Authorizer (JWT verify) → Lambda fn → RDS (SELECT lambda_users)', code: 'me.js' },
  { label: 'pincodes (add)', method: 'POST', path: '/pincodes',       auth: true,  tag: 'protected', flow: 'Browser → API GW → Lambda Authorizer (JWT verify) → Lambda fn → RDS (INSERT pincodes)', code: 'pincodes.js', body: '{"pincode":"110001","city":"New Delhi","state":"Delhi"}' },
  { label: 'pincodes (list)',method: 'GET',  path: '/pincodes',       auth: true,  tag: 'protected', flow: 'Browser → API GW → Lambda Authorizer (JWT verify) → Lambda fn → RDS (SELECT pincodes JOIN lambda_users)', code: 'pincodes.js' },
  { label: 'ec2/products',   method: 'GET',  path: '/ec2/products',   auth: true,  tag: 'ec2-proxy', flow: 'Browser → API GW → Lambda Authorizer (JWT verify) → ALB → EC2-1:3001 (Express)', code: 'cloudformation.yaml (HTTP_PROXY integration)' },
];

const EC1_ROUTES = [
  { label: 'products',      method: 'GET', path: '/api/app/products' },
  { label: 'users',         method: 'GET', path: '/api/app/users' },
  { label: 'payments',      method: 'GET', path: '/api/app/payments' },
  { label: 'inventory',     method: 'GET', path: '/api/app/inventory' },
  { label: 'notifications', method: 'GET', path: '/api/app/notifications' },
];

const EC2_ROUTES = [
  { label: 'health',   method: 'GET', path: '/api/v1/health', noAuth: true },
  { label: 'auth/me',  method: 'GET', path: '/api/v1/auth/me' },
];

const EC3_ROUTES = [
  { label: 'orders',           method: 'GET', path: '/api/orders/orders' },
  { label: 'shipping',         method: 'GET', path: '/api/orders/shipping' },
  { label: 'warehouse',        method: 'GET', path: '/api/orders/warehouse' },
  { label: 'dispatch',         method: 'GET', path: '/api/orders/dispatch' },
  { label: 'tracking/history', method: 'GET', path: '/api/orders/tracking/history' },
];

/* ── Code snippets for flow modal ───────────────────────────────────── */
const CODE_MAP = {
  'authorizer.js': `// Lambda Authorizer — HTTP API REQUEST type
exports.handler = async (event) => {
  const raw = event.identitySource; // array from API GW
  const authHeader = Array.isArray(raw) ? raw[0] : raw;
  if (!authHeader) return { isAuthorized: false };

  const token = authHeader.replace(/^Bearer\\s+/i, '').trim();
  try {
    const decoded = verify(token); // jsonwebtoken
    return {
      isAuthorized: true,
      context: { userId: String(decoded.userId), email: decoded.email },
    };
  } catch { return { isAuthorized: false }; }
};`,

  'pincodes.js': `// POST /pincodes — protected by Lambda Authorizer
exports.handler = async (event) => {
  // userId injected by Lambda Authorizer context
  const userId = event.requestContext?.authorizer?.lambda?.userId;
  const { pincode, city, state } = JSON.parse(event.body || '{}');

  const result = await pool.query(
    'INSERT INTO pincodes(pincode, city, state, created_by) VALUES($1,$2,$3,$4) RETURNING *',
    [pincode, city, state, userId]
  );
  return { statusCode: 201, body: JSON.stringify({ success: true, data: result.rows[0] }) };
};`,

  'me.js': `// GET /auth/me — protected by Lambda Authorizer
exports.handler = async (event) => {
  const userId = event.requestContext?.authorizer?.lambda?.userId;
  const result = await pool.query(
    'SELECT id, email, name, created_at FROM lambda_users WHERE id = $1',
    [userId]
  );
  return { statusCode: 200, body: JSON.stringify({ success: true, data: result.rows[0] }) };
};`,

  'health.js': `// GET /health — public, tests RDS connectivity
exports.handler = async () => {
  await pool.query('SELECT 1'); // ping RDS
  return { statusCode: 200, body: JSON.stringify({
    success: true, service: 'lambda-auth-rds', db: 'ok'
  })};
};`,

  'register.js': `// POST /auth/register — public
exports.handler = async (event) => {
  const { email, password, name } = JSON.parse(event.body);
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO lambda_users(email, name, password_hash) VALUES($1,$2,$3) RETURNING id,email,name',
    [email, name, hash]
  );
  const token = jwt.sign({ userId: result.rows[0].id, email }, JWT_SECRET);
  return { statusCode: 201, body: JSON.stringify({ success: true, data: { user: result.rows[0], accessToken: token } }) };
};`,

  'login.js': `// POST /auth/login — public
exports.handler = async (event) => {
  const { email, password } = JSON.parse(event.body);
  const result = await pool.query('SELECT * FROM lambda_users WHERE email=$1', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return { statusCode: 401, body: JSON.stringify({ success: false, message: 'Invalid credentials' }) };
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET);
  return { statusCode: 200, body: JSON.stringify({ success: true, data: { accessToken: token } }) };
};`,

  'cloudformation.yaml (HTTP_PROXY integration)': `# Lambda Authorizer → ALB → EC2 (HTTP_PROXY)
Ec2ProductsIntegration:
  Type: AWS::ApiGatewayV2::Integration
  Properties:
    ApiId: !Ref HttpApi
    IntegrationType: HTTP_PROXY        # forward to HTTP URL
    IntegrationMethod: GET
    IntegrationUri: http://<ALB-DNS>/api/app/products
    PayloadFormatVersion: '1.0'

Ec2ProductsRoute:
  Type: AWS::ApiGatewayV2::Route
  Properties:
    RouteKey: GET /ec2/products
    AuthorizationType: CUSTOM          # <-- Lambda Authorizer
    AuthorizerId: !Ref LambdaAuthorizer
    Target: !Sub integrations/\${Ec2ProductsIntegration}`,
};

/* ── Cognito helper ─────────────────────────────────────────────────── */
async function cognitoCustomAuth(email, password) {
  const init = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
    body: JSON.stringify({ AuthFlow: 'CUSTOM_AUTH', ClientId: COGNITO_CLIENT, AuthParameters: { USERNAME: email } }),
  });
  const d = await init.json();
  if (!d.Session) throw new Error(d.message || 'InitiateAuth failed');
  const resp = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge' },
    body: JSON.stringify({ ChallengeName: 'CUSTOM_CHALLENGE', ClientId: COGNITO_CLIENT, Session: d.Session, ChallengeResponses: { USERNAME: email, ANSWER: JSON.stringify({ email, password }) } }),
  });
  const r = await resp.json();
  if (!r.AuthenticationResult) throw new Error(r.message || 'Auth failed');
  return r.AuthenticationResult.AccessToken;
}

/* ── Styles ─────────────────────────────────────────────────────────── */
const C = {
  bg:        '#060b18',
  panel:     '#0a0f1e',
  card:      '#0f1629',
  border:    '#1e293b',
  purple:    '#7c3aed',
  purpleL:   '#a78bfa',
  blue:      '#1d4ed8',
  blueL:     '#60a5fa',
  amber:     '#b45309',
  amberL:    '#fbbf24',
  green:     '#15803d',
  greenL:    '#4ade80',
  teal:      '#0d9488',
  tealL:     '#2dd4bf',
  red:       '#ef4444',
  muted:     '#475569',
  text:      '#e2e8f0',
  sub:       '#94a3b8',
};

const tagStyle = (tag) => {
  const map = { public: { bg: '#052e16', color: '#4ade80', border: '#15803d' }, protected: { bg: '#2e1065', color: '#c4b5fd', border: '#7c3aed' }, 'ec2-proxy': { bg: '#0c1f3f', color: '#93c5fd', border: '#1d4ed8' } };
  const s = map[tag] || map.public;
  return { background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700 };
};

const btn = (color, bg) => ({
  width: '100%', padding: '6px 8px', background: bg, border: `1px solid ${color}`,
  borderRadius: 4, color: color, fontSize: 12, cursor: 'pointer', textAlign: 'left',
  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
});

const inputStyle = {
  width: '100%', padding: '6px 8px', background: '#060b18', border: `1px solid ${C.border}`,
  borderRadius: 4, color: C.text, fontSize: 12, marginBottom: 5,
};

/* ── Flow Card component ────────────────────────────────────────────── */
function FlowCard({ route, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, maxWidth: 700, width: '90%', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <span style={{ ...tagStyle(route.tag), fontSize: 11 }}>{route.tag}</span>
            <span style={{ marginLeft: 8, color: C.text, fontWeight: 700, fontSize: 14 }}>{route.method} {route.path}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Flow diagram */}
        <div style={{ background: '#020816', border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Request Flow</div>
          <div style={{ color: C.tealL, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 }}>
            {route.flow.split(' → ').map((step, i, arr) => (
              <span key={i}>
                <span style={{
                  background: i === 0 ? '#0c1f3f' : step.includes('Authorizer') ? '#2e1065' : step.includes('RDS') ? '#052e16' : step.includes('ALB') || step.includes('EC2') ? '#1c1f0a' : '#0f1629',
                  color: i === 0 ? C.blueL : step.includes('Authorizer') ? C.purpleL : step.includes('RDS') ? C.greenL : step.includes('ALB') || step.includes('EC2') ? C.amberL : C.tealL,
                  padding: '2px 8px', borderRadius: 3, fontWeight: 600,
                }}>{step}</span>
                {i < arr.length - 1 && <span style={{ color: C.muted, margin: '0 4px' }}>→</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Lambda Authorizer explanation if protected */}
        {route.auth && (
          <div style={{ background: '#1a0b2e', border: `1px solid ${C.purple}`, borderRadius: 6, padding: 10, marginBottom: 14 }}>
            <div style={{ color: C.purpleL, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Lambda Authorizer kya karta hai?</div>
            <div style={{ color: C.sub, fontSize: 12, lineHeight: 1.6 }}>
              1. API Gateway request intercept karta hai<br />
              2. <code style={{ color: C.purpleL }}>Authorization: Bearer &lt;token&gt;</code> header extract karta hai<br />
              3. Lambda Authorizer function invoke karta hai<br />
              4. Function JWT verify karta hai → <code style={{ color: C.greenL }}>isAuthorized: true/false</code><br />
              5. Agar true → userId context ke saath next Lambda call hota hai<br />
              6. Agar false → API GW directly 401 Unauthorized return karta hai
            </div>
          </div>
        )}

        {/* Code snippet */}
        <div style={{ background: '#020816', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '6px 12px', background: '#0a0f1e', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Code:</span>
            <span style={{ fontSize: 11, color: C.blueL, fontFamily: 'monospace' }}>{route.code}</span>
          </div>
          <pre style={{ margin: 0, padding: 12, color: '#7dd3fc', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {CODE_MAP[route.code] || `// Code: ${route.code}`}
          </pre>
        </div>

        {/* Also show authorizer code if protected */}
        {route.auth && (
          <div style={{ background: '#020816', border: `1px solid ${C.purple}44`, borderRadius: 6, overflow: 'hidden', marginTop: 10 }}>
            <div style={{ padding: '6px 12px', background: '#0a0f1e', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Authorizer Code:</span>
              <span style={{ fontSize: 11, color: C.purpleL, fontFamily: 'monospace' }}>authorizer.js</span>
            </div>
            <pre style={{ margin: 0, padding: 12, color: '#c4b5fd', fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              {CODE_MAP['authorizer.js']}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function AwsDemoPage() {
  const [tab, setTab]               = useState('lambda');
  const [flowRoute, setFlowRoute]   = useState(null);

  // Lambda auth state
  const [lambdaEmail, setLambdaEmail]       = useState('test@lambda.com');
  const [lambdaPassword, setLambdaPassword] = useState('Test@12345');
  const [lambdaJwt, setLambdaJwt]           = useState('');
  const [lambdaStatus, setLambdaStatus]     = useState('idle');

  // Cognito auth state
  const [cogEmail, setCogEmail]     = useState('demo@test.com');
  const [cogPassword, setCogPassword] = useState('');
  const [cogJwt, setCogJwt]         = useState('');
  const [cogStatus, setCogStatus]   = useState('idle');

  // EC2 RBAC
  const [rbacEmail, setRbacEmail]     = useState('demo@test.com');
  const [rbacPassword, setRbacPassword] = useState('');
  const [rbacJwt, setRbacJwt]         = useState(tokens.access() || '');
  const [rbacStatus, setRbacStatus]   = useState(tokens.access() ? 'ok' : 'idle');

  const [logs, setLogs] = useState([]);

  const addLog = (src, status, path, data) => {
    setLogs((p) => [{ id: Date.now(), src, status, path, data, ts: new Date().toLocaleTimeString() }, ...p]);
  };

  /* ── Lambda handlers ── */
  const lambdaLogin = async () => {
    setLambdaStatus('loading');
    try {
      const r = await fetch(LAMBDA_API_GW + '/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lambdaEmail, password: lambdaPassword }),
      });
      const d = await r.json();
      if (!d.data?.accessToken) throw new Error(d.message || 'Login failed');
      setLambdaJwt(d.data.accessToken);
      setLambdaStatus('ok');
      addLog('LAMBDA', r.status, '/auth/login', d);
    } catch (e) { setLambdaStatus('err'); addLog('LAMBDA', 'ERR', '/auth/login', { error: e.message }); }
  };

  const callLambda = async (route) => {
    if (route.auth && !lambdaJwt) { alert('Pehle Lambda Login karo'); return; }
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (route.auth) headers.Authorization = 'Bearer ' + lambdaJwt;
      const r = await fetch(LAMBDA_API_GW + route.path, {
        method: route.method,
        headers,
        ...(route.body ? { body: route.body } : {}),
      });
      const d = await r.json();
      addLog(route.tag === 'ec2-proxy' ? 'LAMBDA→EC2' : 'LAMBDA', r.status, route.path, d);
    } catch (e) { addLog('LAMBDA', 'ERR', route.path, { error: e.message }); }
  };

  /* ── Cognito handlers ── */
  const cogLogin = async () => {
    setCogStatus('loading');
    try {
      const token = await cognitoCustomAuth(cogEmail, cogPassword);
      setCogJwt(token);
      setCogStatus('ok');
      addLog('COGNITO', 200, 'Cognito CUSTOM_AUTH', { preview: token.slice(0, 40) + '...' });
    } catch (e) { setCogStatus('err'); addLog('COGNITO', 'ERR', 'Cognito CUSTOM_AUTH', { error: e.message }); }
  };

  const callEc1Ec3 = async (route) => {
    if (!cogJwt) { alert('Pehle Cognito login karo'); return; }
    try {
      const r = await fetch(COGNITO_API_GW + route.path, { method: route.method, headers: { Authorization: 'Bearer ' + cogJwt, 'Content-Type': 'application/json' } });
      const d = await r.json();
      addLog(route.path.startsWith('/api/app') ? 'EC1' : 'EC3', r.status, route.path, d);
    } catch (e) { addLog(route.path.startsWith('/api/app') ? 'EC1' : 'EC3', 'ERR', route.path, { error: e.message }); }
  };

  const rbacLogin = async () => {
    setRbacStatus('loading');
    try {
      const r = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: rbacEmail, password: rbacPassword }) });
      const d = await r.json();
      const tk = d?.data?.accessToken;
      if (!tk) throw new Error(d?.message || 'Login failed');
      setRbacJwt(tk); tokens.set(tk, d?.data?.refreshToken); setRbacStatus('ok');
      addLog('EC2', 200, 'RBAC Login', { preview: tk.slice(0, 40) + '...' });
    } catch (e) { setRbacStatus('err'); addLog('EC2', 'ERR', 'RBAC Login', { error: e.message }); }
  };

  const callEc2 = async (route) => {
    if (!route.noAuth && !rbacJwt) { alert('Pehle EC2 RBAC login karo'); return; }
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (!route.noAuth && rbacJwt) headers.Authorization = 'Bearer ' + rbacJwt;
      const r = await fetch(route.path, { method: route.method, headers });
      const d = await r.json();
      addLog('EC2', r.status, route.path, d);
    } catch (e) { addLog('EC2', 'ERR', route.path, { error: e.message }); }
  };

  const runAllLambda = async () => {
    for (const r of LAMBDA_ROUTES) await callLambda(r);
  };

  const runAllCognito = async () => {
    if (!cogJwt) { alert('Pehle Cognito login karo'); return; }
    for (const r of EC1_ROUTES) await callEc1Ec3(r);
    for (const r of EC2_ROUTES) await callEc2(r);
    for (const r of EC3_ROUTES) await callEc1Ec3(r);
  };

  const srcColors = { LAMBDA: C.purpleL, 'LAMBDA→EC2': C.tealL, COGNITO: C.purpleL, EC1: C.blueL, EC2: C.amberL, EC3: C.greenL };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Segoe UI', sans-serif", fontSize: 14 }}>

      {/* Top header */}
      <div style={{ background: '#070d1f', padding: '0 20px', borderBottom: `2px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 0, height: 48 }}>
        <span style={{ color: C.blueL, fontWeight: 800, fontSize: 15, marginRight: 24 }}>AWS Demo</span>

        {/* Tabs */}
        {[
          { id: 'lambda',  label: 'Lambda Authorizer',  desc: 'New API · RDS',     color: C.purpleL },
          { id: 'cognito', label: 'Cognito Authorizer',  desc: 'EC1 / EC2 / EC3',  color: C.blueL },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 18px', height: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
            color: tab === t.id ? t.color : C.muted, gap: 2,
          }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{t.label}</span>
            <span style={{ fontSize: 10 }}>{t.desc}</span>
          </button>
        ))}

        <Link to="/" style={{ marginLeft: 'auto', color: C.muted, fontSize: 12 }}>← Back</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: 'calc(100vh - 48px)' }}>

        {/* Left panel */}
        <div style={{ padding: 12, overflowY: 'auto', borderRight: `1px solid ${C.border}`, background: C.panel, display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* ═══════════ LAMBDA TAB ═══════════ */}
          {tab === 'lambda' && (<>

            {/* Architecture card */}
            <div style={{ background: '#0d0a1f', border: `1px solid ${C.purple}55`, borderRadius: 8, padding: 10 }}>
              <div style={{ color: C.purpleL, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Architecture</div>
              <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.9, fontFamily: 'monospace' }}>
                <span style={{ color: C.blueL }}>Browser</span>
                <span style={{ color: C.muted }}> → </span>
                <span style={{ color: '#f59e0b' }}>HTTP API Gateway</span>
                <br />
                <span style={{ color: C.muted }}>   ↓ Authorization header</span>
                <br />
                <span style={{ color: C.purpleL }}>   Lambda Authorizer</span>
                <span style={{ color: C.muted }}> (JWT verify)</span>
                <br />
                <span style={{ color: C.muted }}>   ↓ isAuthorized + context</span>
                <br />
                <span style={{ color: C.greenL }}>   Lambda fn</span>
                <span style={{ color: C.muted }}> → </span>
                <span style={{ color: C.tealL }}>RDS PostgreSQL</span>
                <br />
                <span style={{ color: C.muted }}>   or</span>
                <br />
                <span style={{ color: C.greenL }}>   Lambda fn</span>
                <span style={{ color: C.muted }}> → </span>
                <span style={{ color: C.blueL }}>ALB</span>
                <span style={{ color: C.muted }}> → </span>
                <span style={{ color: C.amberL }}>EC2-1</span>
              </div>
            </div>

            {/* Login form */}
            <div style={{ background: C.card, border: `1px solid ${C.purple}44`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.purpleL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Lambda Auth — Login
                <span style={{ float: 'right', fontWeight: 400, color: C.muted, fontSize: 10 }}>POST /auth/login</span>
              </div>
              <input value={lambdaEmail} onChange={e => setLambdaEmail(e.target.value)} placeholder="Email" style={inputStyle} />
              <input type="password" value={lambdaPassword} onChange={e => setLambdaPassword(e.target.value)} placeholder="Password" style={inputStyle} />
              <button onClick={lambdaLogin} disabled={lambdaStatus === 'loading'}
                style={{ width: '100%', padding: '7px 0', background: C.purple, border: 'none', borderRadius: 5, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                {lambdaStatus === 'loading' ? 'Logging in...' : 'Login with Lambda JWT'}
              </button>
              <div style={{ marginTop: 5, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: { idle: C.muted, loading: '#f59e0b', ok: C.greenL, err: C.red }[lambdaStatus], display: 'inline-block' }} />
                <span style={{ color: C.muted }}>{{ idle: 'Not logged in', loading: 'Logging in...', ok: 'Logged in', err: 'Login failed' }[lambdaStatus]}</span>
                {lambdaJwt && <span style={{ color: '#334155', fontSize: 10 }}>{lambdaJwt.slice(0, 16)}…</span>}
              </div>
            </div>

            {/* Routes */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.text, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Routes
                <span style={{ float: 'right', color: C.muted, fontWeight: 400, fontSize: 10 }}>click ? for flow+code</span>
              </div>
              {LAMBDA_ROUTES.map((r) => (
                <div key={r.method + r.path + r.label} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <button onClick={() => callLambda(r)} style={btn(
                    r.tag === 'protected' ? C.purpleL : r.tag === 'ec2-proxy' ? C.tealL : C.greenL,
                    r.tag === 'protected' ? '#1a0b2e' : r.tag === 'ec2-proxy' ? '#021a17' : '#052e16',
                  )}>
                    <span style={{ color: C.muted, fontSize: 10, minWidth: 32 }}>{r.method}</span>
                    <span style={{ flex: 1, fontFamily: 'monospace' }}>{r.path}</span>
                    <span style={tagStyle(r.tag)}>{r.tag}</span>
                  </button>
                  <button onClick={() => setFlowRoute(r)} title="Show flow + code"
                    style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: '#1e293b', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</button>
                </div>
              ))}
            </div>

            <button onClick={runAllLambda}
              style={{ padding: '8px 0', background: lambdaJwt ? '#1a0b2e' : '#0d0d1a', border: `1px solid ${lambdaJwt ? C.purple : C.border}`, borderRadius: 5, color: lambdaJwt ? C.purpleL : C.muted, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              Run All Lambda Routes
            </button>
          </>)}

          {/* ═══════════ COGNITO TAB ═══════════ */}
          {tab === 'cognito' && (<>

            {/* Architecture card */}
            <div style={{ background: '#030c1f', border: `1px solid ${C.blue}44`, borderRadius: 8, padding: 10 }}>
              <div style={{ color: C.blueL, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Architecture</div>
              <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.9, fontFamily: 'monospace' }}>
                <span style={{ color: C.blueL }}>Browser</span>
                <span style={{ color: C.muted }}> → </span>
                <span style={{ color: '#f59e0b' }}>HTTP API Gateway</span>
                <br />
                <span style={{ color: C.muted }}>   ↓ Cognito JWT Authorizer</span>
                <br />
                <span style={{ color: C.purpleL }}>   Cognito User Pool</span>
                <span style={{ color: C.muted }}> (token verify)</span>
                <br />
                <span style={{ color: C.muted }}>   ↓ forward</span>
                <br />
                <span style={{ color: '#f59e0b' }}>   ALB</span>
                <span style={{ color: C.muted }}> → path-based routing</span>
                <br />
                <span style={{ color: C.blueL }}>   /api/app/*</span><span style={{ color: C.muted }}> → </span><span style={{ color: C.blueL }}>EC1:3001</span>
                <br />
                <span style={{ color: C.amberL }}>   /api/v1/*</span><span style={{ color: C.muted }}> → </span><span style={{ color: C.amberL }}>EC2:80</span><span style={{ color: C.muted }}> (nginx→4000)</span>
                <br />
                <span style={{ color: C.greenL }}>   /api/orders/*</span><span style={{ color: C.muted }}> → </span><span style={{ color: C.greenL }}>EC3:3002</span>
              </div>
            </div>

            {/* Cognito Login */}
            <div style={{ background: C.card, border: `1px solid ${C.blue}44`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.blueL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Cognito Login (EC1 + EC3)</div>
              <input value={cogEmail} onChange={e => setCogEmail(e.target.value)} placeholder="Email" style={inputStyle} />
              <input type="password" value={cogPassword} onChange={e => setCogPassword(e.target.value)} placeholder="Password" style={inputStyle} />
              <button onClick={cogLogin} disabled={cogStatus === 'loading'}
                style={{ width: '100%', padding: '7px 0', background: C.blue, border: 'none', borderRadius: 5, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
                {cogStatus === 'loading' ? 'Logging in...' : 'Login with Cognito'}
              </button>
              <div style={{ marginTop: 5, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: { idle: C.muted, loading: '#f59e0b', ok: C.greenL, err: C.red }[cogStatus], display: 'inline-block' }} />
                <span style={{ color: C.muted }}>{{ idle: 'Not logged in', loading: '...', ok: 'Logged in', err: 'Failed' }[cogStatus]}</span>
              </div>
            </div>

            {/* EC1 */}
            <div style={{ background: C.card, border: `1px solid ${C.blue}44`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.blueL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>EC1 — Products (/api/app/*)</div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>Cognito JWT → API GW → ALB → EC2-1:3001</div>
              {EC1_ROUTES.map((r) => (
                <button key={r.path} onClick={() => callEc1Ec3(r)} style={btn(C.blueL, '#0c1f3f')}>
                  <span style={{ color: C.muted, fontSize: 10 }}>GET</span>
                  <span style={{ fontFamily: 'monospace' }}>/api/app/<b>{r.label}</b></span>
                </button>
              ))}
            </div>

            {/* EC2 */}
            <div style={{ background: C.card, border: `1px solid ${C.amber}44`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.amberL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>EC2 — RBAC (/api/v1/*)</div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>Same-origin → nginx:80 → Node:4000 (bypasses API GW)</div>
              <input value={rbacEmail} onChange={e => setRbacEmail(e.target.value)} style={{ ...inputStyle, marginBottom: 4 }} />
              <input type="password" value={rbacPassword} onChange={e => setRbacPassword(e.target.value)} placeholder="RBAC password" style={{ ...inputStyle, marginBottom: 6 }} />
              <button onClick={rbacLogin} disabled={rbacStatus === 'loading'}
                style={{ width: '100%', padding: '6px 0', background: C.amber, border: 'none', borderRadius: 4, color: '#fde68a', fontWeight: 700, cursor: 'pointer', fontSize: 11, marginBottom: 6 }}>
                {rbacStatus === 'loading' ? '...' : rbacStatus === 'ok' ? 'RBAC Logged In' : 'Login RBAC'}
              </button>
              {EC2_ROUTES.map((r) => (
                <button key={r.path} onClick={() => callEc2(r)} style={btn(C.amberL, '#1c1100')}>
                  <span style={{ color: C.muted, fontSize: 10 }}>{r.method}</span>
                  <span style={{ fontFamily: 'monospace' }}>/api/v1/<b>{r.label}</b></span>
                  {r.noAuth && <span style={{ fontSize: 10, color: C.muted }}>(no auth)</span>}
                </button>
              ))}
            </div>

            {/* EC3 */}
            <div style={{ background: C.card, border: `1px solid ${C.green}44`, borderRadius: 8, padding: 12 }}>
              <div style={{ color: C.greenL, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>EC3 — Orders (/api/orders/*)</div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>Cognito JWT → API GW → ALB → EC2-3:3002</div>
              {EC3_ROUTES.map((r) => (
                <button key={r.path} onClick={() => callEc1Ec3(r)} style={btn(C.greenL, '#071f0f')}>
                  <span style={{ color: C.muted, fontSize: 10 }}>GET</span>
                  <span style={{ fontFamily: 'monospace' }}>/api/orders/<b>{r.label}</b></span>
                </button>
              ))}
            </div>

            <button onClick={runAllCognito}
              style={{ padding: '8px 0', background: cogJwt ? '#0c1f3f' : '#0a0f1e', border: `1px solid ${cogJwt ? C.blue : C.border}`, borderRadius: 5, color: cogJwt ? C.blueL : C.muted, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              Run All (EC1 + EC2 + EC3)
            </button>
          </>)}

          {/* Download + Clear */}
          {logs.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => {
                const out = { generatedAt: new Date().toISOString(), results: [...logs].reverse().map(l => ({ src: l.src, status: l.status, path: l.path, time: l.ts, response: l.data })) };
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
                a.download = `aws-demo-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`; a.click();
              }} style={{ flex: 1, padding: '6px 0', background: '#0c1f3f', border: `1px solid ${C.blue}`, borderRadius: 5, color: C.blueL, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                Download JSON
              </button>
              <button onClick={() => setLogs([])}
                style={{ flex: 1, padding: '6px 0', background: C.panel, border: `1px solid ${C.border}`, borderRadius: 5, color: C.muted, cursor: 'pointer', fontSize: 11 }}>
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Right — logs */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: '#080e1f', borderBottom: `1px solid ${C.border}`, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: C.text }}>Response Log</span>
            {Object.entries(srcColors).map(([src, col]) => {
              const count = logs.filter(l => l.src === src).length;
              const ok    = logs.filter(l => l.src === src && l.status >= 200 && l.status < 300).length;
              return count > 0 ? (
                <span key={src} style={{ background: col + '22', color: col, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                  {src}: {ok}/{count}
                </span>
              ) : null;
            })}
            <span style={{ marginLeft: 'auto', color: C.muted, fontSize: 11 }}>{logs.length} total</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, background: '#020816' }}>
            {logs.length === 0 && (
              <div style={{ color: '#1e293b', marginTop: 30, textAlign: 'center', fontSize: 14 }}>
                Route button click karo — response yahan dikhega
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
                  <div style={{ background: '#040810', padding: '6px 10px', border: `1px solid ${C.border}`, borderTop: 0, borderRadius: '0 0 5px 5px', maxHeight: 150, overflowY: 'auto' }}>
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

      {/* Flow modal */}
      {flowRoute && <FlowCard route={flowRoute} onClose={() => setFlowRoute(null)} />}
    </div>
  );
}
