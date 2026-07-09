import { useState } from 'react';
import { Link } from 'react-router-dom';

// Live deployed resources
const VPC_ID        = 'vpc-086bd228d1fe3cf3f';
const BASTION_ID    = 'i-0029294ce8f11d4e6';
const BASTION_IP    = '13.201.118.213';
const PRIVATE_ID    = 'i-06b6fac3ed469c00b';
const PRIVATE_IP    = '10.0.3.133';
const NAT_ID      = 'nat-0da31a23c2abeb0a8';
const NACL_ID     = 'acl-00d56bdb31da155c1';
const REGION      = 'ap-south-1';
const STACK       = 'demo-vpc-production';

const SUBNETS = [
  { id: 'subnet-01e1bdda28a95b51c', name: 'demo-public-subnet-1a',  cidr: '10.0.1.0/24', az: 'ap-south-1a', type: 'public',  route: 'IGW' },
  { id: 'subnet-06c10087b60547980', name: 'demo-public-subnet-1b',  cidr: '10.0.2.0/24', az: 'ap-south-1b', type: 'public',  route: 'IGW' },
  { id: 'subnet-03f1ceaf9e34edf75', name: 'demo-private-subnet-1a', cidr: '10.0.3.0/24', az: 'ap-south-1a', type: 'private', route: 'NAT' },
  { id: 'subnet-0ba84e2652a3ec4bc', name: 'demo-private-subnet-1b', cidr: '10.0.4.0/24', az: 'ap-south-1b', type: 'private', route: 'NAT' },
];

const NACL_RULES = {
  inbound: [
    { rule: 100, type: 'HTTP',      protocol: 'TCP', port: '80',        cidr: '0.0.0.0/0', action: 'ALLOW' },
    { rule: 110, type: 'HTTPS',     protocol: 'TCP', port: '443',       cidr: '0.0.0.0/0', action: 'ALLOW' },
    { rule: 120, type: 'SSH',       protocol: 'TCP', port: '22',        cidr: '0.0.0.0/0', action: 'ALLOW' },
    { rule: 130, type: 'Ephemeral', protocol: 'TCP', port: '1024-65535',cidr: '0.0.0.0/0', action: 'ALLOW' },
    { rule: '*', type: 'All',       protocol: 'All', port: 'All',       cidr: '0.0.0.0/0', action: 'DENY'  },
  ],
  outbound: [
    { rule: 100, type: 'All Traffic', protocol: 'All', port: 'All', cidr: '0.0.0.0/0', action: 'ALLOW' },
    { rule: '*', type: 'All',         protocol: 'All', port: 'All', cidr: '0.0.0.0/0', action: 'DENY'  },
  ],
};

const PAGE = { fontFamily: "'Amazon Ember', Arial, sans-serif", background: '#f2f3f3', minHeight: '100vh', color: '#16191f' };
const CARD = { background: '#fff', border: '1px solid #d5dbdb', borderRadius: 4, marginBottom: 16 };
const TH   = { background: '#f2f3f3', padding: '8px 12px', fontSize: 12, fontWeight: 700, textAlign: 'left', borderBottom: '1px solid #d5dbdb', whiteSpace: 'nowrap' };
const TD   = { padding: '8px 12px', fontSize: 12, borderBottom: '1px solid #eaeded', verticalAlign: 'top' };
const BADGE = (color) => ({ background: color, color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 });

function NavBar() {
  return (
    <div style={{ background: '#232f3e', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 20, height: 40 }}>
      <span style={{ color: '#ff9900', fontWeight: 800, fontSize: 18, letterSpacing: -1 }}>aws</span>
      <span style={{ color: '#d5dbdb', fontSize: 13 }}>Services</span>
      <span style={{ color: '#ff9900', fontSize: 13 }}>VPC</span>
      <span style={{ color: '#d5dbdb', fontSize: 13 }}>›</span>
      <span style={{ color: '#d5dbdb', fontSize: 13 }}>demo-vpc-production</span>
      <span style={{ flex: 1 }} />
      <span style={{ color: '#d5dbdb', fontSize: 12 }}>{REGION} (Mumbai)</span>
      <Link to="/" style={{ color: '#d5dbdb', fontSize: 12, textDecoration: 'none' }}>← Back</Link>
    </div>
  );
}

