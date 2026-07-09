import { useState } from 'react';
import { Link } from 'react-router-dom';

const API = 'https://ixthoe12fe.execute-api.ap-south-1.amazonaws.com/prod';

const PAGE = { fontFamily: "'Amazon Ember', Arial, sans-serif", background: '#f2f3f3', minHeight: '100vh', color: '#16191f' };
const CARD = { background: '#fff', border: '1px solid #d5dbdb', borderRadius: 4, marginBottom: 16, padding: 16 };
const BTN  = { background: '#ff9900', color: '#16191f', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700 };

function NavBar() {
  return (
    <div style={{ background: '#232f3e', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 20, height: 40 }}>
      <span style={{ color: '#ff9900', fontWeight: 800, fontSize: 18, letterSpacing: -1 }}>aws</span>
      <span style={{ color: '#d5dbdb', fontSize: 13 }}>Services</span>
      <span style={{ color: '#ff9900', fontSize: 13 }}>SES + SNS</span>
      <span style={{ color: '#d5dbdb', fontSize: 13 }}>›</span>
      <span style={{ color: '#d5dbdb', fontSize: 13 }}>Bulk Notifications</span>
      <span style={{ flex: 1 }} />
      <span style={{ color: '#d5dbdb', fontSize: 12 }}>ap-south-1 (Mumbai)</span>
      <Link to="/" style={{ color: '#d5dbdb', fontSize: 12, textDecoration: 'none' }}>← Back to App</Link>
    </div>
  );
}

function ArchitectureSection() {
  return (
    <div style={CARD}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>🏗️ Architecture — SQS se Email/SMS Kaise Bhejte Hain</div>
      <div style={{ background: '#0f172a', borderRadius: 6, padding: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.9, color: '#e2e8f0', overflowX: 'auto' }}>
        <div><span style={{ color: '#67e8f9' }}>React UI</span> → POST /notify/send-bulk</div>
        <div style={{ color: '#64748b' }}>  ↓</div>
        <div><span style={{ color: '#fbbf24' }}>Lambda (send-bulk)</span> — har recipient ke liye SQS message banata hai</div>
        <div style={{ color: '#64748b' }}>  ↓</div>
        <div><span style={{ color: '#86efac' }}>SQS Queue</span> — notify-email-queue-production / notify-sms-queue-production</div>
        <div style={{ color: '#64748b' }}>  ↓ (event source trigger, batch=5)</div>
        <div><span style={{ color: '#fbbf24' }}>Lambda (consumer)</span> — queue se message pop karta hai</div>
        <div style={{ color: '#64748b' }}>  ├──→ <span style={{ color: '#f472b6' }}>SES.sendEmail()</span> (type=email)</div>
        <div style={{ color: '#64748b' }}>  └──→ <span style={{ color: '#f472b6' }}>SNS.publish()</span> (type=sms)</div>
        <div style={{ color: '#64748b' }}>  ↓ (3 retries fail ho to)</div>
        <div><span style={{ color: '#ef4444' }}>DLQ</span> — notify-email-dlq-production / notify-sms-dlq-production</div>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: '#545b64' }}>
        <b>DB se Email kaise aati hai:</b> Recipients <code>RDS PostgreSQL (lambda_users table)</code> se fetch hote hain — DB query sirf list nikalti hai, queue mein daalna SQS ka kaam hai. Single email ke liye SQS zaruri nahi (direct SES call theek hai), lekin bulk (100+) ke liye SQS recommended hai — rate limiting, retry, aur async processing ke liye.
      </div>
    </div>
  );
}

