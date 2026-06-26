import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tokens } from '../utils/tokens.js';

const API_GW = 'https://wxv12mu6bg.execute-api.ap-south-1.amazonaws.com/production';
const COGNITO_URL = 'https://cognito-idp.ap-south-1.amazonaws.com/';
const COGNITO_POOL = 'ap-south-1_DsHwA8dVJ';
const COGNITO_CLIENT = '20qlu1pvf3ev7a3hpl3l41dbrp';

const EC1_ROUTES = [
  { label: 'products',      method: 'GET', path: '/api/app/products' },
  { label: 'users',         method: 'GET', path: '/api/app/users' },
  { label: 'payments',      method: 'GET', path: '/api/app/payments' },
  { label: 'inventory',     method: 'GET', path: '/api/app/inventory' },
  { label: 'notifications', method: 'GET', path: '/api/app/notifications' },
];

const EC2_ROUTES = [
  { label: 'health',   method: 'GET',  path: '/api/v1/health', noAuth: true },
  { label: 'auth/me',  method: 'GET',  path: '/api/v1/auth/me' },
];

const EC3_ROUTES = [
  { label: 'orders',          method: 'GET', path: '/api/orders/orders' },
  { label: 'shipping',        method: 'GET', path: '/api/orders/shipping' },
  { label: 'warehouse',       method: 'GET', path: '/api/orders/warehouse' },
  { label: 'dispatch',        method: 'GET', path: '/api/orders/dispatch' },
  { label: 'tracking/history',method: 'GET', path: '/api/orders/tracking/history' },
];

async function cognitoCustomAuth(email, password) {
  const init = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    },
    body: JSON.stringify({
      AuthFlow: 'CUSTOM_AUTH',
      ClientId: COGNITO_CLIENT,
      AuthParameters: { USERNAME: email },
    }),
  });
  const initData = await init.json();
  if (!initData.Session) throw new Error(initData.message || 'InitiateAuth failed');

  const respond = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge',
    },
    body: JSON.stringify({
      ChallengeName: 'CUSTOM_CHALLENGE',
      ClientId: COGNITO_CLIENT,
      Session: initData.Session,
      ChallengeResponses: {
        USERNAME: email,
        ANSWER: JSON.stringify({ email, password }),
      },
    }),
  });
  const respondData = await respond.json();
  if (!respondData.AuthenticationResult) throw new Error(respondData.message || 'Auth challenge failed');
  return respondData.AuthenticationResult.AccessToken;
}

