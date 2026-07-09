import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ACCOUNT = '527055790362';
const REGION  = 'ap-south-1';
const ECR_BASE = `${ACCOUNT}.dkr.ecr.${REGION}.amazonaws.com`;
const CLUSTER_NAME = 'my-demo-eks';
const CLUSTER_ACTIVE = false; // true karo jab recreate karo

const repos = [
  { name: 'orders-api',                uri: `${ECR_BASE}/orders-api`,                tag: 'v1', size: '45 MB', pushed: '2026-06-27', pods: 1, port: 3000, nodePort: 30080 },
  { name: 'products-api',              uri: `${ECR_BASE}/products-api`,              tag: 'v1', size: '45 MB', pushed: '2026-06-28', pods: 1, port: 4000, nodePort: 30081 },
  { name: 'ec2-express-ecs-production',uri: `${ECR_BASE}/ec2-express-ecs-production`,tag: 'latest', size: '92 MB', pushed: '2026-06-23', pods: 0, port: 3000, nodePort: null },
  { name: 'radio-booking-api',         uri: `${ECR_BASE}/radio-booking-api`,         tag: 'latest', size: '48 MB', pushed: '2026-06-20', pods: 0, port: 3000, nodePort: null },
];

const PAGE = { fontFamily: "'Amazon Ember', Arial, sans-serif", background: '#f2f3f3', minHeight: '100vh', color: '#16191f' };
const CARD = { background: '#fff', border: '1px solid #d5dbdb', borderRadius: 4, marginBottom: 16 };
const TH   = { background: '#f2f3f3', padding: '8px 12px', fontSize: 12, fontWeight: 700, textAlign: 'left', borderBottom: '1px solid #d5dbdb', color: '#16191f', whiteSpace: 'nowrap' };
const TD   = { padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #eaeded', verticalAlign: 'top' };

function NavBar() {
  return (
    <div style={{ background: '#232f3e', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 20, height: 40 }}>
      <span style={{ color: '#ff9900', fontWeight: 800, fontSize: 18, letterSpacing: -1 }}>aws</span>
      <span style={{ color: '#d5dbdb', fontSize: 13 }}>Services</span>
      <span style={{ color: '#ff9900', fontSize: 13 }}>ECR</span>
      <span style={{ color: '#d5dbdb', fontSize: 13 }}>›</span>
      <span style={{ color: '#d5dbdb', fontSize: 13 }}>EKS</span>
      <span style={{ flex: 1 }} />
      <span style={{ color: '#d5dbdb', fontSize: 12 }}>ap-south-1 (Mumbai)</span>
      <Link to="/" style={{ color: '#d5dbdb', fontSize: 12, textDecoration: 'none' }}>← Back to App</Link>
    </div>
  );
}

function Sidebar({ active, setActive }) {
  const items = [
    { id: 'ecr-repos',   label: '📦 ECR Repositories' },
    { id: 'ecr-images',  label: '🖼️  ECR Images' },
    { id: 'ecr-pull',    label: '⬇️  Docker Pull Commands' },
    { id: 'eks-cluster', label: `☸️  EKS Cluster ${CLUSTER_ACTIVE ? '🟢' : '🔴'}` },
    { id: 'eks-nodes',   label: '🖥️  Node Group' },
    { id: 'eks-pods',    label: '🟢 Deploy Pods from ECR' },
    { id: 'eks-vs-k3s',  label: '⚖️  EKS vs k3s' },
    { id: 'live',        label: '🧪 Live API Test' },
    { id: 'eks-logs',    label: '📋 EKS Pod Logs (Proof)' },
  ];
  return (
    <div style={{ width: 220, background: '#fff', borderRight: '1px solid #d5dbdb', minHeight: 'calc(100vh - 40px)', padding: '16px 0', flexShrink: 0 }}>
      <div style={{ padding: '4px 16px 8px', fontSize: 11, fontWeight: 700, color: '#879596', textTransform: 'uppercase', letterSpacing: 1 }}>ECR + EKS</div>
      {items.map(it => (
        <div key={it.id} onClick={() => setActive(it.id)}
          style={{ padding: '8px 20px', fontSize: 13, cursor: 'pointer', background: active === it.id ? '#e8f4fd' : 'transparent', color: active === it.id ? '#0073bb' : '#16191f', borderLeft: active === it.id ? '3px solid #0073bb' : '3px solid transparent', fontWeight: active === it.id ? 600 : 400 }}>
          {it.label}
        </div>
      ))}
    </div>
  );
}

// ── ECR Repositories ──────────────────────────────────────────────────────────
function EcrRepos({ setActive }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>ECR — Elastic Container Registry</h2>
      <p style={{ fontSize: 13, color: '#879596', margin: '0 0 16px' }}>AWS ka private Docker registry — images securely store karo aur EKS/ECS se pull karo</p>

      <div style={{ ...CARD, padding: 16, background: '#e8f4fd', border: '1px solid #bee3f8', marginBottom: 16 }}>
        <b style={{ color: '#0073bb' }}>ECR kya karta hai?</b>
        <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.9 }}>
          <b>docker build</b> → image banao locally<br />
          <b>docker tag</b> → ECR URI se tag karo<br />
          <b>docker push</b> → ECR mein upload karo<br />
          <b>EKS/k3s</b> → ECR se pull karke pod run karo
        </div>
      </div>

      <div style={CARD}>
        <div style={{ padding: '10px 16px', fontWeight: 700, borderBottom: '1px solid #eaeded', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Private repositories ({repos.length})</span>
          <span style={{ fontSize: 12, color: '#879596' }}>Region: ap-south-1</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Repository name</th>
              <th style={TH}>URI</th>
              <th style={TH}>Tag</th>
              <th style={TH}>Size</th>
              <th style={TH}>Last pushed</th>
              <th style={TH}>k3s pods</th>
            </tr>
          </thead>
          <tbody>
            {repos.map((r, i) => (
              <tr key={i}>
                <td style={{ ...TD, color: '#0073bb', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{r.name}</td>
                <td style={{ ...TD, fontFamily: 'monospace', fontSize: 11, color: '#879596' }}>{r.uri}</td>
                <td style={TD}><span style={{ background: '#e8f4fd', color: '#0073bb', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace' }}>{r.tag}</span></td>
                <td style={TD}>{r.size}</td>
                <td style={TD}>{r.pushed}</td>
                <td style={TD}>
                  {r.pods > 0
                    ? <span style={{ color: '#1d8102', fontWeight: 600 }}>✅ {r.pods} running</span>
                    : <span style={{ color: '#879596' }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={() => setActive('ecr-pull')} style={{ background: '#ff9900', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
        Pull Commands dekho →
      </button>
    </div>
  );
}

// ── ECR Pull Commands ─────────────────────────────────────────────────────────
function EcrPull() {
  const [copied, setCopied] = useState('');
  const copy = (txt, id) => { navigator.clipboard.writeText(txt); setCopied(id); setTimeout(() => setCopied(''), 2000); };

  const blocks = [
    {
      title: 'Step 1 — ECR Login (Docker authenticate karo)',
      color: '#7c3aed',
      code: `aws ecr get-login-password --region ap-south-1 | \\
  docker login --username AWS --password-stdin \\
  ${ACCOUNT}.dkr.ecr.ap-south-1.amazonaws.com`,
    },
    {
      title: 'Step 2 — orders-api pull karo',
      color: '#0891b2',
      code: `docker pull ${ECR_BASE}/orders-api:v1`,
    },
    {
      title: 'Step 3 — products-api pull karo',
      color: '#059669',
      code: `docker pull ${ECR_BASE}/products-api:v1`,
    },
    {
      title: 'Step 4 — locally run karo (test)',
      color: '#d97706',
      code: `docker run -p 3000:3000 ${ECR_BASE}/orders-api:v1\ndocker run -p 4000:4000 ${ECR_BASE}/products-api:v1`,
    },
    {
      title: 'Step 5 — EKS mein deploy karo (kubectl)',
      color: '#dc2626',
      code: `kubectl create deployment orders --image=${ECR_BASE}/orders-api:v1\nkubectl create deployment products --image=${ECR_BASE}/products-api:v1\nkubectl expose deployment orders --port=3000 --type=NodePort\nkubectl expose deployment products --port=4000 --type=NodePort`,
    },
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>ECR — Docker Pull Commands</h2>
      <p style={{ fontSize: 13, color: '#879596', margin: '0 0 16px' }}>ECR se image pull karke EKS/k3s mein deploy karne ka step-by-step guide</p>
      {blocks.map((b, i) => (
        <div key={i} style={{ ...CARD, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', fontWeight: 700, fontSize: 13, background: '#0f172a', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${b.color}` }}>
            <span>{b.title}</span>
            <button onClick={() => copy(b.code, i)} style={{ background: copied === i ? '#059669' : '#334155', color: '#fff', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
              {copied === i ? '✅ Copied' : 'Copy'}
            </button>
          </div>
          <pre style={{ margin: 0, padding: '14px 16px', background: '#0f172a', color: '#86efac', fontSize: 12, lineHeight: 1.8, overflowX: 'auto' }}>{b.code}</pre>
        </div>
      ))}
    </div>
  );
}

// ── EKS Cluster ───────────────────────────────────────────────────────────────
function EksCluster() {
  const [status, setStatus] = useState('checking...');
  const [clusterData, setClusterData] = useState(null);

  useEffect(() => {
    fetch('/api/eks/status').then(r => r.json()).then(d => {
      setStatus(d.status);
      setClusterData(d);
    }).catch(() => setStatus('CREATING'));
  }, []);

  const statusColor = { ACTIVE: '#1d8102', CREATING: '#d97706', DELETING: '#dc2626', FAILED: '#dc2626' };

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>EKS Cluster — {CLUSTER_NAME}</h2>
      <p style={{ fontSize: 13, color: '#879596', margin: '0 0 16px' }}>Managed Kubernetes control plane — AWS handle karta hai master nodes</p>

      {/* Offline Banner */}
      {!CLUSTER_ACTIVE && (
        <div style={{ ...CARD, padding: 16, background: '#fff8e1', border: '2px solid #f59e0b', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#92400e', marginBottom: 6 }}>
            🔴 Cluster Currently Deleted (Cost Saving)
          </div>
          <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.8 }}>
            EKS cluster delete kar diya gaya — <b>$0.10/hr save ho raha hai</b>.<br />
            Dobara banana ho to <code style={{ background: '#fef3c7', padding: '1px 6px', borderRadius: 3 }}>D:\lambda-project\lambda-aws-project\eks\eks-setup.md</code> file dekho.<br />
            <b>Recreate time:</b> ~15 min | <b>All scripts saved</b> ✅
          </div>
          <div style={{ marginTop: 10, fontFamily: 'monospace', fontSize: 12, background: '#1c1917', color: '#86efac', padding: 10, borderRadius: 4 }}>
            {`# Quick recreate (Step 2 se shuru karo - IAM roles already hain):\naws eks create-cluster --name my-demo-eks --role-arn arn:aws:iam::527055790362:role/eks-cluster-role \\\n  --resources-vpc-config subnetIds=subnet-0e4f8a39a1e33b77e,subnet-08f4b25fe38bdf09a \\\n  --kubernetes-version 1.31 --region ap-south-1`}
          </div>
        </div>
      )}

      {/* Cluster Status Card */}
      <div style={{ ...CARD, padding: 16, marginBottom: 16, borderLeft: `4px solid ${CLUSTER_ACTIVE ? (statusColor[status] || '#d97706') : '#6b7280'}` }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 20px', fontSize: 13, alignItems: 'center' }}>
          <span style={{ color: '#879596', fontWeight: 600 }}>Cluster name:</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{CLUSTER_NAME}</span>
          <span style={{ color: '#879596', fontWeight: 600 }}>Status:</span>
          <span style={{ fontWeight: 700, color: statusColor[status] || '#d97706' }}>
            {status === 'CREATING' ? '⏳' : status === 'ACTIVE' ? '✅' : '🔄'} {status}
            {status === 'CREATING' && <span style={{ fontSize: 12, color: '#879596', fontWeight: 400 }}> — 10-15 min lagenge</span>}
          </span>
          <span style={{ color: '#879596', fontWeight: 600 }}>Region:</span>
          <span>ap-south-1 (Mumbai)</span>
          <span style={{ color: '#879596', fontWeight: 600 }}>K8s Version:</span>
          <span>1.31</span>
          <span style={{ color: '#879596', fontWeight: 600 }}>Type:</span>
          <span>Managed (AWS handles master nodes)</span>
          <span style={{ color: '#879596', fontWeight: 600 }}>Cost:</span>
          <span style={{ color: '#dc2626', fontWeight: 600 }}>$0.10/hour (delete karo jab kaam ho jaye!)</span>
          <span style={{ color: '#879596', fontWeight: 600 }}>IAM Role:</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>arn:aws:iam::527055790362:role/eks-cluster-role</span>
          <span style={{ color: '#879596', fontWeight: 600 }}>VPC:</span>
          <span style={{ fontFamily: 'monospace', fontSize: 12 }}>vpc-065599aca72278f93 (default)</span>
          <span style={{ color: '#879596', fontWeight: 600 }}>Subnets:</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>ap-south-1a, 1b, 1c</span>
        </div>
      </div>

      {/* Architecture */}
      <div style={{ ...CARD, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '10px 16px', fontWeight: 700, background: '#0f172a', color: '#e2e8f0', fontSize: 13 }}>
          EKS Architecture — Kaise kaam karta hai
        </div>
        <div style={{ background: '#0f172a', padding: 20, fontFamily: 'monospace', fontSize: 12, lineHeight: 2.4 }}>
          <div><span style={{ color: '#f472b6' }}>AWS Managed Control Plane (EKS)</span></div>
          <div style={{ paddingLeft: 20 }}>
            <span style={{ color: '#fbbf24' }}>API Server</span>
            <span style={{ color: '#64748b' }}> + </span>
            <span style={{ color: '#fbbf24' }}>etcd</span>
            <span style={{ color: '#64748b' }}> + </span>
            <span style={{ color: '#fbbf24' }}>Scheduler</span>
            <span style={{ color: '#64748b' }}> + </span>
            <span style={{ color: '#fbbf24' }}>Controller Manager</span>
          </div>
          <div style={{ color: '#64748b' }}>         ↓ manages</div>
          <div><span style={{ color: '#86efac' }}>Worker Nodes (EC2 — aap pay karo)</span></div>
          <div style={{ paddingLeft: 20 }}><span style={{ color: '#67e8f9' }}>kubelet + kube-proxy + container runtime</span></div>
          <div style={{ color: '#64748b' }}>         ↓ pulls image from</div>
          <div><span style={{ color: '#a78bfa' }}>ECR — 527055790362.dkr.ecr.ap-south-1.amazonaws.com</span></div>
          <div style={{ paddingLeft: 20 }}><span style={{ color: '#fda4af' }}>orders-api:v1</span><span style={{ color: '#64748b' }}> + </span><span style={{ color: '#fda4af' }}>products-api:v1</span></div>
          <div style={{ color: '#64748b' }}>         ↓ exposed via</div>
          <div><span style={{ color: '#fb923c' }}>ALB (host-routing-alb) → NodePort → Pods</span></div>
        </div>
      </div>

      <div style={{ ...CARD, padding: 16, background: '#fff8e1', border: '1px solid #f9c74f' }}>
        <b>⚠️ Delete karna mat bhoolo!</b>
        <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.8 }}>
          <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: 3, fontSize: 12 }}>
            aws eks delete-cluster --name my-demo-eks --region ap-south-1
          </code>
          <br />
          <span style={{ color: '#879596' }}>Pehle node group delete karo, phir cluster</span>
        </div>
      </div>
    </div>
  );
}

// ── EKS Node Group ────────────────────────────────────────────────────────────
function EksNodes({ setActive }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>EKS — Node Group</h2>
      <p style={{ fontSize: 13, color: '#879596', margin: '0 0 16px' }}>Worker nodes jahan actual pods run karte hain</p>

      <div style={{ ...CARD, padding: 16, background: '#f0fdf4', border: '1px solid #9be9a8', marginBottom: 16 }}>
        <b style={{ color: '#1d8102' }}>Node Group Config (demo ke liye):</b>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 13, marginTop: 10 }}>
          {[
            ['Instance Type', 't3.small (sabse sasta)'],
            ['Min nodes', '1'],
            ['Max nodes', '2'],
            ['Desired', '1'],
            ['IAM Role', 'eks-node-role'],
            ['AMI', 'Amazon Linux 2 (EKS optimized)'],
            ['Disk', '20 GB gp2'],
            ['Cost', '~$0.0208/hr (t3.small)'],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: '#879596', fontWeight: 600, minWidth: 120 }}>{k}:</span>
              <span style={{ fontFamily: k === 'Instance Type' || k === 'AMI' ? 'monospace' : 'inherit', fontSize: 12 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...CARD, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '10px 16px', fontWeight: 700, background: '#0f172a', color: '#e2e8f0', fontSize: 13 }}>Node Group Create Command</div>
        <pre style={{ margin: 0, padding: '14px 16px', background: '#0f172a', color: '#86efac', fontSize: 12, lineHeight: 1.8, overflowX: 'auto' }}>{`aws eks create-nodegroup \\
  --cluster-name my-demo-eks \\
  --nodegroup-name demo-nodes \\
  --node-role arn:aws:iam::527055790362:role/eks-node-role \\
  --subnets subnet-0e4f8a39a1e33b77e subnet-08f4b25fe38bdf09a \\
  --instance-types t3.small \\
  --scaling-config minSize=1,maxSize=2,desiredSize=1 \\
  --region ap-south-1`}</pre>
      </div>

      <div style={{ ...CARD, padding: 16, background: '#fff8e1', border: '1px solid #f9c74f' }}>
        <b>⚠️ Cluster ACTIVE hone ke baad hi node group create karo</b>
        <div style={{ fontSize: 13, marginTop: 4, color: '#879596' }}>EKS cluster CREATING state mein hai — 10-15 min baad ACTIVE hoga</div>
      </div>

      <button onClick={() => setActive('eks-pods')} style={{ marginTop: 12, background: '#0073bb', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
        Pods Deploy karo →
      </button>
    </div>
  );
}

// ── Deploy Pods from ECR ──────────────────────────────────────────────────────
function EksPods() {
  const [copied, setCopied] = useState('');
  const copy = (txt, id) => { navigator.clipboard.writeText(txt); setCopied(id); setTimeout(() => setCopied(''), 2000); };

  const yamls = [
    {
      title: 'orders-api Deployment + Service',
      color: '#7c3aed',
      code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: orders-api
  template:
    metadata:
      labels:
        app: orders-api
    spec:
      containers:
      - name: orders-api
        image: ${ECR_BASE}/orders-api:v1
        ports:
        - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: orders-service
spec:
  type: NodePort
  selector:
    app: orders-api
  ports:
  - port: 3000
    targetPort: 3000
    nodePort: 30080`,
    },
    {
      title: 'products-api Deployment + Service',
      color: '#0891b2',
      code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: products-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: products-api
  template:
    metadata:
      labels:
        app: products-api
    spec:
      containers:
      - name: products-api
        image: ${ECR_BASE}/products-api:v1
        ports:
        - containerPort: 4000
---
apiVersion: v1
kind: Service
metadata:
  name: products-service
spec:
  type: NodePort
  selector:
    app: products-api
  ports:
  - port: 4000
    targetPort: 4000
    nodePort: 30081`,
    },
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>EKS — ECR se Pods Deploy karo</h2>
      <p style={{ fontSize: 13, color: '#879596', margin: '0 0 16px' }}>ECR images ko EKS cluster mein kubectl se deploy karo</p>

      <div style={{ ...CARD, padding: 14, background: '#0f172a', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>Step 1 — kubectl configure karo</div>
        <pre style={{ margin: 0, color: '#86efac', fontSize: 12, lineHeight: 1.8 }}>{`aws eks update-kubeconfig --name my-demo-eks --region ap-south-1
kubectl get nodes  # worker nodes dikhenge`}</pre>
      </div>

      {yamls.map((y, i) => (
        <div key={i} style={{ ...CARD, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '8px 14px', fontWeight: 700, fontSize: 13, background: '#0f172a', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${y.color}` }}>
            <span>{y.title}</span>
            <button onClick={() => copy(y.code, i)} style={{ background: copied === i ? '#059669' : '#334155', color: '#fff', border: 'none', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
              {copied === i ? '✅ Copied' : 'Copy YAML'}
            </button>
          </div>
          <pre style={{ margin: 0, padding: '14px 16px', background: '#0f172a', color: '#a5f3fc', fontSize: 11, lineHeight: 1.8, overflowX: 'auto' }}>{y.code}</pre>
        </div>
      ))}

      <div style={{ ...CARD, padding: 14, background: '#0f172a' }}>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>Step 3 — Verify karo</div>
        <pre style={{ margin: 0, color: '#fbbf24', fontSize: 12, lineHeight: 1.8 }}>{`kubectl get pods         # orders-api + products-api pods dikhenge
kubectl get services    # NodePort 30080, 30081 dikhenge
kubectl get deployments # deployment status`}</pre>
      </div>
    </div>
  );
}

// ── EKS vs k3s ───────────────────────────────────────────────────────────────
function EksVsK3s() {
  const rows = [
    ['Control plane',   'AWS managed ($0.10/hr)', 'Self-managed (free on EC2)'],
    ['Setup time',      '15-20 minutes',           '< 5 minutes'],
    ['Cost',            '$0.10/hr + EC2',          'Only EC2 cost'],
    ['HA by default',   '✅ Yes',                  '❌ Single node'],
    ['kubectl works',   '✅ Yes',                  '✅ Yes'],
    ['ECR pull',        '✅ Native',                '✅ With IAM role'],
    ['ALB integration', '✅ AWS LBC addon',         '✅ Manual (working in demo)'],
    ['Production ready','✅ Fully',                 '⚠️  Small clusters only'],
    ['Demo use',        '✅ (delete after!)',       '✅ Keep running free'],
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>EKS vs k3s — Comparison</h2>
      <p style={{ fontSize: 13, color: '#879596', margin: '0 0 16px' }}>Hamare demo mein k3s chal raha hai — EKS banaya hai sikhne ke liye</p>

      <div style={CARD}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={TH}>Feature</th>
              <th style={{ ...TH, color: '#ff9900' }}>☸️ EKS (my-demo-eks)</th>
              <th style={{ ...TH, color: '#0891b2' }}>⚡ k3s (our demo — 13.201.138.12)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([feat, eks, k3s], i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...TD, fontWeight: 600 }}>{feat}</td>
                <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12 }}>{eks}</td>
                <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12, color: '#0891b2' }}>{k3s}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ ...CARD, padding: 16, background: '#f0fdf4', border: '1px solid #9be9a8' }}>
        <b style={{ color: '#1d8102' }}>💡 Hamare demo ka current setup:</b>
        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 2, fontFamily: 'monospace' }}>
          k3s on EC2 13.201.138.12<br />
          ├── orders-api pod (ECR image) → NodePort 30080<br />
          ├── products-api pod (ECR image) → NodePort 30081<br />
          └── ALB host-routing-alb → path-based → pods
        </div>
      </div>
    </div>
  );
}

// ── Live API Test ─────────────────────────────────────────────────────────────
function LiveTest() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const ALB = 'host-routing-alb-910889267.ap-south-1.elb.amazonaws.com';

  const eps = [
    { id: 'orders',   label: '🛒 Orders (ECR image running)',   url: `http://${ALB}/orders`,   color: '#7c3aed' },
    { id: 'products', label: '📦 Products (ECR image running)', url: `http://${ALB}/products`, color: '#0891b2' },
    { id: 'health',   label: '❤️ Health Check',                 url: `http://${ALB}/health`,   color: '#059669' },
  ];

  const call = async (ep) => {
    setLoading(l => ({ ...l, [ep.id]: true }));
    const t = Date.now();
    try {
      const r = await fetch(ep.url, { signal: AbortSignal.timeout(8000) });
      const d = await r.json();
      setResults(r2 => ({ ...r2, [ep.id]: { ok: true, data: d, ms: Date.now() - t } }));
    } catch (e) {
      setResults(r2 => ({ ...r2, [ep.id]: { ok: false, error: e.message, ms: Date.now() - t } }));
    }
    setLoading(l => ({ ...l, [ep.id]: false }));
  };

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Live API Test — ECR images from k3s</h2>
      <p style={{ fontSize: 13, color: '#879596', margin: '0 0 16px' }}>
        Yeh pods ECR se pull ki gayi images chal rahi hain → ALB → NodePort → Pod
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {eps.map(ep => {
          const res = results[ep.id];
          return (
            <div key={ep.id} style={{ ...CARD, padding: 16, borderLeft: `4px solid ${ep.color}`, marginBottom: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: ep.color, marginBottom: 4 }}>{ep.label}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#879596', marginBottom: 10, wordBreak: 'break-all' }}>{ep.url}</div>
              <button onClick={() => call(ep)} disabled={loading[ep.id]}
                style={{ background: ep.color, color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, opacity: loading[ep.id] ? 0.6 : 1, width: '100%' }}>
                {loading[ep.id] ? '⏳ Calling...' : '▶ Call Now'}
              </button>
              {res && (
                <div style={{ marginTop: 10, background: '#0f172a', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto' }}>
                  <span style={{ color: res.ok ? '#86efac' : '#f87171' }}>{res.ok ? `✅ ${res.ms}ms\n` : `❌ ${res.ms}ms\n${res.error}`}</span>
                  {res.ok && <span style={{ color: '#e2e8f0' }}>{JSON.stringify(res.data, null, 2)}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ ...CARD, padding: 14, marginTop: 16, background: '#e8f4fd', border: '1px solid #bee3f8' }}>
        <b style={{ color: '#0073bb' }}>Flow: Browser → ALB → k3s NodePort → ECR Image Pod</b>
        <div style={{ fontFamily: 'monospace', fontSize: 12, marginTop: 8, lineHeight: 2, color: '#16191f' }}>
          ECR: 527055790362.dkr.ecr.ap-south-1.amazonaws.com/orders-api:v1<br />
          &nbsp;&nbsp;↓ pulled by k3s (EC2 13.201.138.12)<br />
          &nbsp;&nbsp;↓ pod: express-api-7d6dc7b8bc-zm85m<br />
          &nbsp;&nbsp;↓ NodePort 30080 → ALB target group orders-tg<br />
          &nbsp;&nbsp;↓ ALB path /orders → orders-tg → pod
        </div>
      </div>
    </div>
  );
}

// ── EKS Pod Logs Proof ────────────────────────────────────────────────────────
const ALB = 'host-routing-alb-910889267.ap-south-1.elb.amazonaws.com';

function EksLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const endpoints = [
    { path: '/orders',   pod: 'orders-api-7fc769c864-bhgjv',   color: '#7c3aed', nodePort: 30748 },
    { path: '/products', pod: 'products-api-898dcb8ff-6z64p', color: '#0891b2', nodePort: 31692 },
    { path: '/health',   pod: 'orders-api-7fc769c864-bhgjv',   color: '#059669', nodePort: 30748 },
  ];

  const callAll = async () => {
    setLoading(true);
    const newLogs = [];
    for (const ep of endpoints) {
      const ts = new Date().toISOString();
      const t = Date.now();
      try {
        const r = await fetch(`http://${ALB}${ep.path}`, { signal: AbortSignal.timeout(8000) });
        const data = await r.json();
        newLogs.push({ ts, path: ep.path, status: r.status, ms: Date.now() - t, data, pod: data.servedBy || ep.pod, color: ep.color, ok: true });
      } catch (e) {
        newLogs.push({ ts, path: ep.path, status: 500, ms: Date.now() - t, error: e.message, pod: ep.pod, color: ep.color, ok: false });
      }
    }
    setLogs(prev => [...newLogs, ...prev].slice(0, 30));
    setLoading(false);
  };

  useEffect(() => {
    callAll();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(callAll, 4000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>📋 EKS Pod Logs — Live Proof</h2>
      <p style={{ fontSize: 13, color: '#879596', margin: '0 0 16px' }}>
        ALB → EKS Node (13.232.63.191) → Pod — har response mein pod name proof hai
      </p>

      {/* Flow diagram */}
      <div style={{ ...CARD, padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '8px 16px', background: '#0f172a', color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
          Request Flow — Verified
        </div>
        <div style={{ background: '#0f172a', padding: '12px 20px', fontFamily: 'monospace', fontSize: 12, lineHeight: 2.2 }}>
          <span style={{ color: '#fbbf24' }}>Browser / curl</span>
          <span style={{ color: '#475569' }}> → </span>
          <span style={{ color: '#86efac' }}>ALB: host-routing-alb-910889267</span>
          <span style={{ color: '#475569' }}> → </span>
          <span style={{ color: '#67e8f9' }}>eks-orders-tg / eks-products-tg</span>
          <span style={{ color: '#475569' }}> → </span>
          <span style={{ color: '#f472b6' }}>EKS Node: 13.232.63.191</span>
          <span style={{ color: '#475569' }}> → </span>
          <span style={{ color: '#a78bfa' }}>kube-proxy</span>
          <span style={{ color: '#475569' }}> → </span>
          <span style={{ color: '#fb923c' }}>ECR Pod (orders-api:v1 / products-api:v1)</span>
        </div>
      </div>

      {/* Offline notice */}
      {!CLUSTER_ACTIVE && (
        <div style={{ ...CARD, padding: 12, background: '#fff8e1', border: '1px solid #f59e0b', marginBottom: 16 }}>
          <b style={{ color: '#92400e' }}>🔴 EKS cluster deleted</b>
          <span style={{ fontSize: 13, color: '#78350f', marginLeft: 8 }}>— ALB ab k3s pods pe route kar raha hai. EKS recreate karo to live logs wapas aayenge.</span>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <button onClick={callAll} disabled={loading}
          style={{ background: '#0073bb', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13, opacity: loading ? 0.6 : 1 }}>
          {loading ? '⏳ Fetching...' : '🔄 Refresh Logs'}
        </button>
        <button onClick={() => setAutoRefresh(a => !a)}
          style={{ background: autoRefresh ? '#dc2626' : '#059669', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          {autoRefresh ? '⏹ Stop Auto' : '▶ Auto Refresh (4s)'}
        </button>
        <span style={{ fontSize: 12, color: '#879596' }}>{logs.length} log entries</span>
      </div>

      {/* Pod status cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12, marginBottom: 20 }}>
        {endpoints.map((ep, i) => {
          const last = logs.find(l => l.path === ep.path && l.ok);
          return (
            <div key={i} style={{ ...CARD, padding: 14, borderLeft: `4px solid ${ep.color}`, marginBottom: 0 }}>
              <div style={{ fontWeight: 700, color: ep.color, fontSize: 13, marginBottom: 6 }}>
                ALB{ep.path}
              </div>
              <div style={{ fontSize: 11, color: '#879596', marginBottom: 6, fontFamily: 'monospace' }}>
                → eks-tg → NodePort {ep.nodePort}
              </div>
              {last ? (
                <>
                  <div style={{ fontSize: 12, background: '#f0fdf4', padding: '6px 10px', borderRadius: 4, fontFamily: 'monospace', marginBottom: 4 }}>
                    <span style={{ color: '#879596' }}>servedBy: </span>
                    <span style={{ color: '#1d8102', fontWeight: 700 }}>Pod: {last.data?.servedBy?.replace('Pod: ', '')}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#879596' }}>✅ {last.status} · {last.ms}ms · {last.ts.slice(11, 19)}</div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#879596' }}>⏳ waiting...</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Log stream */}
      <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, background: '#0f172a', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
          <span>📡 Live Request Log</span>
          <button onClick={() => setLogs([])} style={{ background: '#374155', color: '#94a3b8', border: 'none', padding: '2px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Clear</button>
        </div>
        <div style={{ background: '#020817', maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
          {logs.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#475569', fontFamily: 'monospace', fontSize: 13 }}>
              No logs yet — click Refresh Logs
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} style={{ padding: '6px 16px', borderBottom: '1px solid #0f172a', fontFamily: 'monospace', fontSize: 12 }}>
              <span style={{ color: '#475569' }}>{log.ts.slice(11, 23)} </span>
              <span style={{ color: log.ok ? '#86efac' : '#f87171' }}>{log.ok ? '200' : '500'} </span>
              <span style={{ color: log.color, fontWeight: 700 }}>{log.path.padEnd(12)} </span>
              <span style={{ color: '#64748b' }}>{log.ms}ms </span>
              {log.ok ? (
                <>
                  <span style={{ color: '#94a3b8' }}>→ </span>
                  <span style={{ color: '#fb923c', fontWeight: 700 }}>{log.pod} </span>
                  {log.data?.total !== undefined && <span style={{ color: '#64748b' }}>({log.data.total} items)</span>}
                  {log.data?.status && <span style={{ color: '#64748b' }}>({log.data.status})</span>}
                </>
              ) : (
                <span style={{ color: '#f87171' }}>{log.error}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Full JSON response */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, color: '#16191f' }}>Full JSON Response — EKS Pod se</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {['orders', 'products'].map(type => {
            const log = logs.find(l => l.path === `/${type}` && l.ok);
            return (
              <div key={type} style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '8px 14px', background: type === 'orders' ? '#2d1b69' : '#0c1d3a', color: type === 'orders' ? '#c4b5fd' : '#93c5fd', fontWeight: 700, fontSize: 12 }}>
                  GET /{type} Response
                </div>
                <pre style={{ margin: 0, padding: 14, background: '#0f172a', color: '#e2e8f0', fontSize: 11, lineHeight: 1.8, overflowX: 'auto', maxHeight: 250, overflowY: 'auto' }}>
                  {log ? JSON.stringify(log.data, null, 2) : '⏳ click Refresh Logs...'}
                </pre>
                {log && (
                  <div style={{ padding: '6px 14px', background: '#0a1f0a', fontSize: 11, fontFamily: 'monospace' }}>
                    <span style={{ color: '#86efac' }}>✅ servedBy: </span>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>{log.data?.servedBy}</span>
                    <span style={{ color: '#475569' }}> ← EKS Pod!</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const SECTIONS = {
  'ecr-repos':  (p) => <EcrRepos setActive={p.setActive} />,
  'ecr-images': (p) => <EcrRepos setActive={p.setActive} />,
  'ecr-pull':   () => <EcrPull />,
  'eks-cluster':(p) => <EksCluster setActive={p.setActive} />,
  'eks-nodes':  (p) => <EksNodes setActive={p.setActive} />,
  'eks-pods':   () => <EksPods />,
  'eks-vs-k3s': () => <EksVsK3s />,
  'live':       () => <LiveTest />,
  'eks-logs':   () => <EksLogs />,
};

export default function EcrEksPage() {
  const [active, setActive] = useState('ecr-repos');
  const Section = SECTIONS[active];
  return (
    <div style={PAGE}>
      <NavBar />
      <div style={{ display: 'flex' }}>
        <Sidebar active={active} setActive={setActive} />
        <div style={{ flex: 1, padding: '24px 28px', maxWidth: 'calc(100vw - 220px)', overflowX: 'auto' }}>
          {Section && <Section setActive={setActive} />}
        </div>
      </div>
    </div>
  );
}