function ComparisonSection() {
  return (
    <div style={CARD}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>📊 SES vs SNS</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f2f3f3' }}>
            <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #d5dbdb' }}></th>
            <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #d5dbdb' }}>SES (Simple Email Service)</th>
            <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid #d5dbdb' }}>SNS (Simple Notification Service)</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Kaam', 'Sirf Email', 'SMS, Push, Email — multi-channel'],
            ['Use case', 'Order confirmation, newsletter', 'OTP SMS, app push, pub/sub'],
            ['Pricing', '$0.10 per 1000 emails', '~₹0.50-2/SMS (India)'],
            ['Content', 'HTML/text + attachments', 'Plain text, 160 chars'],
          ].map((row, i) => (
            <tr key={i}>
              {row.map((c, j) => <td key={j} style={{ padding: 8, borderBottom: '1px solid #eaeded', fontWeight: j === 0 ? 700 : 400 }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiveTestSection() {
  const [recipients, setRecipients] = useState([]);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [selected, setSelected] = useState([]);
  const [subject, setSubject] = useState('Demo Notification');
  const [message, setMessage] = useState('Yeh ek test bulk email hai — SQS + Lambda + SES se bheja gaya');
  const [smsPhone, setSmsPhone] = useState('+919999999999');
  const [smsMessage, setSmsMessage] = useState('OTP: 482910 — yeh demo SMS hai');
  const [emailResult, setEmailResult] = useState(null);
  const [smsResult, setSmsResult] = useState(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingSms, setLoadingSms] = useState(false);

  const fetchRecipients = async () => {
    setLoadingFetch(true);
    try {
      const r = await fetch(`${API}/notify/recipients`);
      const d = await r.json();
      setRecipients(d.recipients || []);
      setSelected((d.recipients || []).map(r => r.email));
    } catch (e) {
      setRecipients([]);
    }
    setLoadingFetch(false);
  };

  const toggleSelect = (email) => {
    setSelected(s => s.includes(email) ? s.filter(e => e !== email) : [...s, email]);
  };

  const sendBulkEmail = async () => {
    setLoadingEmail(true);
    setEmailResult(null);
    try {
      const recips = recipients.filter(r => selected.includes(r.email)).map(r => ({ email: r.email, name: r.name }));
      const r = await fetch(`${API}/notify/send-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', recipients: recips, subject, message }),
      });
      const d = await r.json();
      setEmailResult({ ok: r.ok, data: d });
    } catch (e) {
      setEmailResult({ ok: false, data: { message: e.message } });
    }
    setLoadingEmail(false);
  };

  const sendBulkSms = async () => {
    setLoadingSms(true);
    setSmsResult(null);
    try {
      const r = await fetch(`${API}/notify/send-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'sms', recipients: [{ phone: smsPhone, name: 'Demo User' }], message: smsMessage }),
      });
      const d = await r.json();
      setSmsResult({ ok: r.ok, data: d });
    } catch (e) {
      setSmsResult({ ok: false, data: { message: e.message } });
    }
    setLoadingSms(false);
  };

  return (
    <>
      {/* Step 1: Fetch recipients from DB */}
      <div style={CARD}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>1️⃣ DB se Recipients Fetch Karo</div>
        <div style={{ fontSize: 12, color: '#879596', marginBottom: 10 }}>RDS PostgreSQL → lambda_users table (live data, registered users)</div>
        <button onClick={fetchRecipients} disabled={loadingFetch} style={BTN}>
          {loadingFetch ? '⏳ Fetching...' : '📥 Fetch Recipients from DB'}
        </button>
        {recipients.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#1d8102', marginBottom: 8 }}>✅ {recipients.length} users mile DB mein</div>
            {recipients.map(r => (
              <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0', cursor: 'pointer' }}>
                <input type="checkbox" checked={selected.includes(r.email)} onChange={() => toggleSelect(r.email)} />
                <span style={{ fontFamily: 'monospace' }}>{r.email}</span>
                <span style={{ color: '#879596' }}>({r.name || 'no name'})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Bulk Email */}
      <div style={{ ...CARD, borderLeft: '4px solid #d97706' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>2️⃣ 📧 Bulk Email Bhejo (SES)</div>
        <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
            style={{ padding: 8, border: '1px solid #d5dbdb', borderRadius: 4, fontSize: 13 }} />
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Message" rows={2}
            style={{ padding: 8, border: '1px solid #d5dbdb', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' }} />
        </div>
        <button onClick={sendBulkEmail} disabled={loadingEmail || !selected.length} style={{ ...BTN, opacity: !selected.length ? 0.5 : 1 }}>
          {loadingEmail ? '⏳ Sending...' : `📤 Send to ${selected.length} Recipients`}
        </button>
        {emailResult && (
          <div style={{ marginTop: 10, background: emailResult.ok ? '#f0fdf4' : '#fff5f5', border: `1px solid ${emailResult.ok ? '#9be9a8' : '#feb2b2'}`, borderRadius: 4, padding: 10 }}>
            <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap' }}>{JSON.stringify(emailResult.data, null, 2)}</pre>
            {emailResult.ok && (
              <div style={{ fontSize: 11, color: '#92400e', marginTop: 6 }}>
                ⚠️ SQS mein queue ho gaya. SES <b>sandbox mode</b> mein hai — agar recipient email verify nahi hai to consumer Lambda "Email address is not verified" error dega (CloudWatch logs mein check karo). Verify karne ke liye SES Console se identity verify karo.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Bulk SMS */}
      <div style={{ ...CARD, borderLeft: '4px solid #7c3aed' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>3️⃣ 📱 Bulk SMS Bhejo (SNS)</div>
        <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
          <input value={smsPhone} onChange={e => setSmsPhone(e.target.value)} placeholder="+91XXXXXXXXXX"
            style={{ padding: 8, border: '1px solid #d5dbdb', borderRadius: 4, fontSize: 13, fontFamily: 'monospace' }} />
          <textarea value={smsMessage} onChange={e => setSmsMessage(e.target.value)} placeholder="SMS Message" rows={2}
            style={{ padding: 8, border: '1px solid #d5dbdb', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' }} />
        </div>
        <button onClick={sendBulkSms} disabled={loadingSms} style={{ ...BTN, background: '#7c3aed', color: '#fff' }}>
          {loadingSms ? '⏳ Sending...' : '📤 Send SMS'}
        </button>
        {smsResult && (
          <div style={{ marginTop: 10, background: smsResult.ok ? '#f0fdf4' : '#fff5f5', border: `1px solid ${smsResult.ok ? '#9be9a8' : '#feb2b2'}`, borderRadius: 4, padding: 10 }}>
            <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap' }}>{JSON.stringify(smsResult.data, null, 2)}</pre>
            {smsResult.ok && (
              <div style={{ fontSize: 11, color: '#92400e', marginTop: 6 }}>
                ⚠️ SQS mein queue ho gaya, lekin AWS account mein <b>SMS sending abhi enabled nahi hai</b> (naye accounts ke liye AWS Support se "SMS spending limit increase" request karni padti hai — CLI se enable nahi hota). Consumer Lambda CloudWatch logs mein "subscription required" error dikhega jab tak account-level activation na ho.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function NotificationsPage() {
  return (
    <div style={PAGE}>
      <NavBar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>📧📱 Bulk Notifications — SQS + Lambda + SES + SNS</h2>
        <p style={{ fontSize: 13, color: '#879596', margin: '0 0 16px' }}>DB → Queue → Lambda → Email/SMS — real AWS pipeline, live test</p>
        <ComparisonSection />
        <ArchitectureSection />
        <LiveTestSection />
      </div>
    </div>
  );
}
