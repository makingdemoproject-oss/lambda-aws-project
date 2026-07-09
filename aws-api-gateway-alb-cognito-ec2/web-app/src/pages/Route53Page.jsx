import { useState } from 'react';

const EC2_IP  = '13.201.138.12';
const ALB_DNS = 'host-routing-alb-910889267.ap-south-1.elb.amazonaws.com';

const isHttps = () => window.location.protocol === 'https:';
const K3S_ORDERS   = () => isHttps() ? 'https://firstbyrajesh.duckdns.org/proxy-k3s-orders'   : `http://${EC2_IP}:30080`;
const K3S_PRODUCTS = () => isHttps() ? 'https://firstbyrajesh.duckdns.org/proxy-k3s-products' : `http://${EC2_IP}:30081`;
const ALB_BASE     = () => isHttps() ? 'https://firstbyrajesh.duckdns.org/proxy-alb'           : `http://${ALB_DNS}`;

const PAGE = { fontFamily: "'Amazon Ember', Arial, sans-serif", background: '#f2f3f3', minHeight: '100vh', color: '#16191f' };
const CARD = { background: '#fff', border: '1px solid #d5dbdb', borderRadius: 4, marginBottom: 16 };
const TH   = { background: '#f2f3f3', padding: '8px 12px', fontSize: 12, fontWeight: 700, textAlign: 'left', borderBottom: '1px solid #d5dbdb', color: '#16191f', whiteSpace: 'nowrap' };
const TD   = { padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #eaeded', verticalAlign: 'top' };

// ── AWS Console Top Nav Mock ──────────────────────────────────────────────────
function AwsNavBar() {
  return (
    <div style={{ background: '#232f3e', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 20, height: 40 }}>
      <span style={{ color: '#ff9900', fontWeight: 800, fontSize: 18, letterSpacing: -1 }}>aws</span>
      <span style={{ color: '#d5dbdb', fontSize: 13 }}>Services</span>
      <span style={{ color: '#d5dbdb', fontSize: 13 }}>Route 53</span>
      <span style={{ flex: 1 }} />
      <span style={{ color: '#d5dbdb', fontSize: 12 }}>ap-south-1 (Mumbai)</span>
      <span style={{ color: '#d5dbdb', fontSize: 12 }}>makingdemoproject@gmail.com</span>
    </div>
  );
}

// ── Left Sidebar ──────────────────────────────────────────────────────────────
function Sidebar({ active, setActive }) {
  const items = [
    { id: 'dashboard',    label: 'Dashboard' },
    { id: 'hosted-zones', label: 'Hosted zones' },
    { id: 'records',      label: 'Records (myapp.com)' },
    { id: 'create-record',label: 'Create record (step)' },
    { id: 'alb-link',     label: 'ALB se link karo' },
    { id: 'real-alb',     label: '🟢 Real ALB (Live)' },
    { id: 'nipio',        label: 'Free DNS (nip.io)' },
    { id: 'live',         label: 'Live API Test' },
  ];
  return (
    <div style={{ width: 220, background: '#fff', borderRight: '1px solid #d5dbdb', minHeight: 'calc(100vh - 40px)', padding: '16px 0', flexShrink: 0 }}>
      <div style={{ padding: '4px 16px 12px', fontSize: 11, fontWeight: 700, color: '#879596', textTransform: 'uppercase', letterSpacing: 1 }}>Route 53</div>
      {items.map(it => (
        <div key={it.id}
          onClick={() => setActive(it.id)}
          style={{ padding: '8px 20px', fontSize: 13, cursor: 'pointer', background: active === it.id ? '#e8f4fd' : 'transparent', color: active === it.id ? '#0073bb' : '#16191f', borderLeft: active === it.id ? '3px solid #0073bb' : '3px solid transparent', fontWeight: active === it.id ? 600 : 400 }}>
          {it.label}
        </div>
      ))}
    </div>
  );
}

// ── Breadcrumb ─────────────────────────────────────────────────────────────────
function Breadcrumb({ steps }) {
  return (
    <div style={{ fontSize: 12, color: '#0073bb', marginBottom: 16, display: 'flex', gap: 6, alignItems: 'center' }}>
      {steps.map((s, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: '#879596' }}>›</span>}
          <span style={{ color: i === steps.length - 1 ? '#16191f' : '#0073bb', textDecoration: i < steps.length - 1 ? 'underline' : 'none', cursor: i < steps.length - 1 ? 'pointer' : 'default' }}>{s}</span>
        </span>
      ))}
    </div>
  );
}

// ── 1. Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ setActive }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Route 53 Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Hosted zones', val: '1', color: '#0073bb' },
          { label: 'Health checks', val: '0', color: '#1d8102' },
          { label: 'Traffic policies', val: '0', color: '#879596' },
        ].map((s, i) => (
          <div key={i} style={{ ...CARD, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 13, color: '#879596', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ ...CARD, padding: 20, background: '#e8f4fd', border: '1px solid #bee3f8' }}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: '#0073bb' }}>ℹ️  Route 53 kya karta hai?</div>
        <div style={{ fontSize: 13, lineHeight: 1.8, color: '#16191f' }}>
          Route 53 AWS ka <b>DNS Service</b> hai.<br />
          <b>api.myapp.com</b> → ALB DNS → EC2 → App<br /><br />
          <b>Step 1:</b> Hosted Zone banao (myapp.com ke liye)<br />
          <b>Step 2:</b> Records banao (api, admin, shop subdomains)<br />
          <b>Step 3:</b> Records ko ALB se Alias karo<br />
          <b>Step 4:</b> Browser type kare api.myapp.com → Route 53 → ALB → App
        </div>
        <button onClick={() => setActive('hosted-zones')} style={{ marginTop: 12, background: '#ff9900', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Hosted Zones dekho →
        </button>
      </div>
    </div>
  );
}