export default function AwsDemoPage() {
  const [cognitoJwt, setCognitoJwt] = useState('');
  const [email, setEmail] = useState('demo@test.com');
  const [password, setPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState('idle');

  const [rbacEmail, setRbacEmail] = useState('demo@test.com');
  const [rbacPassword, setRbacPassword] = useState('');
  const [rbacJwt, setRbacJwt] = useState(tokens.access() || '');
  const [rbacStatus, setRbacStatus] = useState(tokens.access() ? 'ok' : 'idle');

  const [logs, setLogs] = useState([]);

  const addLog = (ec, status, path, data) => {
    setLogs((prev) => [{ id: Date.now(), ec, status, path, data, ts: new Date().toLocaleTimeString() }, ...prev]);
  };

  const cognitoLogin = async () => {
    setLoginStatus('loading');
    try {
      const token = await cognitoCustomAuth(email, password);
      setCognitoJwt(token);
      setLoginStatus('ok');
      addLog('AUTH', 200, 'Cognito CUSTOM_AUTH', { preview: token.slice(0, 40) + '...' });
    } catch (e) {
      setLoginStatus('err');
      addLog('AUTH', 'ERR', 'Cognito CUSTOM_AUTH', { error: e.message });
    }
  };

  const callEc1Ec3 = async (route) => {
    if (!cognitoJwt) { alert('Pehle Cognito login karo'); return; }
    try {
      const r = await fetch(API_GW + route.path, {
        method: route.method,
        headers: { Authorization: 'Bearer ' + cognitoJwt, 'Content-Type': 'application/json' },
      });
      const data = await r.json();
      addLog(route.path.startsWith('/api/app') ? 'EC1' : 'EC3', r.status, route.path, data);
    } catch (e) {
      addLog(route.path.startsWith('/api/app') ? 'EC1' : 'EC3', 'ERR', route.path, { error: e.message });
    }
  };

  const rbacLogin = async () => {
    setRbacStatus('loading');
    try {
      const r = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rbacEmail, password: rbacPassword }),
      });
      const data = await r.json();
      const token = data?.data?.accessToken;
      if (!token) throw new Error(data?.message || 'Login failed');
      setRbacJwt(token);
      tokens.set(token, data?.data?.refreshToken);
      setRbacStatus('ok');
      addLog('EC2', 200, 'RBAC Login', { preview: token.slice(0, 40) + '...' });
    } catch (e) {
      setRbacStatus('err');
      addLog('EC2', 'ERR', 'RBAC Login', { error: e.message });
    }
  };

  const callEc2 = async (route) => {
    if (!route.noAuth && !rbacJwt) { alert('Pehle EC2 RBAC login karo'); return; }
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (!route.noAuth && rbacJwt) headers.Authorization = 'Bearer ' + rbacJwt;
      // Direct to nginx (same origin) — bypasses API Gateway JWT check
      const r = await fetch(route.path, { method: route.method, headers });
      const data = await r.json();
      addLog('EC2', r.status, route.path, data);
    } catch (e) {
      addLog('EC2', 'ERR', route.path, { error: e.message });
    }
  };

  const runAll = async () => {
    if (!cognitoJwt) { alert('Pehle Cognito login karo (EC1+EC3 ke liye)'); return; }
    for (const r of EC1_ROUTES) await callEc1Ec3(r);
    for (const r of EC2_ROUTES) await callEc2(r);
    for (const r of EC3_ROUTES) await callEc1Ec3(r);
  };

  const statusColor = { idle: '#64748b', loading: '#f59e0b', ok: '#22c55e', err: '#ef4444' };
  const statusText = { idle: 'Not logged in', loading: 'Logging in...', ok: 'Logged in', err: 'Login failed' };

  return (
    <div style={{ minHeight: '100vh', background: '#060b18', color: '#e2e8f0', fontFamily: "'Segoe UI', sans-serif", fontSize: 14 }}>

      {/* Header */}
      <div style={{ background: '#0f172a', padding: '10px 20px', borderBottom: '2px solid #3b82f6', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: '#60a5fa', fontWeight: 700 }}>AWS Infrastructure Demo</span>
        <span style={{ color: '#475569', fontSize: 12 }}>API GW → ALB → EC1 / EC2 / EC3</span>
        <Link to="/" style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: 12 }}>Back to App</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', height: 'calc(100vh - 44px)' }}>

        {/* Left panel */}
        <div style={{ padding: 14, overflowY: 'auto', borderRight: '1px solid #1e293b', background: '#0a0f1e', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Cognito Login */}
          <div style={{ background: '#111827', border: '1px solid #312e81', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Cognito Login (EC1 + EC3)
            </div>
            <input
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', fontSize: 12, marginBottom: 6 }}
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{ width: '100%', padding: '6px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', fontSize: 12, marginBottom: 8 }}
            />
            <button
              onClick={cognitoLogin} disabled={loginStatus === 'loading'}
              style={{ width: '100%', padding: '7px 0', background: '#6d28d9', border: 'none', borderRadius: 5, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
            >
              {loginStatus === 'loading' ? 'Logging in...' : 'Login with Cognito'}
            </button>
            <div style={{ marginTop: 6, fontSize: 11, color: statusColor[loginStatus] }}>
              {statusText[loginStatus]}
              {cognitoJwt && <span style={{ marginLeft: 8, color: '#475569' }}>{cognitoJwt.slice(0, 20)}...</span>}
            </div>
          </div>

          {/* EC1 */}
          <div style={{ background: '#111827', border: '1px solid #1d4ed8', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#60a5fa', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              EC1 — Products Service (/api/app/*)
            </div>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 8 }}>Requires: Cognito JWT | Port 3001</div>
            {EC1_ROUTES.map((r) => (
              <button key={r.path} onClick={() => callEc1Ec3(r)}
                style={{ display: 'block', width: '100%', marginBottom: 4, padding: '5px 8px', background: '#0c1f3f', border: '1px solid #1d4ed8', borderRadius: 4, color: '#93c5fd', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                GET /api/app/<b>{r.label}</b>
              </button>
            ))}
          </div>

          {/* EC2 */}
          <div style={{ background: '#111827', border: '1px solid #b45309', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              EC2 — RBAC Service (/api/v1/*)
            </div>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 6 }}>Direct nginx call (same-origin) | nginx:80 → Node:4000</div>
            <input value={rbacEmail} onChange={(e) => setRbacEmail(e.target.value)}
              style={{ width: '100%', padding: '5px 7px', background: '#0f172a', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', fontSize: 11, marginBottom: 4 }} />
            <input type="password" value={rbacPassword} onChange={(e) => setRbacPassword(e.target.value)} placeholder="RBAC Password"
              style={{ width: '100%', padding: '5px 7px', background: '#0f172a', border: '1px solid #334155', borderRadius: 4, color: '#e2e8f0', fontSize: 11, marginBottom: 6 }} />
            <button onClick={rbacLogin} disabled={rbacStatus === 'loading'}
              style={{ width: '100%', padding: '5px 0', background: '#92400e', border: 'none', borderRadius: 4, color: '#fde68a', fontWeight: 600, cursor: 'pointer', fontSize: 11, marginBottom: 6 }}>
              {rbacStatus === 'loading' ? 'Logging in...' : rbacStatus === 'ok' ? 'RBAC Logged In' : 'Login RBAC'}
            </button>
            {EC2_ROUTES.map((r) => (
              <button key={r.path} onClick={() => callEc2(r)}
                style={{ display: 'block', width: '100%', marginBottom: 4, padding: '5px 8px', background: '#1c1100', border: '1px solid #b45309', borderRadius: 4, color: '#fcd34d', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                {r.method} /api/v1/<b>{r.label}</b>
                {r.noAuth && <span style={{ marginLeft: 6, fontSize: 10, color: '#6b7280' }}>(no auth)</span>}
              </button>
            ))}
          </div>

          {/* EC3 */}
          <div style={{ background: '#111827', border: '1px solid #15803d', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#4ade80', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              EC3 — Orders Service (/api/orders/*)
            </div>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 8 }}>Requires: Cognito JWT | Port 3002</div>
            {EC3_ROUTES.map((r) => (
              <button key={r.path} onClick={() => callEc1Ec3(r)}
                style={{ display: 'block', width: '100%', marginBottom: 4, padding: '5px 8px', background: '#071f0f', border: '1px solid #15803d', borderRadius: 4, color: '#86efac', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                GET /api/orders/<b>{r.label}</b>
              </button>
            ))}
          </div>

          {/* Run All */}
          <button onClick={runAll}
            style={{ padding: '8px 0', background: cognitoJwt ? '#065f46' : '#1e293b', border: `1px solid ${cognitoJwt ? '#059669' : '#334155'}`, borderRadius: 5, color: cognitoJwt ? '#34d399' : '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            Run All Routes (EC1 + EC2 + EC3)
          </button>

          {/* Download + Clear */}
          {logs.length > 0 && (<>
            <button onClick={() => {
              const out = { generatedAt: new Date().toISOString(), totalRequests: logs.length, results: [...logs].reverse().map(l => ({ ec: l.ec, status: l.status, path: l.path, time: l.ts, response: l.data })) };
              const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
              a.download = `aws-demo-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
              a.click();
            }}
              style={{ padding: '8px 0', background: '#1e3a5f', border: '1px solid #1d4ed8', borderRadius: 5, color: '#93c5fd', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              Download JSON
            </button>
            <button onClick={() => setLogs([])}
              style={{ padding: '6px 0', background: '#1e293b', border: '1px solid #334155', borderRadius: 5, color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>
              Clear Logs
            </button>
          </>)}
        </div>

        {/* Right panel — logs */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: '#0f172a', borderBottom: '1px solid #1e293b', fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Response Log</span>
            {['EC1','EC2','EC3'].map(ec => {
              const count = logs.filter(l => l.ec === ec).length;
              const ok = logs.filter(l => l.ec === ec && l.status >= 200 && l.status < 300).length;
              const color = { EC1: '#3b82f6', EC2: '#f59e0b', EC3: '#22c55e' }[ec];
              return count > 0 ? (
                <span key={ec} style={{ background: color+'22', color, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                  {ec}: {ok}/{count} OK
                </span>
              ) : null;
            })}
            <span style={{ marginLeft: 'auto', color: '#475569' }}>{logs.filter(l=>['EC1','EC2','EC3'].includes(l.ec)).length} / {logs.length} total</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, background: '#020816' }}>
            {logs.length === 0 && (
              <div style={{ color: '#334155', marginTop: 20, textAlign: 'center' }}>
                Button click karo — response yahan dikhega
              </div>
            )}
            {logs.map((log) => {
              const isOk = log.status >= 200 && log.status < 300;
              const ecColor = { EC1: '#3b82f6', EC2: '#f59e0b', EC3: '#22c55e', AUTH: '#a78bfa' }[log.ec] || '#64748b';
              return (
                <div key={log.id} style={{ marginBottom: 10, borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                    background: isOk ? '#0a1628' : '#1f0505',
                    borderLeft: `3px solid ${ecColor}`,
                  }}>
                    <span style={{ background: ecColor + '22', color: ecColor, padding: '1px 6px', borderRadius: 3, fontSize: 11, fontWeight: 700 }}>{log.ec}</span>
                    <span style={{ color: isOk ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{log.status}</span>
                    <span style={{ color: '#94a3b8', flex: 1 }}>{log.path}</span>
                    <span style={{ color: '#475569', fontSize: 10 }}>{log.ts}</span>
                  </div>
                  <div style={{ background: '#0a0f1e', padding: '6px 8px', border: '1px solid #1e293b', borderTop: 0, borderRadius: '0 0 5px 5px', color: '#94a3b8', maxHeight: 160, overflowY: 'auto' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 11 }}>
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