function Sidebar({ active, setActive }) {
  const groups = [
    { label: 'Virtual private cloud', items: [
      { id: 'dashboard',  label: '🏠 VPC Dashboard' },
      { id: 'your-vpcs',  label: '🌐 Your VPCs' },
      { id: 'subnets',    label: '📦 Subnets' },
      { id: 'route-tables', label: '🗺️ Route Tables' },
      { id: 'igw',        label: '🌍 Internet Gateways' },
      { id: 'nat',        label: '🔄 NAT Gateways' },
    ]},
    { label: 'Security', items: [
      { id: 'nacl',       label: '🛡️ Network ACLs' },
      { id: 'sg',         label: '🔒 Security Groups' },
    ]},
    { label: 'Bastion Host Demo', items: [
      { id: 'bastion',    label: '🏰 Bastion Host Setup' },
      { id: 'ssh-access', label: '🔑 SSH Access Steps' },
    ]},
    { label: 'CloudFormation', items: [
      { id: 'cfn',        label: '📋 CF Template' },
    ]},
    { label: 'Concepts', items: [
      { id: 'concepts',   label: '📚 VPC vs NAT vs NACL' },
    ]},
  ];
  return (
    <div style={{ width: 230, background: '#fff', borderRight: '1px solid #d5dbdb', minHeight: 'calc(100vh - 40px)', padding: '8px 0', flexShrink: 0 }}>
      {groups.map(g => (
        <div key={g.label}>
          <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 700, color: '#879596', textTransform: 'uppercase', letterSpacing: 1 }}>{g.label}</div>
          {g.items.map(it => (
            <div key={it.id} onClick={() => setActive(it.id)}
              style={{ padding: '7px 20px', fontSize: 13, cursor: 'pointer', background: active === it.id ? '#e8f4fd' : 'transparent', color: active === it.id ? '#0073bb' : '#16191f', borderLeft: active === it.id ? '3px solid #0073bb' : '3px solid transparent', fontWeight: active === it.id ? 600 : 400 }}>
              {it.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Dashboard() {
  const stats = [
    { label: 'VPCs', value: 2, sub: '1 custom + 1 default', color: '#0073bb' },
    { label: 'Subnets', value: 4, sub: '2 public + 2 private', color: '#1d8102' },
    { label: 'Internet Gateways', value: 1, sub: 'Attached to demo-vpc', color: '#d97706' },
    { label: 'NAT Gateways', value: 1, sub: 'Available ⚠️ ~₹3.7/hr', color: '#dc2626' },
    { label: 'Route Tables', value: 2, sub: 'Public + Private', color: '#7c3aed' },
    { label: 'Network ACLs', value: 1, sub: 'demo-nacl-production', color: '#0891b2' },
  ];
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>VPC Dashboard</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...CARD, padding: 16, borderTop: `3px solid ${s.color}`, marginBottom: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#879596' }}>{s.sub}</div>
          </div>
        ))}
      </div>
      {/* Architecture Diagram */}
      <div style={{ ...CARD, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🏗️ VPC Architecture — demo-vpc-production</div>
        <div style={{ background: '#0f172a', borderRadius: 6, padding: 16, fontFamily: 'monospace', fontSize: 11, lineHeight: 2, color: '#e2e8f0', overflowX: 'auto' }}>
          <div style={{ color: '#67e8f9' }}>VPC: 10.0.0.0/16 ({VPC_ID})</div>
          <div>  ├── <span style={{ color: '#fbbf24' }}>Internet Gateway (IGW)</span> — internet se connection</div>
          <div>  │</div>
          <div>  ├── <span style={{ color: '#86efac' }}>Public Subnet 1a</span>  10.0.1.0/24  → Route: 0.0.0.0/0 → IGW</div>
          <div>  │     └── NAT Gateway ({NAT_ID})</div>
          <div>  ├── <span style={{ color: '#86efac' }}>Public Subnet 1b</span>  10.0.2.0/24  → Route: 0.0.0.0/0 → IGW</div>
          <div>  │</div>
          <div>  ├── <span style={{ color: '#f472b6' }}>Private Subnet 1a</span> 10.0.3.0/24  → Route: 0.0.0.0/0 → NAT</div>
          <div>  ├── <span style={{ color: '#f472b6' }}>Private Subnet 1b</span> 10.0.4.0/24  → Route: 0.0.0.0/0 → NAT</div>
          <div>  │</div>
          <div>  └── <span style={{ color: '#a78bfa' }}>NACL</span> ({NACL_ID}) — subnet-level firewall</div>
        </div>
      </div>
      <div style={{ ...CARD, padding: 12, background: '#fff8e1', border: '1px solid #f59e0b' }}>
        <span style={{ fontSize: 12, color: '#92400e' }}>⚠️ <b>NAT Gateway cost:</b> ~$0.045/hour (~₹3.7/hr). Stack: <code>{STACK}</code> — demo ke baad delete karo: <code>aws cloudformation delete-stack --stack-name {STACK}</code></span>
      </div>
    </div>
  );
}

function YourVpcs() {
  const vpcs = [
    { id: VPC_ID, name: 'demo-vpc-production', cidr: '10.0.0.0/16', state: 'available', default: false, dns: true },
    { id: 'vpc-065599aca72278f93', name: '—', cidr: '172.31.0.0/16', state: 'available', default: true, dns: true },
  ];
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Your VPCs</div>
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Name','VPC ID','State','IPv4 CIDR','Default','DNS Hostnames'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {vpcs.map(v => (
              <tr key={v.id}>
                <td style={TD}>{v.name}</td>
                <td style={{ ...TD, fontFamily: 'monospace', color: '#0073bb' }}>{v.id}</td>
                <td style={TD}><span style={BADGE('#1d8102')}>✅ {v.state}</span></td>
                <td style={{ ...TD, fontFamily: 'monospace' }}>{v.cidr}</td>
                <td style={TD}>{v.default ? '✅ Yes' : '❌ No'}</td>
                <td style={TD}>{v.dns ? 'Enabled' : 'Disabled'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubnetsSection() {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Subnets</div>
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Name','Subnet ID','Type','IPv4 CIDR','AZ','Route Target'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {SUBNETS.map(s => (
              <tr key={s.id}>
                <td style={TD}>{s.name}</td>
                <td style={{ ...TD, fontFamily: 'monospace', fontSize: 11, color: '#0073bb' }}>{s.id}</td>
                <td style={TD}><span style={BADGE(s.type === 'public' ? '#1d8102' : '#7c3aed')}>{s.type}</span></td>
                <td style={{ ...TD, fontFamily: 'monospace' }}>{s.cidr}</td>
                <td style={TD}>{s.az}</td>
                <td style={TD}><span style={{ fontFamily: 'monospace', background: '#f2f3f3', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>0.0.0.0/0 → {s.route}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RouteTables() {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Route Tables</div>
      {[
        { name: 'demo-public-rt', subnets: ['10.0.1.0/24', '10.0.2.0/24'], routes: [
          { dest: '10.0.0.0/16', target: 'local', note: 'VPC internal traffic' },
          { dest: '0.0.0.0/0',   target: 'igw-xxx (Internet Gateway)', note: 'Internet access' },
        ]},
        { name: 'demo-private-rt', subnets: ['10.0.3.0/24', '10.0.4.0/24'], routes: [
          { dest: '10.0.0.0/16', target: 'local', note: 'VPC internal traffic' },
          { dest: '0.0.0.0/0',   target: `${NAT_ID} (NAT Gateway)`, note: 'Internet via NAT (outbound only)' },
        ]},
      ].map(rt => (
        <div key={rt.name} style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, background: '#f8fafc', borderBottom: '1px solid #eaeded' }}>
            🗺️ {rt.name} <span style={{ fontSize: 11, color: '#879596', fontWeight: 400 }}>({rt.subnets.join(', ')})</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Destination','Target','Note'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {rt.routes.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...TD, fontFamily: 'monospace', fontWeight: 700 }}>{r.dest}</td>
                  <td style={{ ...TD, fontFamily: 'monospace', fontSize: 11, color: '#0073bb' }}>{r.target}</td>
                  <td style={{ ...TD, color: '#879596' }}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function NatSection() {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>NAT Gateways</div>
      <div style={{ ...CARD, padding: 16, background: '#f0fdf4', border: '1px solid #9be9a8' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 20px', fontSize: 13 }}>
          {[['NAT Gateway ID', NAT_ID], ['Status', '✅ Available'], ['Subnet', 'demo-public-subnet-1a (10.0.1.0/24)'], ['Connectivity type', 'Public'], ['VPC', VPC_ID]].map(([k,v]) => (
            <><span style={{ color: '#879596', fontWeight: 600 }}>{k}:</span><span style={{ fontFamily: k.includes('ID') || k.includes('VPC') || k.includes('Subnet') ? 'monospace' : 'inherit' }}>{v}</span></>
          ))}
        </div>
      </div>
      <div style={{ ...CARD, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>NAT Gateway kya karta hai?</div>
        <div style={{ background: '#0f172a', padding: 12, borderRadius: 6, fontFamily: 'monospace', fontSize: 11, lineHeight: 2, color: '#e2e8f0' }}>
          <div style={{ color: '#f472b6' }}>Private EC2 (10.0.3.x)</div>
          <div>  ↓  internet chahiye (npm install, apt-get, S3 call)</div>
          <div style={{ color: '#fbbf24' }}>Private Route Table: 0.0.0.0/0 → NAT Gateway</div>
          <div>  ↓</div>
          <div style={{ color: '#86efac' }}>NAT Gateway (Public Subnet) → Elastic IP</div>
          <div>  ↓</div>
          <div style={{ color: '#67e8f9' }}>Internet</div>
          <div style={{ color: '#94a3b8', marginTop: 8 }}>Note: Bahar se Private EC2 directly accessible NAHI hoti</div>
          <div style={{ color: '#94a3b8' }}>      Sirf OUTBOUND traffic (private → internet)</div>
        </div>
      </div>
    </div>
  );
}

function NaclSection() {
  const [tab, setTab] = useState('inbound');
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Network ACLs</div>
      <div style={{ ...CARD, padding: 12, background: '#f0fdf4', border: '1px solid #9be9a8', marginBottom: 12 }}>
        <b>NACL ID:</b> <code>{NACL_ID}</code> &nbsp;|&nbsp; <b>Name:</b> demo-nacl-production &nbsp;|&nbsp; <b>Subnets:</b> Public 1a + 1b
      </div>
      <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #d5dbdb' }}>
          {['inbound', 'outbound'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', background: tab === t ? '#fff' : '#f2f3f3', border: 'none', borderBottom: tab === t ? '2px solid #0073bb' : 'none', cursor: 'pointer', fontWeight: tab === t ? 700 : 400, fontSize: 13, color: tab === t ? '#0073bb' : '#545b64' }}>
              {t === 'inbound' ? '⬇️ Inbound Rules' : '⬆️ Outbound Rules'}
            </button>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Rule #','Type','Protocol','Port Range','Source/Dest','Allow/Deny'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {NACL_RULES[tab].map((r, i) => (
              <tr key={i} style={{ background: r.action === 'DENY' ? '#fff5f5' : '#fff' }}>
                <td style={{ ...TD, fontWeight: 700 }}>{r.rule}</td>
                <td style={TD}>{r.type}</td>
                <td style={TD}>{r.protocol}</td>
                <td style={{ ...TD, fontFamily: 'monospace' }}>{r.port}</td>
                <td style={{ ...TD, fontFamily: 'monospace' }}>{r.cidr}</td>
                <td style={TD}><span style={BADGE(r.action === 'ALLOW' ? '#1d8102' : '#dc2626')}>{r.action}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CfnTemplate() {
  const [copied, setCopied] = useState(false);
  const cmd = `aws cloudformation deploy \\
  --template-file vpc-nat-nacl.yaml \\
  --stack-name demo-vpc-production \\
  --parameter-overrides CreateNatGateway=true \\
  --region ap-south-1`;
  const deleteCmd = `aws cloudformation delete-stack --stack-name demo-vpc-production --region ap-south-1`;
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📋 CloudFormation Template</div>
      <div style={{ ...CARD, padding: 16, background: '#f0fdf4', border: '1px solid #9be9a8' }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>✅ Stack Deployed: {STACK}</div>
        <div style={{ fontSize: 12, color: '#545b64' }}>File: <code>D:\lambda-project\lambda-aws-project\vpc\vpc-nat-nacl.yaml</code></div>
      </div>
      {[
        { title: '🚀 Deploy Command', code: cmd, color: '#1d8102' },
        { title: '🗑️ Delete Stack (cost bachao)', code: deleteCmd, color: '#dc2626' },
      ].map(block => (
        <div key={block.title} style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, background: '#f8fafc', borderBottom: '1px solid #eaeded', color: block.color }}>{block.title}</div>
          <pre style={{ margin: 0, padding: 12, background: '#0f172a', color: '#86efac', fontSize: 12, overflowX: 'auto' }}>{block.code}</pre>
        </div>
      ))}
      <div style={{ ...CARD, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Template mein kya-kya bana?</div>
        {[
          ['VPC', '10.0.0.0/16 — DNS enabled', '#0073bb'],
          ['Public Subnet 1a', '10.0.1.0/24 — ap-south-1a — MapPublicIpOnLaunch: true', '#1d8102'],
          ['Public Subnet 1b', '10.0.2.0/24 — ap-south-1b — MapPublicIpOnLaunch: true', '#1d8102'],
          ['Private Subnet 1a', '10.0.3.0/24 — ap-south-1a — public IP nahi milega', '#7c3aed'],
          ['Private Subnet 1b', '10.0.4.0/24 — ap-south-1b — public IP nahi milega', '#7c3aed'],
          ['Internet Gateway', 'VPC se attach — public subnets ko internet milta hai', '#d97706'],
          ['Elastic IP', 'NAT Gateway ka static public IP', '#d97706'],
          ['NAT Gateway', 'Public subnet mein — private → internet (outbound)', '#dc2626'],
          ['Public Route Table', '0.0.0.0/0 → IGW — public subnet ke liye', '#0891b2'],
          ['Private Route Table', '0.0.0.0/0 → NAT — private subnet ke liye', '#0891b2'],
          ['NACL', 'HTTP/HTTPS/SSH allow, ephemeral ports allow, all else deny', '#879596'],
        ].map(([name, desc, color]) => (
          <div key={name} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid #f2f3f3', fontSize: 13 }}>
            <span style={{ minWidth: 160, fontWeight: 600, color }}>{name}</span>
            <span style={{ color: '#545b64' }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Concepts() {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📚 VPC vs NAT vs NACL — Kya Karta Hai?</div>
      {[
        {
          title: '🌐 VPC (Virtual Private Cloud)',
          color: '#0073bb',
          points: [
            'AWS par tumhara apna isolated network',
            'Jaise office building ka apna internal network',
            'CIDR block define karo (10.0.0.0/16 = 65,536 IPs)',
            'Subnets, route tables, security — sab iske andar',
            'EC2, RDS, Lambda — sab VPC ke andar run hote hain',
          ],
        },
        {
          title: '🔄 NAT Gateway (Network Address Translation)',
          color: '#dc2626',
          points: [
            'Private subnet ki EC2 ko outbound internet access deta hai',
            'Lekin bahar se koi seedha private EC2 ko access nahi kar sakta',
            'Public subnet mein deploy hota hai — Elastic IP attach hoti hai',
            'Use case: Private EC2 pe npm install, S3 call, OS update',
            '⚠️ Cost: ~$0.045/hour + data transfer — hamesha delete karo demo ke baad',
          ],
        },
        {
          title: '🛡️ NACL (Network Access Control List)',
          color: '#7c3aed',
          points: [
            'Subnet-level firewall — Security Group se pehle check hota hai',
            'Stateless hai — inbound allow kiya to outbound separately allow karna padega',
            'Rule number se priority decide hoti hai (100 pehle, * last = deny all)',
            'Ephemeral ports (1024-65535) allow karna padta hai return traffic ke liye',
            'Security Group = EC2-level, NACL = Subnet-level — dono alag hain',
          ],
        },
        {
          title: '⚖️ NACL vs Security Group',
          color: '#0891b2',
          isTable: true,
          rows: [
            ['Level', 'Subnet level', 'EC2 instance level'],
            ['Stateful?', '❌ Stateless', '✅ Stateful (return auto allow)'],
            ['Rules', 'Allow + Deny dono', 'Sirf Allow (no explicit deny)'],
            ['Order', 'Rule number se (100 first)', 'Sab rules evaluate hote hain'],
            ['Default', 'Allow all (default NACL)', 'Deny all inbound, allow outbound'],
          ],
        },
      ].map(section => (
        <div key={section.title} style={{ ...CARD, padding: 16, borderLeft: `4px solid ${section.color}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: section.color, marginBottom: 8 }}>{section.title}</div>
          {section.isTable ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{['', 'NACL', 'Security Group'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>{section.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ ...TD, fontWeight: j === 0 ? 700 : 400 }}>{c}</td>)}</tr>)}</tbody>
            </table>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
              {section.points.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function BastionSection() {
  const instances = [
    { id: BASTION_ID, name: 'demo-bastion-production', type: 'Bastion', subnet: 'Public 10.0.1.0/24', publicIp: BASTION_IP, privateIp: '10.0.1.221', sg: 'demo-bastion-sg (SSH: 0.0.0.0/0)', color: '#1d8102' },
    { id: PRIVATE_ID, name: 'demo-private-ec2-production', type: 'Private', subnet: 'Private 10.0.3.0/24', publicIp: '❌ None', privateIp: PRIVATE_IP, sg: 'demo-private-ec2-sg (SSH: Bastion SG only)', color: '#7c3aed' },
  ];
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🏰 Bastion Host Setup</div>
      {/* Architecture */}
      <div style={{ ...CARD, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Architecture — Bastion se Private EC2 kaise access karte hain</div>
        <div style={{ background: '#0f172a', borderRadius: 6, padding: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 2, color: '#e2e8f0' }}>
          <div><span style={{ color: '#67e8f9' }}>Tumhara Laptop</span></div>
          <div>  ↓ SSH port 22 (public internet)</div>
          <div><span style={{ color: '#86efac' }}>Bastion EC2 ({BASTION_IP})</span>  ← Public Subnet 10.0.1.0/24</div>
          <div>  │   Instance ID: {BASTION_ID}</div>
          <div>  │   SG: SSH from anywhere (0.0.0.0/0)</div>
          <div>  ↓ SSH port 22 (private network only)</div>
          <div><span style={{ color: '#f472b6' }}>Private EC2 ({PRIVATE_IP})</span>  ← Private Subnet 10.0.3.0/24</div>
          <div>  │   Instance ID: {PRIVATE_ID}</div>
          <div>  │   SG: SSH sirf Bastion SG se, NO public IP</div>
          <div>  │   NAT Gateway → internet outbound</div>
          <div>  ↓</div>
          <div><span style={{ color: '#fbbf24' }}>Private EC2 par koi bhi service run karo (Express, RDS, etc.)</span></div>
        </div>
      </div>
      {/* EC2 Table */}
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Name','Type','Instance ID','Public IP','Private IP','Subnet','Security Group'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {instances.map(i => (
              <tr key={i.id}>
                <td style={TD}><b>{i.name}</b></td>
                <td style={TD}><span style={BADGE(i.color)}>{i.type}</span></td>
                <td style={{ ...TD, fontFamily: 'monospace', fontSize: 11, color: '#0073bb' }}>{i.id}</td>
                <td style={{ ...TD, fontFamily: 'monospace', fontWeight: i.publicIp !== '❌ None' ? 700 : 400, color: i.publicIp !== '❌ None' ? '#1d8102' : '#dc2626' }}>{i.publicIp}</td>
                <td style={{ ...TD, fontFamily: 'monospace' }}>{i.privateIp}</td>
                <td style={TD}>{i.subnet}</td>
                <td style={{ ...TD, fontSize: 11 }}>{i.sg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* SG Rules */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { title: '🛡️ Bastion SG (demo-bastion-sg)', rules: [['Inbound', 'SSH 22', '0.0.0.0/0', 'ALLOW', '#1d8102'], ['Outbound', 'All', '0.0.0.0/0', 'ALLOW', '#1d8102']] },
          { title: '🔒 Private EC2 SG (demo-private-ec2-sg)', rules: [['Inbound', 'SSH 22', 'demo-bastion-sg only', 'ALLOW', '#7c3aed'], ['Inbound', 'TCP 3000', 'demo-bastion-sg only', 'ALLOW', '#7c3aed'], ['Outbound', 'All', '0.0.0.0/0', 'ALLOW', '#1d8102']] },
        ].map(sg => (
          <div key={sg.title} style={{ ...CARD, padding: 0, overflow: 'hidden', marginBottom: 0 }}>
            <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 12, background: '#f8fafc', borderBottom: '1px solid #eaeded' }}>{sg.title}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Direction','Port','Source','Action'].map(h => <th key={h} style={{ ...TH, fontSize: 11 }}>{h}</th>)}</tr></thead>
              <tbody>{sg.rules.map((r, i) => <tr key={i}><td style={{ ...TD, fontSize: 11 }}>{r[0]}</td><td style={{ ...TD, fontFamily: 'monospace', fontSize: 11 }}>{r[1]}</td><td style={{ ...TD, fontSize: 11 }}>{r[2]}</td><td style={TD}><span style={BADGE(r[4])}>{r[3]}</span></td></tr>)}</tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

function SshAccessSection() {
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>🔑 SSH Access — Step by Step</div>
      {[
        {
          step: 'Step 1', title: 'Bastion pe SSH karo (tumhare laptop se)',
          color: '#1d8102',
          code: `ssh -i "rajesh-key-pair.pem" ec2-user@${BASTION_IP}`,
          note: 'Bastion public IP hai — seedha internet se access hoti hai',
        },
        {
          step: 'Step 2', title: 'Private EC2 pe Jump karo (Bastion se)',
          color: '#7c3aed',
          code: `# Bastion ke andar se yeh run karo:
ssh -i "rajesh-key-pair.pem" ec2-user@${PRIVATE_IP}`,
          note: `Private EC2 ka koi public IP nahi (${PRIVATE_IP} sirf VPC internal hai). Bastion se hi access ho sakti hai.`,
        },
        {
          step: 'Shortcut', title: 'SSH ProxyJump — Ek Command mein seedha private EC2',
          color: '#d97706',
          code: `ssh -i "rajesh-key-pair.pem" \\
  -J ec2-user@${BASTION_IP} \\
  ec2-user@${PRIVATE_IP}`,
          note: 'ProxyJump (-J) automatically Bastion se hop karta hai — laptop se directly private EC2 open hoti hai',
        },
        {
          step: 'SSH Config', title: '~/.ssh/config mein save karo (recommended)',
          color: '#0891b2',
          code: `# ~/.ssh/config
Host bastion
  HostName ${BASTION_IP}
  User ec2-user
  IdentityFile ~/.ssh/rajesh-key-pair.pem

Host private-ec2
  HostName ${PRIVATE_IP}
  User ec2-user
  IdentityFile ~/.ssh/rajesh-key-pair.pem
  ProxyJump bastion

# Ab simply:
ssh bastion        # Bastion pe jaao
ssh private-ec2    # Directly private EC2 pe jaao (bastion via proxy)`,
          note: 'Config save karne ke baad long command likhni nahi padti',
        },
        {
          step: 'Verify', title: 'Private EC2 par internet check karo (NAT se)',
          color: '#879596',
          code: `# Private EC2 ke andar se:
curl https://checkip.amazonaws.com
# → NAT Gateway ka Elastic IP dikhega (tumhara private EC2 IP nahi)

# Yeh confirm karta hai:
# Private EC2 → NAT Gateway → Internet (outbound only)`,
          note: 'Private EC2 ka apna public IP nahi hota — NAT Gateway ka shared IP use hota hai',
        },
      ].map(s => (
        <div key={s.step} style={{ ...CARD, padding: 0, overflow: 'hidden', borderLeft: `4px solid ${s.color}` }}>
          <div style={{ padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #eaeded', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={BADGE(s.color)}>{s.step}</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</span>
          </div>
          <pre style={{ margin: 0, padding: '12px 16px', background: '#0f172a', color: '#86efac', fontSize: 12, overflowX: 'auto' }}>{s.code}</pre>
          <div style={{ padding: '8px 12px', fontSize: 12, color: '#545b64', background: '#f8fafc' }}>💡 {s.note}</div>
        </div>
      ))}
      <div style={{ ...CARD, padding: 12, background: '#fff8e1', border: '1px solid #f59e0b', fontSize: 12 }}>
        <b>⚠️ Cost reminder:</b> Bastion + Private EC2 = 2 × t3.micro (~$0.0104/hr each). Delete after demo:<br/>
        <code>aws ec2 terminate-instances --instance-ids {BASTION_ID} {PRIVATE_ID} --region ap-south-1</code>
      </div>
    </div>
  );
}

const SECTIONS = {
  'dashboard':   () => <Dashboard />,
  'your-vpcs':   () => <YourVpcs />,
  'subnets':     () => <SubnetsSection />,
  'route-tables':() => <RouteTables />,
  'igw':         () => <div style={{ padding: 8 }}><div style={{ fontWeight: 700, fontSize: 14 }}>🌍 Internet Gateway</div><div style={{ ...CARD, padding: 12, marginTop: 12 }}>demo-igw-production — VPC: {VPC_ID} — State: ✅ attached</div></div>,
  'nat':         () => <NatSection />,
  'nacl':        () => <NaclSection />,
  'sg':          () => <div style={{ padding: 8, color: '#879596' }}>Security Groups — existing project ke SGs yahan dikhenge (ec2 wale SGs alag hain)</div>,
  'bastion':     () => <BastionSection />,
  'ssh-access':  () => <SshAccessSection />,
  'cfn':         () => <CfnTemplate />,
  'concepts':    () => <Concepts />,
};

export default function VpcPage() {
  const [active, setActive] = useState('dashboard');
  const Section = SECTIONS[active] || SECTIONS['dashboard'];
  return (
    <div style={PAGE}>
      <NavBar />
      <div style={{ display: 'flex' }}>
        <Sidebar active={active} setActive={setActive} />
        <div style={{ flex: 1, padding: 20, minWidth: 0 }}>
          <Section />
        </div>
      </div>
    </div>
  );
}