// ── 2. Hosted Zones ───────────────────────────────────────────────────────────
function HostedZones({ setActive }) {
  return (
    <div>
      <Breadcrumb steps={['Route 53', 'Hosted zones']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Hosted zones</h2>
        <button onClick={() => setActive('records')} style={{ background: '#0073bb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Create hosted zone
        </button>
      </div>

      {/* Info box */}
      <div style={{ ...CARD, padding: 16, background: '#fff8e1', border: '1px solid #f9c74f', marginBottom: 16 }}>
        <b>Hosted Zone kya hota hai?</b>
        <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.7 }}>
          Ek domain ke liye ek container jisme us domain ke saare DNS records hote hain.<br />
          jaise: <b>myapp.com</b> ke liye ek hosted zone — uske andar api, admin, shop ke records.
        </div>
      </div>

      <div style={CARD}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eaeded', display: 'flex', gap: 8 }}>
          <input placeholder="Search hosted zones" style={{ border: '1px solid #aab7b8', borderRadius: 4, padding: '6px 10px', fontSize: 13, width: 250 }} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}><input type="checkbox" /></th>
              <th style={TH}>Domain name</th>
              <th style={TH}>Type</th>
              <th style={TH}>Record count</th>
              <th style={TH}>Hosted zone ID</th>
              <th style={TH}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ cursor: 'pointer' }} onClick={() => setActive('records')}>
              <td style={TD}><input type="checkbox" /></td>
              <td style={{ ...TD, color: '#0073bb', textDecoration: 'underline' }}>myapp.com</td>
              <td style={TD}>Public hosted zone</td>
              <td style={TD}>5</td>
              <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12 }}>Z1PA6795UKMFR9</td>
              <td style={{ ...TD, color: '#879596' }}>Production DNS</td>
            </tr>
          </tbody>
        </table>
        <div style={{ padding: '12px 16px', fontSize: 12, color: '#879596' }}>Showing 1 of 1 hosted zone</div>
      </div>

      <div style={{ ...CARD, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Hosted Zone banane ke steps (AWS Console):</div>
        {[
          'Route 53 → Hosted zones → Create hosted zone',
          'Domain name: myapp.com',
          'Type: Public hosted zone',
          'Create hosted zone button dabao',
          '4 NS records aur 1 SOA record automatically ban jaayenge',
          'Apne domain registrar pe jaao → NS records update karo (ya Route 53 se buy karo)',
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 13 }}>
            <span style={{ background: '#0073bb', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
            <span>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 3. Records List ───────────────────────────────────────────────────────────
function RecordsList({ setActive }) {
  const records = [
    { name: 'myapp.com',           type: 'NS',    ttl: '172800', value: 'ns-1234.awsdns-56.com\nns-567.awsdns-78.net\nns-890.awsdns-12.co.uk\nns-3456.awsdns-78.org', alias: false },
    { name: 'myapp.com',           type: 'SOA',   ttl: '900',    value: 'ns-1234.awsdns-56.com. awsdns-hostmaster.amazon.com...', alias: false },
    { name: 'api.myapp.com',       type: 'A',     ttl: '-',      value: ALB_DNS, alias: true },
    { name: 'shop.myapp.com',      type: 'A',     ttl: '-',      value: ALB_DNS, alias: true },
    { name: 'admin.myapp.com',     type: 'A',     ttl: '-',      value: ALB_DNS, alias: true },
  ];

  return (
    <div>
      <Breadcrumb steps={['Route 53', 'Hosted zones', 'myapp.com']} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>myapp.com</h2>
          <div style={{ fontSize: 12, color: '#879596', marginTop: 2 }}>Hosted zone ID: Z1PA6795UKMFR9 | 5 records</div>
        </div>
        <button onClick={() => setActive('create-record')} style={{ background: '#0073bb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Create record
        </button>
      </div>

      <div style={{ ...CARD, padding: 12, background: '#e8f4fd', border: '1px solid #bee3f8', marginBottom: 16 }}>
        <b>ℹ️ Ye records kya karte hain?</b>
        <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.7 }}>
          <b>NS</b> = Name Server — AWS ke DNS servers (automatically banta hai)<br />
          <b>SOA</b> = Start of Authority — zone ki info (automatically banta hai)<br />
          <b>A (Alias)</b> = <span style={{ color: '#dc2626' }}>YE HUM BANATE HAIN</span> — subdomain → ALB DNS
        </div>
      </div>

      <div style={CARD}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #eaeded', display: 'flex', gap: 8 }}>
          <input placeholder="Search records" style={{ border: '1px solid #aab7b8', borderRadius: 4, padding: '6px 10px', fontSize: 13, width: 250 }} />
          <select style={{ border: '1px solid #aab7b8', borderRadius: 4, padding: '6px', fontSize: 13 }}>
            <option>Filter by type</option>
            <option>A</option><option>NS</option><option>CNAME</option>
          </select>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}><input type="checkbox" /></th>
              <th style={TH}>Record name</th>
              <th style={TH}>Type</th>
              <th style={TH}>Routing policy</th>
              <th style={TH}>Alias</th>
              <th style={TH}>TTL (seconds)</th>
              <th style={TH}>Value / Route traffic to</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={i} style={{ background: r.alias ? '#f0fdf4' : '#fff' }}>
                <td style={TD}><input type="checkbox" /></td>
                <td style={{ ...TD, color: '#0073bb', fontFamily: 'monospace', fontSize: 12 }}>{r.name}</td>
                <td style={TD}>
                  <span style={{ background: r.alias ? '#1d8102' : '#545b64', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{r.type}</span>
                </td>
                <td style={TD}>Simple</td>
                <td style={TD}>{r.alias ? <span style={{ color: '#1d8102', fontWeight: 700 }}>Yes ✅</span> : <span style={{ color: '#879596' }}>No</span>}</td>
                <td style={{ ...TD, fontFamily: 'monospace' }}>{r.ttl}</td>
                <td style={{ ...TD, fontFamily: 'monospace', fontSize: 11, maxWidth: 300, wordBreak: 'break-all' }}>
                  {r.alias
                    ? <span style={{ color: '#0073bb' }}>Alias to ALB: {r.value.slice(0, 45)}...</span>
                    : <span style={{ color: '#879596', whiteSpace: 'pre-wrap' }}>{r.value.slice(0, 60)}...</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 4. Create Record Form ─────────────────────────────────────────────────────
function CreateRecord({ setActive }) {
  const [subdomain, setSubdomain] = useState('api');
  const [alias, setAlias] = useState(true);

  return (
    <div>
      <Breadcrumb steps={['Route 53', 'Hosted zones', 'myapp.com', 'Create record']} />
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Create record — myapp.com</h2>

      <div style={{ ...CARD, padding: 0 }}>
        {/* Record name */}
        <div style={{ padding: 20, borderBottom: '1px solid #eaeded' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Record name</div>
          <div style={{ fontSize: 12, color: '#879596', marginBottom: 8 }}>Subdomain name — baad mein .myapp.com lagega</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <input
              value={subdomain}
              onChange={e => setSubdomain(e.target.value)}
              style={{ border: '1px solid #0073bb', borderRadius: '4px 0 0 4px', padding: '8px 12px', fontSize: 14, width: 160, outline: 'none' }}
            />
            <span style={{ background: '#f2f3f3', border: '1px solid #aab7b8', borderLeft: 'none', padding: '8px 12px', fontSize: 14, borderRadius: '0 4px 4px 0', color: '#545b64' }}>.myapp.com</span>
          </div>
          <div style={{ fontSize: 12, color: '#0073bb', marginTop: 6 }}>
            Preview: <b>{subdomain || '(blank)'}.myapp.com</b>
          </div>
        </div>

        {/* Record type */}
        <div style={{ padding: 20, borderBottom: '1px solid #eaeded' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Record type</div>
          <select style={{ border: '1px solid #aab7b8', borderRadius: 4, padding: '8px 12px', fontSize: 14, width: 300 }}>
            <option>A – Routes traffic to an IPv4 address and some AWS resources</option>
            <option>CNAME</option>
            <option>MX</option>
          </select>
          <div style={{ fontSize: 12, color: '#879596', marginTop: 6 }}>ALB ke liye A record use karo (Alias ke saath)</div>
        </div>

        {/* Alias toggle */}
        <div style={{ padding: 20, borderBottom: '1px solid #eaeded', background: alias ? '#f0fdf4' : '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700 }}>Alias</div>
              <div style={{ fontSize: 12, color: '#879596', marginTop: 2 }}>ALB DNS name ko point karo — IP ki zaroorat nahi, free queries</div>
            </div>
            <div
              onClick={() => setAlias(!alias)}
              style={{ width: 44, height: 24, background: alias ? '#1d8102' : '#aab7b8', borderRadius: 12, cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ position: 'absolute', top: 2, left: alias ? 22 : 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            </div>
          </div>

          {alias && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Route traffic to</div>
              <select style={{ border: '1px solid #aab7b8', borderRadius: 4, padding: '8px 12px', fontSize: 13, width: '100%', maxWidth: 400, marginBottom: 10 }}>
                <option>Alias to Application and Classic Load Balancer</option>
                <option>Alias to CloudFront distribution</option>
                <option>Alias to S3 website endpoint</option>
              </select>
              <select style={{ border: '1px solid #aab7b8', borderRadius: 4, padding: '8px 12px', fontSize: 13, width: 220, marginBottom: 10, marginLeft: 8 }}>
                <option>Asia Pacific (Mumbai) ap-south-1</option>
              </select>
              <div style={{ marginTop: 8 }}>
                <select style={{ border: '1px solid #0073bb', borderRadius: 4, padding: '8px 12px', fontSize: 13, width: '100%', maxWidth: 500 }}>
                  <option>{ALB_DNS}</option>
                </select>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#1d8102', background: '#f0fdf4', padding: 10, borderRadius: 4, border: '1px solid #9be9a8' }}>
                ✅ ALB select ho gaya: <b>{ALB_DNS}</b><br />
                Ye {subdomain}.myapp.com ko is ALB pe point karega
              </div>
            </div>
          )}
        </div>

        {/* Routing policy */}
        <div style={{ padding: 20, borderBottom: '1px solid #eaeded' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Routing policy</div>
          <select style={{ border: '1px solid #aab7b8', borderRadius: 4, padding: '8px 12px', fontSize: 13, width: 300 }}>
            <option>Simple routing</option>
            <option>Weighted</option>
            <option>Failover</option>
            <option>Latency</option>
            <option>Geolocation</option>
          </select>
          <div style={{ fontSize: 12, color: '#879596', marginTop: 6 }}>Simple = seedha ALB ko bhejo. Weighted = traffic split (A/B testing)</div>
        </div>

        {/* Buttons */}
        <div style={{ padding: 20, display: 'flex', gap: 12 }}>
          <button onClick={() => setActive('alb-link')} style={{ background: '#ff9900', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            Create records
          </button>
          <button style={{ background: '#fff', color: '#16191f', border: '1px solid #aab7b8', padding: '10px 24px', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 5. ALB + Route 53 Connection ──────────────────────────────────────────────
function AlbLinkSection({ setActive }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Step 1 — ALB banao (EC2 Console)',
      icon: '⚖️',
      color: '#0073bb',
      content: (
        <div style={{ fontSize: 13, lineHeight: 1.9 }}>
          <b>EC2 Console → Load Balancers → Create Load Balancer</b><br /><br />
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            {[
              ['Type', 'Application Load Balancer'],
              ['Name', 'my-app-alb'],
              ['Scheme', 'Internet-facing'],
              ['IP type', 'IPv4'],
              ['VPC', 'vpc-xxxxxxxx (apni VPC)'],
              ['AZs', 'ap-south-1a, ap-south-1b (2 subnets select karo)'],
              ['Security Group', 'alb-sg (port 80, 443 open)'],
            ].map(([k, v], i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eaeded' }}>
                <td style={{ padding: '6px 12px', fontWeight: 600, color: '#879596', width: 160 }}>{k}</td>
                <td style={{ padding: '6px 12px', fontFamily: 'monospace', fontSize: 12 }}>{v}</td>
              </tr>
            ))}
          </table>
          <div style={{ marginTop: 12, padding: 10, background: '#e8f4fd', borderRadius: 4, fontSize: 12 }}>
            ✅ ALB ban gaya. AWS dega: <b>{ALB_DNS}</b>
          </div>
        </div>
      ),
    },
    {
      title: 'Step 2 — Target Groups banao',
      icon: '🎯',
      color: '#1d8102',
      content: (
        <div style={{ fontSize: 13, lineHeight: 1.9 }}>
          <b>EC2 Console → Target Groups → Create target group</b><br /><br />
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { tg: 'orders-tg',   ec2: 'EC2-1:3000', path: '/health' },
              { tg: 'products-tg', ec2: 'EC2-2:3000', path: '/health' },
              { tg: 'admin-tg',    ec2: 'EC2-3:3000', path: '/health' },
            ].map((t, i) => (
              <div key={i} style={{ background: '#f0fdf4', border: '1px solid #9be9a8', borderRadius: 4, padding: '8px 12px' }}>
                <span style={{ fontWeight: 700, color: '#1d8102' }}>{t.tg}</span>
                <span style={{ color: '#879596', fontSize: 12, marginLeft: 12 }}>→ {t.ec2} | health: {t.path}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#879596' }}>
            Har target group mein apne EC2 register karo
          </div>
        </div>
      ),
    },
    {
      title: 'Step 3 — Listener Rules add karo',
      icon: '📋',
      color: '#d97706',
      content: (
        <div style={{ fontSize: 13, lineHeight: 1.9 }}>
          <b>ALB → Listeners → HTTP:80 → View/edit rules</b><br /><br />
          <div style={{ background: '#0f172a', borderRadius: 6, padding: 14, fontFamily: 'monospace', fontSize: 12, lineHeight: 2 }}>
            <div style={{ color: '#86efac' }}># ALB Listener Rules (priority order)</div>
            <div><span style={{ color: '#fbbf24' }}>Rule 1:</span> <span style={{ color: '#67e8f9' }}>Host = api.myapp.com</span> <span style={{ color: '#e2e8f0' }}>→ orders-tg</span></div>
            <div><span style={{ color: '#fbbf24' }}>Rule 2:</span> <span style={{ color: '#67e8f9' }}>Host = shop.myapp.com</span> <span style={{ color: '#e2e8f0' }}>→ products-tg</span></div>
            <div><span style={{ color: '#fbbf24' }}>Rule 3:</span> <span style={{ color: '#67e8f9' }}>Host = admin.myapp.com</span> <span style={{ color: '#e2e8f0' }}>→ admin-tg</span></div>
            <div style={{ color: '#64748b' }}>Default: 404</div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#879596' }}>
            ALB request ka <b>Host header</b> dekhega → match → EC2 ko bhejega
          </div>
        </div>
      ),
    },
    {
      title: 'Step 4 — Route 53 Records banao',
      icon: '🌐',
      color: '#7c3aed',
      content: (
        <div style={{ fontSize: 13, lineHeight: 1.9 }}>
          <b>Route 53 → myapp.com → Create record (3 baar)</b><br /><br />
          {[
            { sub: 'api',   desc: 'Orders API' },
            { sub: 'shop',  desc: 'Products API' },
            { sub: 'admin', desc: 'Admin Panel' },
          ].map((r, i) => (
            <div key={i} style={{ background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 4, padding: '10px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div><span style={{ color: '#879596', fontSize: 12 }}>Name:</span> <b>{r.sub}.myapp.com</b></div>
                <div><span style={{ color: '#879596', fontSize: 12 }}>Type:</span> A</div>
                <div><span style={{ color: '#879596', fontSize: 12 }}>Alias:</span> <span style={{ color: '#1d8102' }}>Yes ✅</span></div>
                <div><span style={{ color: '#879596', fontSize: 12 }}>→</span> <span style={{ color: '#7c3aed', fontFamily: 'monospace', fontSize: 11 }}>ALB DNS</span></div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: 10, background: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: 4, fontSize: 12 }}>
            ✅ Done! Teeno subdomains same ALB pe point karte hain.<br />
            ALB unhe alag-alag EC2 pe bhejega Host header se.
          </div>
        </div>
      ),
    },
    {
      title: 'Step 5 — Test karo',
      icon: '✅',
      color: '#dc2626',
      content: (
        <div style={{ fontSize: 13, lineHeight: 1.9 }}>
          <b>Browser mein type karo:</b><br /><br />
          <div style={{ background: '#0f172a', borderRadius: 6, padding: 14, fontFamily: 'monospace', fontSize: 12, lineHeight: 2.2 }}>
            <div><span style={{ color: '#fbbf24' }}>https://api.myapp.com/orders</span>   <span style={{ color: '#86efac' }}>→ Orders EC2</span></div>
            <div><span style={{ color: '#fbbf24' }}>https://shop.myapp.com/products</span> <span style={{ color: '#86efac' }}>→ Products EC2</span></div>
            <div><span style={{ color: '#fbbf24' }}>https://admin.myapp.com/dashboard</span> <span style={{ color: '#86efac' }}>→ Admin EC2</span></div>
          </div>
          <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #9be9a8', borderRadius: 4, padding: 12, fontSize: 12 }}>
            🎉 Ek ALB se teen alag subdomains handle ho rahe hain!<br />
            Route 53 DNS resolve karta hai → ALB Host header dekhta hai → sahi EC2 ko bhejta hai
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb steps={['Route 53', 'ALB Integration']} />
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Route 53 + ALB — Complete Setup Guide</h2>

      {/* Step tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, flexWrap: 'wrap' }}>
        {steps.map((s, i) => (
          <div key={i} onClick={() => setStep(i)} style={{ padding: '10px 16px', cursor: 'pointer', background: step === i ? s.color : '#fff', color: step === i ? '#fff' : '#16191f', border: '1px solid #d5dbdb', borderRight: i < steps.length - 1 ? 'none' : '1px solid #d5dbdb', fontSize: 13, fontWeight: step === i ? 700 : 400 }}>
            {s.icon} Step {i + 1}
          </div>
        ))}
      </div>

      <div style={{ ...CARD, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: steps[step].color, marginBottom: 16 }}>{steps[step].title}</div>
        {steps[step].content}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {step > 0 && <button onClick={() => setStep(step - 1)} style={{ background: '#fff', border: '1px solid #aab7b8', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>← Pichla</button>}
          {step < steps.length - 1 && <button onClick={() => setStep(step + 1)} style={{ background: '#ff9900', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Agla Step →</button>}
        </div>
      </div>
    </div>
  );
}

// ── 5b. Real ALB Demo ─────────────────────────────────────────────────────────
function RealAlbSection() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const endpoints = [
    { id: 'alb-health',    label: '❤️ Health (ALB → Orders Pod)',    url: `${ALB_BASE()}/health`,    displayUrl: `http://${ALB_DNS}/health`,    color: '#1d8102', desc: '/health → orders-tg → k8s pod:30080' },
    { id: 'alb-orders',    label: '🛒 Orders (ALB → Orders Pod)',    url: `${ALB_BASE()}/orders`,    displayUrl: `http://${ALB_DNS}/orders`,    color: '#7c3aed', desc: '/orders → orders-tg → k8s pod:30080' },
    { id: 'alb-products',  label: '📦 Products (ALB → Products Pod)', url: `${ALB_BASE()}/products`,  displayUrl: `http://${ALB_DNS}/products`,  color: '#0891b2', desc: '/products → products-tg → k8s pod:30081' },
    { id: 'alb-combined',  label: '🔗 Pod-to-Pod via ALB',           url: `${ALB_BASE()}/combined`,  displayUrl: `http://${ALB_DNS}/combined`,  color: '#d97706', desc: '/combined → orders-tg → orders calls products internally' },
  ];

  const call = async (ep) => {
    setLoading(l => ({ ...l, [ep.id]: true }));
    const start = Date.now();
    try {
      const r = await fetch(ep.url, { signal: AbortSignal.timeout(8000) });
      const d = await r.json();
      setResults(r2 => ({ ...r2, [ep.id]: { ok: true, data: d, ms: Date.now() - start } }));
    } catch (e) {
      setResults(r2 => ({ ...r2, [ep.id]: { ok: false, error: e.message, ms: Date.now() - start } }));
    }
    setLoading(l => ({ ...l, [ep.id]: false }));
  };

  return (
    <div>
      <Breadcrumb steps={['Route 53', 'Real ALB (Live)']} />
      <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>🟢 Real ALB — Live Demo</h2>
      <p style={{ fontSize: 13, color: '#879596', margin: '0 0 16px' }}>
        Ye actual AWS ALB hai — abhi live chal raha hai. Path-based routing se orders aur products pod ko forward karta hai.
      </p>

      {/* ALB Info Card */}
      <div style={{ ...CARD, padding: 16, background: '#f0fdf4', border: '1px solid #9be9a8', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 13, alignItems: 'center' }}>
          <span style={{ color: '#879596', fontWeight: 600 }}>ALB Name:</span>
          <span style={{ fontFamily: 'monospace' }}>host-routing-alb</span>
          <span style={{ color: '#879596', fontWeight: 600 }}>DNS:</span>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#0073bb', wordBreak: 'break-all' }}>{ALB_DNS}</span>
          <span style={{ color: '#879596', fontWeight: 600 }}>Region:</span>
          <span>ap-south-1 (Mumbai)</span>
          <span style={{ color: '#879596', fontWeight: 600 }}>Scheme:</span>
          <span>Internet-facing</span>
          <span style={{ color: '#879596', fontWeight: 600 }}>Target Groups:</span>
          <span>orders-tg (port 30080) + products-tg (port 30081)</span>
        </div>
      </div>

      {/* Flow Chart Link */}
      <div style={{ marginBottom: 16 }}>
        <a
          href="/alb-flow.html"
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0f172a', color: '#67e8f9', padding: '10px 20px', borderRadius: 6, textDecoration: 'none', fontWeight: 700, fontSize: 13, border: '1px solid #334155' }}
        >
          📊 ALB Flow Chart — Full Diagram + Live Test dekho
        </a>
        <span style={{ marginLeft: 12, fontSize: 12, color: '#879596' }}>Naye tab mein khulega — Host-based routing ka poora flow</span>
      </div>

      {/* Listener Rules Table */}
      <div style={{ ...CARD, marginBottom: 16 }}>
        <div style={{ padding: '10px 16px', fontWeight: 700, borderBottom: '1px solid #eaeded', fontSize: 14 }}>
          ALB Listener Rules — port 80
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Priority</th>
              <th style={TH}>Condition (Path)</th>
              <th style={TH}>Action</th>
              <th style={TH}>Target Group</th>
              <th style={TH}>k8s Port</th>
            </tr>
          </thead>
          <tbody>
            {[
              { p: 10,  cond: '/products*', tg: 'products-tg', port: 30081, color: '#0891b2' },
              { p: 20,  cond: '/orders*',   tg: 'orders-tg',   port: 30080, color: '#7c3aed' },
              { p: 30,  cond: '/health',    tg: 'orders-tg',   port: 30080, color: '#1d8102' },
              { p: 100, cond: 'Default',    tg: 'orders-tg',   port: 30080, color: '#879596' },
            ].map((r, i) => (
              <tr key={i}>
                <td style={TD}>{r.p}</td>
                <td style={{ ...TD, fontFamily: 'monospace', color: r.color, fontWeight: 600 }}>{r.cond}</td>
                <td style={TD}>forward</td>
                <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12 }}>{r.tg}</td>
                <td style={{ ...TD, fontFamily: 'monospace' }}>{r.port}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Architecture */}
      <div style={{ ...CARD, padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', fontWeight: 700, borderBottom: '1px solid #eaeded', background: '#0f172a', color: '#e2e8f0', fontSize: 13 }}>
          Request Flow — Browser → ALB → k8s Pod
        </div>
        <div style={{ background: '#0f172a', padding: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 2.2, overflowX: 'auto' }}>
          <div><span style={{ color: '#fbbf24' }}>GET {ALB_DNS}/orders</span></div>
          <div style={{ color: '#64748b' }}>  ↓ ALB receives request</div>
          <div><span style={{ color: '#67e8f9' }}>  Rule match: path = /orders* → orders-tg</span></div>
          <div style={{ color: '#64748b' }}>  ↓ forward to target</div>
          <div><span style={{ color: '#86efac' }}>  EC2 13.201.138.12:30080 (NodePort)</span></div>
          <div style={{ color: '#64748b' }}>  ↓ kube-proxy forward</div>
          <div><span style={{ color: '#f472b6' }}>  Orders Pod :3000 → GET /orders → JSON</span></div>
          <br />
          <div><span style={{ color: '#fbbf24' }}>GET {ALB_DNS}/products</span></div>
          <div style={{ color: '#64748b' }}>  ↓ ALB receives request</div>
          <div><span style={{ color: '#67e8f9' }}>  Rule match: path = /products* → products-tg</span></div>
          <div style={{ color: '#64748b' }}>  ↓ forward to target</div>
          <div><span style={{ color: '#86efac' }}>  EC2 13.201.138.12:30081 (NodePort)</span></div>
          <div style={{ color: '#64748b' }}>  ↓ kube-proxy forward</div>
          <div><span style={{ color: '#f472b6' }}>  Products Pod :4000 → GET /products → JSON</span></div>
        </div>
      </div>

      {/* Live Test Buttons */}
      <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Live Test — ALB se call karo</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {endpoints.map(ep => (
          <div key={ep.id} style={{ ...CARD, padding: 16, borderLeft: `4px solid ${ep.color}`, marginBottom: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: ep.color, marginBottom: 4 }}>{ep.label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#879596', marginBottom: 4, wordBreak: 'break-all' }}>{ep.displayUrl || ep.url}</div>
            <div style={{ fontSize: 11, color: '#879596', marginBottom: 10 }}>{ep.desc}</div>
            <button
              onClick={() => call(ep)}
              disabled={loading[ep.id]}
              style={{ background: ep.color, color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: loading[ep.id] ? 0.6 : 1, width: '100%' }}>
              {loading[ep.id] ? '⏳ Calling ALB...' : '▶ ALB se Call Karo'}
            </button>
            {results[ep.id] && (
              <div style={{ marginTop: 10, background: results[ep.id].ok ? '#f0fdf4' : '#fff5f5', border: `1px solid ${results[ep.id].ok ? '#9be9a8' : '#feb2b2'}`, borderRadius: 4, padding: 10 }}>
                <div style={{ fontSize: 11, color: '#879596', marginBottom: 4 }}>
                  {results[ep.id].ok ? '✅' : '❌'} {results[ep.id].ms}ms — ALB → k8s Pod
                </div>
                <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto', color: results[ep.id].ok ? '#1d8102' : '#dc2626' }}>
                  {results[ep.id].ok ? JSON.stringify(results[ep.id].data, null, 2) : results[ep.id].error}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ ...CARD, padding: 16, marginTop: 16, background: '#fff8e1', border: '1px solid #f9c74f' }}>
        <b>ℹ️ Host-based routing ke liye Route 53 chahiye</b>
        <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.8 }}>
          Abhi <b>path-based routing</b> hai: <code>/orders</code> → orders pod, <code>/products</code> → products pod<br />
          <b>Host-based routing</b> ke liye chahiye:<br />
          &nbsp;&nbsp;Route 53: <code>api.myapp.com</code> → this ALB<br />
          &nbsp;&nbsp;Route 53: <code>shop.myapp.com</code> → this ALB<br />
          &nbsp;&nbsp;ALB Rule: Host = api.myapp.com → orders-tg<br />
          &nbsp;&nbsp;ALB Rule: Host = shop.myapp.com → products-tg<br />
          <span style={{ color: '#879596' }}>nip.io ALB ke saath kaam nahi karta (ALB ka static IP nahi hota)</span>
        </div>
      </div>
    </div>
  );
}

// ── 6. nip.io Free DNS ────────────────────────────────────────────────────────
function NipioSection() {
  return (
    <div>
      <Breadcrumb steps={['Route 53', 'Free DNS Alternative']} />
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>nip.io — Free DNS (Route 53 ke bina learning)</h2>

      <div style={{ ...CARD, padding: 16, background: '#fff8e1', border: '1px solid #f9c74f', marginBottom: 16 }}>
        <b>Route 53 cost lagti hai ($0.50/zone + queries)</b><br />
        <span style={{ fontSize: 13 }}>Learning ke liye <b>nip.io</b> use karo — same concept, bilkul free!</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={CARD}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #eaeded', fontWeight: 700, color: '#dc2626' }}>Route 53 (Production)</div>
          <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 2 }}>
            <div style={{ color: '#879596' }}># Route 53 Console mein banate hain:</div>
            <div>api.myapp.com → ALB DNS</div>
            <div>shop.myapp.com → ALB DNS</div>
            <div style={{ color: '#d97706', marginTop: 8 }}>Cost: $0.50/month</div>
            <div style={{ color: '#d97706' }}>Domain chahiye (register karo)</div>
          </div>
        </div>
        <div style={CARD}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #eaeded', fontWeight: 700, color: '#1d8102' }}>nip.io (Free Learning)</div>
          <div style={{ padding: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 2 }}>
            <div style={{ color: '#879596' }}># Kuch nahi karna — direct use karo:</div>
            <div>api.{EC2_IP}.nip.io → {EC2_IP}</div>
            <div>shop.{EC2_IP}.nip.io → {EC2_IP}</div>
            <div style={{ color: '#1d8102', marginTop: 8 }}>Cost: FREE 🎉</div>
            <div style={{ color: '#1d8102' }}>No setup, no domain needed</div>
          </div>
        </div>
      </div>

      <div style={CARD}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #eaeded', fontWeight: 700 }}>nip.io kaise kaam karta hai?</div>
        <div style={{ padding: 16, background: '#0f172a', fontFamily: 'monospace', fontSize: 13, lineHeight: 2.2 }}>
          <div style={{ color: '#86efac' }}># Pattern: anything.IP.nip.io → IP</div>
          <div><span style={{ color: '#fbbf24' }}>api</span>.<span style={{ color: '#67e8f9' }}>{EC2_IP}</span>.nip.io → <span style={{ color: '#86efac' }}>{EC2_IP}</span></div>
          <div><span style={{ color: '#fbbf24' }}>shop</span>.<span style={{ color: '#67e8f9' }}>{EC2_IP}</span>.nip.io → <span style={{ color: '#86efac' }}>{EC2_IP}</span></div>
          <div><span style={{ color: '#fbbf24' }}>admin</span>.<span style={{ color: '#67e8f9' }}>{EC2_IP}</span>.nip.io → <span style={{ color: '#86efac' }}>{EC2_IP}</span></div>
          <div style={{ color: '#64748b', marginTop: 8 }}># Subdomain koi bhi ho — sab same IP milegi</div>
          <div style={{ color: '#64748b' }}># Port manually likhna padta hai (NodePort)</div>
          <div style={{ color: '#fbbf24', marginTop: 8 }}>http://api.{EC2_IP}.nip.io:30080/orders</div>
        </div>
      </div>
    </div>
  );
}

// ── 7. Live Test ──────────────────────────────────────────────────────────────
function LiveTestSection() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const endpoints = [
    { id: 'orders',  label: '🛒 Orders',  url: `${K3S_ORDERS()}/orders`,   nipio: `${K3S_ORDERS()}/orders`,   displayUrl: `http://${EC2_IP}:30080/orders`,  displayNipio: `http://api.${EC2_IP}.nip.io:30080/orders`,  color: '#7c3aed' },
    { id: 'products',label: '📦 Products',url: `${K3S_PRODUCTS()}/products`,nipio: `${K3S_PRODUCTS()}/products`,displayUrl: `http://${EC2_IP}:30081/products`, displayNipio: `http://shop.${EC2_IP}.nip.io:30081/products`, color: '#0891b2' },
    { id: 'health',  label: '❤️ Health',  url: `${K3S_ORDERS()}/health`,   nipio: `${K3S_ORDERS()}/health`,   displayUrl: `http://${EC2_IP}:30080/health`,  displayNipio: `http://api.${EC2_IP}.nip.io:30080/health`,  color: '#1d8102' },
    { id: 'combined',label: '🔗 Pod-to-Pod', url: `${K3S_ORDERS()}/combined`, nipio: `${K3S_ORDERS()}/combined`, displayUrl: `http://${EC2_IP}:30080/combined`, displayNipio: `http://api.${EC2_IP}.nip.io:30080/combined`, color: '#d97706' },
  ];

  const call = async (ep, useNipio) => {
    const key = ep.id + (useNipio ? '-nip' : '-ip');
    setLoading(l => ({ ...l, [key]: true }));
    const url = useNipio ? ep.nipio : ep.url;
    const start = Date.now();
    try {
      const r  = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const d  = await r.json();
      setResults(r2 => ({ ...r2, [key]: { ok: true, data: d, ms: Date.now() - start, url } }));
    } catch (e) {
      setResults(r2 => ({ ...r2, [key]: { ok: false, error: e.message, ms: Date.now() - start, url } }));
    }
    setLoading(l => ({ ...l, [key]: false }));
  };

  return (
    <div>
      <Breadcrumb steps={['Route 53', 'Live Test']} />
      <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Live API Test — Direct IP vs nip.io DNS</h2>
      <p style={{ fontSize: 13, color: '#879596', margin: '0 0 16px' }}>Dono methods se call karo — concept same hai, sirf DNS alag hai</p>

      {endpoints.map(ep => (
        <div key={ep.id} style={{ ...CARD, padding: 16, borderLeft: `4px solid ${ep.color}` }}>
          <div style={{ fontWeight: 700, marginBottom: 10, color: ep.color }}>{ep.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Direct IP */}
            <div>
              <div style={{ fontSize: 11, color: '#879596', marginBottom: 4 }}>Direct IP (no DNS)</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#545b64', marginBottom: 6, wordBreak: 'break-all' }}>{ep.displayUrl || ep.url}</div>
              <button onClick={() => call(ep, false)} disabled={loading[ep.id + '-ip']} style={{ background: ep.color, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, opacity: loading[ep.id + '-ip'] ? 0.6 : 1 }}>
                {loading[ep.id + '-ip'] ? '⏳...' : '▶ Call'}
              </button>
              {results[ep.id + '-ip'] && (
                <div style={{ marginTop: 8, background: results[ep.id + '-ip'].ok ? '#f0fdf4' : '#fff5f5', border: `1px solid ${results[ep.id + '-ip'].ok ? '#9be9a8' : '#feb2b2'}`, borderRadius: 4, padding: 8 }}>
                  <div style={{ fontSize: 10, color: '#879596', marginBottom: 4 }}>{results[ep.id + '-ip'].ms}ms</div>
                  <pre style={{ margin: 0, fontSize: 10, whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto', color: results[ep.id + '-ip'].ok ? '#1d8102' : '#dc2626' }}>
                    {results[ep.id + '-ip'].ok ? JSON.stringify(results[ep.id + '-ip'].data, null, 2) : results[ep.id + '-ip'].error}
                  </pre>
                </div>
              )}
            </div>
            {/* nip.io */}
            <div>
              <div style={{ fontSize: 11, color: '#879596', marginBottom: 4 }}>nip.io DNS (free Route 53)</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#545b64', marginBottom: 6, wordBreak: 'break-all' }}>{ep.displayNipio || ep.nipio}</div>
              <button onClick={() => call(ep, true)} disabled={loading[ep.id + '-nip']} style={{ background: '#1d8102', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, opacity: loading[ep.id + '-nip'] ? 0.6 : 1 }}>
                {loading[ep.id + '-nip'] ? '⏳...' : '▶ nip.io se Call'}
              </button>
              {results[ep.id + '-nip'] && (
                <div style={{ marginTop: 8, background: results[ep.id + '-nip'].ok ? '#f0fdf4' : '#fff5f5', border: `1px solid ${results[ep.id + '-nip'].ok ? '#9be9a8' : '#feb2b2'}`, borderRadius: 4, padding: 8 }}>
                  <div style={{ fontSize: 10, color: '#879596', marginBottom: 4 }}>{results[ep.id + '-nip'].ms}ms</div>
                  <pre style={{ margin: 0, fontSize: 10, whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto', color: results[ep.id + '-nip'].ok ? '#1d8102' : '#dc2626' }}>
                    {results[ep.id + '-nip'].ok ? JSON.stringify(results[ep.id + '-nip'].data, null, 2) : results[ep.id + '-nip'].error}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const SECTIONS = {
  'dashboard':     (p) => <Dashboard setActive={p.setActive} />,
  'hosted-zones':  (p) => <HostedZones setActive={p.setActive} />,
  'records':       (p) => <RecordsList setActive={p.setActive} />,
  'create-record': (p) => <CreateRecord setActive={p.setActive} />,
  'alb-link':      (p) => <AlbLinkSection setActive={p.setActive} />,
  'real-alb':      (p) => <RealAlbSection />,
  'nipio':         (p) => <NipioSection />,
  'live':          (p) => <LiveTestSection />,
};

export default function Route53Page() {
  const [active, setActive] = useState('dashboard');

  return (
    <div style={PAGE}>
      <AwsNavBar />

      {/* Sub-header */}
      <div style={{ background: '#232f3e', borderTop: '1px solid #37475a', padding: '0 20px 0 20px', display: 'flex', alignItems: 'center', gap: 16, height: 36 }}>
        <span style={{ color: '#d5dbdb', fontSize: 13, fontWeight: 700 }}>Route 53</span>
        <span style={{ color: '#879596', fontSize: 12 }}>|</span>
        <span style={{ color: '#879596', fontSize: 12 }}>DNS Management</span>
        <span style={{ flex: 1 }} />
        <a href="/kubernetes" style={{ color: '#67aee5', fontSize: 12, textDecoration: 'none' }}>← Kubernetes</a>
        <a href="/aws-demo"   style={{ color: '#67aee5', fontSize: 12, textDecoration: 'none' }}>AWS Demo →</a>
      </div>

      <div style={{ display: 'flex' }}>
        <Sidebar active={active} setActive={setActive} />
        <div style={{ flex: 1, padding: 24, maxWidth: 900 }}>
          {SECTIONS[active]?.({ setActive }) ?? <div>Not found</div>}
        </div>
      </div>
    </div>
  );
}
