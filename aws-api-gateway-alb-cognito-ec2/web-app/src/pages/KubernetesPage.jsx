import { useState, useEffect } from 'react';

const isHttps = () => window.location.protocol === 'https:';
const K8S_URL      = isHttps() ? 'https://firstbyrajesh.duckdns.org/proxy-k3s-orders'   : 'http://13.201.138.12:30080';
const K8S_PRODUCTS = isHttps() ? 'https://firstbyrajesh.duckdns.org/proxy-k3s-products' : 'http://13.201.138.12:30081';

const PAGE_STYLE = { fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc', minHeight: '100vh', color: '#0f172a' };
const SECTION = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 };

const CONCEPTS = [
  {
    icon: '🐳',
    title: 'Docker Kya Hai?',
    color: '#0891b2',
    body: `Docker ek containerization tool hai.\n\nBina Docker:\n• "Mere machine par toh chalta tha!"\n• Alag alag OS par alag behavior\n• Dependencies conflict\n\nDocker ke saath:\n• App + dependencies ek box (container) mein\n• Har jagah same behavior\n• Lightweight — VMs se 10x fast\n\nIs project mein:\n→ Express app ek Docker image mein hai\n→ k3s us image ko container ke roop mein run karta hai`,
  },
  {
    icon: '☸️',
    title: 'Kubernetes (k8s) Kya Hai?',
    color: '#7c3aed',
    body: `Kubernetes containers ka "manager" hai.\n\nAkela Docker:\n• Sirf ek machine par\n• Container crash → manually restart\n• Scaling manual\n\nKubernetes ke saath:\n• Multiple machines manage karo\n• Auto-restart on crash\n• Auto-scaling\n• Load balancing\n\nIs project mein k3s use:\n→ k3s = Lightweight Kubernetes\n→ Same kubectl commands\n→ Free tier (1GB RAM) mein chalta hai`,
  },
  {
    icon: '⚖️',
    title: 'k3s vs Full Kubernetes',
    color: '#059669',
    body: `Full Kubernetes (kubeadm):\n• RAM: 2GB+ chahiye\n• Setup: complex\n• Production grade\n• AWS EKS, GKE, AKS\n\nk3s (is project mein):\n• RAM: 300-500MB ✅\n• Setup: curl ek line\n• Same kubectl commands\n• Free tier t2.micro mein fit\n\nDiff:\n• k3s = kubeadm - heavy components\n• No etcd (SQLite use karta hai)\n• No cloud controller\n• Same API, same YAML`,
  },
  {
    icon: '🔌',
    title: 'Service Types — NodePort Kyun?',
    color: '#d97706',
    body: `ClusterIP (default):\n• Sirf cluster ke andar\n• External access ❌\n\nNodePort (is project mein):\n• EC2 IP + port → Pod\n• External access ✅\n• Port range: 30000-32767\n• Simple, no extra component\n\nLoadBalancer:\n• Cloud LB create karta hai\n• AWS: ELB ban jaata hai\n• Free tier mein charge laga\n\nIngress:\n• Domain-based routing\n• Path-based routing\n• Needs Ingress Controller\n• Memory heavy (disabled)`,
  },
  {
    icon: '📦',
    title: 'Pod, Deployment, Service',
    color: '#dc2626',
    body: `Pod:\n• Ek ya zyada containers\n• Smallest k8s unit\n• Temporary (crash → replace)\n\nDeployment:\n• Pods manage karta hai\n• Desired state define karo\n• "1 replica chahiye" → k8s ensure karta hai\n• Rolling update support\n\nService:\n• Pod ka stable IP/port\n• Pod restart pe bhi same IP\n• Load balancing multiple pods\n\nIs project mein:\n→ 1 Deployment (express-api)\n→ 1 Pod (node:18-alpine)\n→ 1 NodePort Service (:30080)`,
  },
  {
    icon: '🧠',
    title: 'Free Tier Memory Strategy',
    color: '#0f172a',
    body: `t2.micro = 1GB RAM total\n\n├─ OS + System: ~200MB\n├─ k3s server: ~300MB\n├─ Express Pod: ~128MB\n├─ Docker daemon: ~50MB\n└─ Buffer: ~322MB ✅\n\nMemory bachane ke liye:\n• traefik DISABLED (saves 100MB)\n• servicelb DISABLED (saves 50MB)\n• eviction threshold: 100MB\n• Single replica (1 pod only)\n• Alpine image (small size)\n\nResult: Tight but works! 🎉`,
  },
];

// ─── YAML data ───────────────────────────────────────────────────────────────

const DEPLOYMENT_YAML = [
  { line: 'apiVersion: apps/v1', explain: 'apps/v1 = Deployment API group. v1 stable version hai.' },
  { line: 'kind: Deployment', explain: '"Deployment" batata hai ki hum pods manage karna chahte hain auto-restart ke saath.' },
  { line: 'metadata:', explain: 'Resource ki identity — naam, namespace, labels.' },
  { line: '  name: express-api', explain: 'Deployment ka naam. kubectl get deployments mein yahi naam dikhega.' },
  { line: '  namespace: default', explain: 'Kubernetes namespace. "default" = koi alag namespace nahi banaya.' },
  { line: '  labels:', explain: 'Key-value tags — sirf identification ke liye, koi functional role nahi.' },
  { line: '    app: express-api', explain: 'Label: app=express-api. Service isi label se pods dhundti hai.' },
  { line: 'spec:', explain: 'Desired state — "humko ye chahiye".' },
  { line: '  replicas: 1', explain: 'Kitne pods chahiye. 1 = ek pod. 3 likho toh 3 pods automatically ban jaayenge.' },
  { line: '  selector:', explain: 'Deployment ko batao ki kaunse pods manage karne hain.' },
  { line: '    matchLabels:', explain: 'In labels waale pods ko manage karo.' },
  { line: '      app: express-api', explain: 'label app=express-api waale pods ko manage karo (metadata.labels se match).' },
  { line: '  template:', explain: 'Pod ka blueprint — har naya pod aise banega.' },
  { line: '    metadata:', explain: 'Pod ki identity.' },
  { line: '      labels:', explain: 'Ye labels pod par lagenge.' },
  { line: '        app: express-api', explain: 'IMPORTANT: selector.matchLabels se exactly match hona chahiye, tabhi Deployment pod ko manage kar payega.' },
  { line: '    spec:', explain: 'Pod ke andar kya hoga — containers, volumes, etc.' },
  { line: '      containers:', explain: 'List of containers jo is pod mein chalenge.' },
  { line: '      - name: express-api', explain: 'Container ka naam. ek pod mein multiple containers ho sakte hain.' },
  { line: '        image: node:18-alpine', explain: 'Docker Hub se node version 18, alpine = lightweight Linux (50MB). express ke liye kaafi hai.' },
  { line: '        command: ["/bin/sh", "-c"]', explain: 'Container start hone pe kaunsa command chale. shell mode mein open karo.' },
  { line: '        ports:', explain: 'Container ke andar kaunsa port expose kar rahe hain.' },
  { line: '        - containerPort: 3000', explain: 'Express port 3000 pe listen karta hai — ye sirf documentation hai, actual blocking nahi.' },
  { line: '        env:', explain: 'Environment variables — container ke andar available honge.' },
  { line: '        - name: HOSTNAME', explain: 'HOSTNAME variable set karo.' },
  { line: '          valueFrom:', explain: 'Value kahan se lo.' },
  { line: '            fieldRef:', explain: 'Pod ke field se lo.' },
  { line: '              fieldPath: metadata.name', explain: 'Pod ka naam HOSTNAME mein aayega, jaise: express-api-8594dc655b-8lx7k' },
  { line: '        resources:', explain: 'CPU aur memory limits — FREE TIER ke liye zaroori hai!' },
  { line: '          requests:', explain: 'Minimum guarantee — ye resources pod ke liye reserve honge.' },
  { line: '            memory: "128Mi"', explain: '128 Megibytes RAM reserve. Mi = Mebibyte (1024KB). M nahi, Mi.' },
  { line: '            cpu: "100m"', explain: '100 millicores = 0.1 CPU core. 1000m = 1 full CPU core.' },
  { line: '          limits:', explain: 'Maximum cap — isse zyada use kiya toh pod kill/throttle ho jaayega.' },
  { line: '            memory: "256Mi"', explain: '256MB se zyada memory li toh pod OOMKilled (Out Of Memory Killed) ho jaayega.' },
  { line: '            cpu: "500m"', explain: '0.5 CPU se zyada nahi lega. Free tier par important.' },
];

const SERVICE_YAML = [
  { line: 'apiVersion: v1', explain: 'v1 = core API group. Service, Pod, ConfigMap sab v1 mein hain.' },
  { line: 'kind: Service', explain: '"Service" = pods ka stable network endpoint. Pod crash ho jaaye toh bhi Service ki IP same rehti hai.' },
  { line: 'metadata:', explain: 'Service ki identity.' },
  { line: '  name: express-service', explain: 'Service ka naam. kubectl get svc mein yahi dikhega.' },
  { line: '  namespace: default', explain: 'Same namespace mein hona zaroori hai jahan pod hai.' },
  { line: 'spec:', explain: 'Service ka behavior define karo.' },
  { line: '  type: NodePort', explain: 'SERVICE TYPE — 3 options: ClusterIP (internal only), NodePort (EC2 port), LoadBalancer (cloud LB). Humne NodePort choose kiya kyunki free tier mein LB costly hai.' },
  { line: '  selector:', explain: 'Kaunse pods ko is service ke peeche rakhna hai — label se match karta hai.' },
  { line: '    app: express-api', explain: 'app=express-api label waale pods ko traffic bhejo. Deployment ke template.labels se match hona chahiye.' },
  { line: '  ports:', explain: 'Port mapping define karo.' },
  { line: '  - port: 3000', explain: 'Service ki internal port (cluster ke andar is se access karo).' },
  { line: '    targetPort: 3000', explain: 'Pod ke container ka port. Service yahan forward karti hai. Express is port pe listen karta hai.' },
  { line: '    nodePort: 30080', explain: 'YAHI HAI 30080! EC2 (Node) ke is port par request aayegi toh pod ke targetPort pe forward hogi. Range: 30000-32767.' },
  { line: '    protocol: TCP', explain: 'TCP protocol. HTTP/HTTPS ke liye TCP hota hai. UDP bhi support hai.' },
];

function YamlLine({ line, explain }) {
  const [show, setShow] = useState(false);
  const indent = line.match(/^(\s*)/)[1].length;
  let color = '#e2e8f0';
  if (line.trim().startsWith('#')) color = '#64748b';
  else if (line.trim().startsWith('-')) color = '#fbbf24';
  else if (line.includes(':')) {
    const [key] = line.split(':');
    color = indent === 0 ? '#f472b6' : indent <= 2 ? '#67e8f9' : indent <= 4 ? '#86efac' : '#fde68a';
  }
  const [key, ...rest] = line.split(':');
  const val = rest.join(':');

  return (
    <div
      onClick={() => setShow(s => !s)}
      style={{ cursor: 'pointer', padding: '2px 8px', borderRadius: 4, transition: 'background 0.1s', background: show ? 'rgba(255,255,255,0.07)' : 'transparent' }}
      onMouseEnter={e => { if (!show) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!show) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7 }}>
        {line.includes(':') && !line.trim().startsWith('#') && !line.trim().startsWith('-') ? (
          <>
            <span style={{ color }}>{key}:</span>
            {val && <span style={{ color: '#fde68a' }}>{val}</span>}
          </>
        ) : (
          <span style={{ color }}>{line}</span>
        )}
        {explain && <span style={{ color: '#475569', fontSize: 10, marginLeft: 6 }}>← click</span>}
      </div>
      {show && explain && (
        <div style={{ background: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: 4, padding: '6px 10px', marginTop: 4, marginLeft: indent * 8, fontSize: 11, color: '#bfdbfe', lineHeight: 1.6 }}>
          💡 {explain}
        </div>
      )}
    </div>
  );
}

function YamlSection() {
  const [tab, setTab] = useState('deployment');
  const lines = tab === 'deployment' ? DEPLOYMENT_YAML : SERVICE_YAML;
  const title = tab === 'deployment' ? 'express-deployment.yaml — Deployment' : 'express-deployment.yaml — Service';

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#0c4a6e' }}>
        📄 YAML Files — Har Line ka Matlab (Hindi mein)
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
        Kisi bhi line pe click karo → us line ka explanation milega
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'deployment', label: '📦 Deployment YAML', color: '#7c3aed' },
          { key: 'service',    label: '⚙️ Service YAML',    color: '#0891b2' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              background: tab === t.key ? t.color : '#f1f5f9',
              color: tab === t.key ? '#fff' : '#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* What is this file */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: '#334155', lineHeight: 1.8 }}>
        {tab === 'deployment' ? (
          <>
            <b>Deployment YAML kya karta hai?</b><br/>
            → Kubernetes ko batata hai: <i>"express-api naam ka pod banana, node:18-alpine Docker image se, 1 replica, 128MB RAM"</i><br/>
            → Pod crash ho jaaye → Kubernetes automatically naaya pod banata hai (desired state maintain karta hai)
          </>
        ) : (
          <>
            <b>Service YAML kya karta hai?</b><br/>
            → Pod ka stable network endpoint banata hai<br/>
            → EC2 ke port <b>30080</b> par aane wali request ko pod ke port <b>3000</b> pe forward karta hai<br/>
            → Pod restart ho jaaye, IP badle — Service ki IP same rehti hai
          </>
        )}
      </div>

      {/* YAML block */}
      <div style={{ background: '#0d1117', borderRadius: 10, padding: '16px 8px', overflowX: 'auto' }}>
        <div style={{ color: '#475569', fontFamily: 'monospace', fontSize: 11, marginBottom: 8, paddingLeft: 8 }}>
          # {title}
        </div>
        {lines.map((item, i) => (
          <YamlLine key={i} line={item.line} explain={item.explain} />
        ))}
      </div>

      {/* Relation diagram */}
      <div style={{ marginTop: 16, background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 8, padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#ea580c', marginBottom: 8 }}>🔗 Deployment aur Service kaise connected hain?</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 11 }}>
          {[
            { box: 'Deployment', detail: 'template.labels:\n  app: express-api', color: '#7c3aed', bg: '#f5f3ff' },
            { arrow: '← label se match →' },
            { box: 'Service', detail: 'selector:\n  app: express-api', color: '#0891b2', bg: '#f0f9ff' },
          ].map((item, i) => item.arrow ? (
            <div key={i} style={{ color: '#ea580c', fontWeight: 700, fontSize: 12, padding: '0 4px' }}>{item.arrow}</div>
          ) : (
            <div key={i} style={{ background: item.bg, border: `2px solid ${item.color}40`, borderRadius: 6, padding: '8px 14px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: item.color, marginBottom: 4 }}>{item.box}</div>
              <pre style={{ fontFamily: 'monospace', fontSize: 10, color: '#334155', margin: 0 }}>{item.detail}</pre>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#9a3412' }}>
          ⚠️ Agar Deployment mein <code>template.labels.app</code> aur Service mein <code>selector.app</code> match na kare → Service koi pod nahi dhundh paayegi → 502 error!
        </div>
      </div>
    </div>
  );
}

const GW = 'http://13.201.138.12:30083';

const TRACE_STEPS = [
  {
    num: 1,
    icon: '🌐',
    from: 'Browser (Aapka Laptop)',
    action: 'HTTP GET request bhejta hai',
    detail: 'GET http://13.201.138.12:30083/items/2',
    sub: 'EC2 ka Public IP (Elastic IP) + NodePort 30083',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#93c5fd',
  },
  {
    num: 2,
    icon: '🔒',
    from: 'AWS Security Group',
    action: 'Port 30083 allow karta hai',
    detail: 'Inbound Rule: TCP 30083 0.0.0.0/0 → ALLOW',
    sub: 'Agar rule nahi hota toh yahan request drop ho jaati',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fcd34d',
  },
  {
    num: 3,
    icon: '🖥️',
    from: 'EC2 Instance  (k8s-docker-express-production)',
    action: 'OS ko packet milta hai port 30083 par',
    detail: 'EC2 ID: i-07add1a41efea7651  |  Region: ap-south-1',
    sub: 'OS ne packet receive kiya, ab kube-proxy decide karega kahan bhejein',
    color: '#0369a1',
    bg: '#f0f9ff',
    border: '#7dd3fc',
  },
  {
    num: 4,
    icon: '⚙️',
    from: 'kube-proxy (EC2 par chalta hai)',
    action: 'iptables DNAT rule: NodePort → Gateway Pod',
    detail: 'NodePort 30083 → gateway-service ClusterIP → Pod 10.42.0.x:6000',
    sub: 'kube-proxy ne iptables mein rule daali: :30083 aaya → gateway pod IP:6000 ko bhejo',
    color: '#7c3aed',
    bg: '#faf5ff',
    border: '#c4b5fd',
  },
  {
    num: 5,
    icon: '🔵',
    from: 'Gateway Pod  (gateway-api-5ff57f6bdc-44fhx)',
    action: 'GET /items/2 receive kiya, ab backend ko call karega',
    detail: 'Pod IP: 10.42.0.x  |  Port: 6000  |  NodePort: 30083',
    sub: 'Gateway pod ke code mein: fetch("http://backend-service:4000/inventory/2")',
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#67e8f9',
    code: 'app.get("/items/:id", async (req, res) => {\n  const r = await fetch(`http://backend-service:4000/inventory/${req.params.id}`)\n  // ↑ id=2 bhejta hai backend ko\n})',
  },
  {
    num: 6,
    icon: '🔍',
    from: 'CoreDNS (k8s ka DNS server)',
    action: '"backend-service" naam resolve karta hai ClusterIP mein',
    detail: 'backend-service → 10.43.xx.xx  (ClusterIP)',
    sub: 'Full DNS: backend-service.default.svc.cluster.local — har Service ke liye k8s automatically DNS banata hai',
    color: '#0f766e',
    bg: '#f0fdfa',
    border: '#99f6e4',
  },
  {
    num: 7,
    icon: '⚙️',
    from: 'kube-proxy (phir se)',
    action: 'ClusterIP → Backend Pod IP route karta hai',
    detail: 'ClusterIP 10.43.xx.xx:4000 → Backend Pod 10.42.0.x:4000',
    sub: 'ClusterIP koi real machine nahi hai — sirf iptables ka virtual address hai',
    color: '#7c3aed',
    bg: '#faf5ff',
    border: '#c4b5fd',
  },
  {
    num: 8,
    icon: '🟢',
    from: 'Backend Pod  (backend-api-554444d8cf-nhd65)',
    action: 'GET /inventory/2 receive kiya — Phone ka data return kiya',
    detail: 'Pod IP: 10.42.0.x  |  Port: 4000  |  Type: ClusterIP (private)',
    sub: 'Yeh pod internet se directly accessible NAHI hai — sirf cluster ke andar se',
    color: '#15803d',
    bg: '#f0fdf4',
    border: '#86efac',
    code: 'app.get("/inventory/:id", (req, res) => {\n  const item = inventory.find(i => i.id === parseInt(req.params.id))\n  res.json({ id: 2, item: "Phone", stock: 200, price: 25000 })\n})',
  },
  {
    num: 9,
    icon: '↩️',
    from: 'Response wapas aata hai',
    action: 'Backend → Gateway → Browser (ulta rasta)',
    detail: '{ id: 2, item: "Phone", stock: 200, warehouse: "Mumbai", price: 25000, gatewayPod: "gateway-api-..." }',
    sub: 'Gateway apna pod naam bhi add karta hai response mein',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#cbd5e1',
  },
];

function RequestTraceSection() {
  const [active, setActive] = useState(null);
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0c4a6e', marginBottom: 4 }}>
        📍 Request Trace — GET http://13.201.138.12:30083/items/2
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
        Step click karo — poori detail dikhegi. Yeh ek request ka poora safar hai browser se backend pod tak.
      </div>

      {/* URL bar */}
      <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 16px', marginBottom: 24, fontFamily: 'monospace', fontSize: 13, color: '#67e8f9' }}>
        GET <span style={{color:'#fbbf24'}}>http://</span><span style={{color:'#f87171'}}>13.201.138.12</span><span style={{color:'#a78bfa'}}>:30083</span><span style={{color:'#86efac'}}>/items/2</span>
        <span style={{color:'#64748b', fontSize:10, marginLeft: 16}}>↓ ye request 9 steps mein travel karti hai</span>
      </div>

      {/* Steps */}
      <div style={{ position: 'relative' }}>
        {TRACE_STEPS.map((step, idx) => (
          <div key={step.num}>
            <div
              onClick={() => setActive(active === idx ? null : idx)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                background: active === idx ? step.bg : '#f8fafc',
                border: `2px solid ${active === idx ? step.border : '#e2e8f0'}`,
                transition: 'all 0.15s' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: step.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {step.num}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14 }}>{step.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 12, color: step.color }}>{step.from}</span>
                </div>
                <div style={{ fontSize: 12, color: '#334155', marginTop: 2 }}>{step.action}</div>
                {active === idx && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, background: step.bg, border: `1px solid ${step.border}`, borderRadius: 6, padding: '6px 10px', color: step.color, fontWeight: 600, marginBottom: 6 }}>
                      {step.detail}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.7 }}>{step.sub}</div>
                    {step.code && (
                      <pre style={{ marginTop: 8, background: '#1e293b', color: '#86efac', fontSize: 10, padding: '8px 12px', borderRadius: 6, overflow: 'auto', lineHeight: 1.8 }}>
                        {step.code}
                      </pre>
                    )}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', alignSelf: 'center' }}>{active === idx ? '▲' : '▼'}</div>
            </div>
            {idx < TRACE_STEPS.length - 1 && (
              <div style={{ marginLeft: 25, width: 2, height: 6, background: '#cbd5e1', marginBottom: 4 }} />
            )}
          </div>
        ))}
      </div>

      {/* Summary table */}
      <div style={{ marginTop: 20, background: '#0f172a', borderRadius: 8, padding: 16, overflowX: 'auto' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>📊 IP / Port Summary</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Layer','Address','Port','Type','Accessible by'].map(h => (
                <th key={h} style={{ color: '#94a3b8', fontWeight: 600, padding: '4px 8px', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['Public IP (EC2)',  '13.201.138.12',  '30083', 'NodePort',  '✅ Internet (Browser)'],
              ['Gateway ClusterIP','10.43.xx.xx',   '6000',  'ClusterIP', '❌ Sirf cluster ke andar'],
              ['Gateway Pod IP',   '10.42.0.x',     '6000',  'Pod IP',    '❌ Sirf cluster ke andar'],
              ['Backend ClusterIP','10.43.xx.xx',   '4000',  'ClusterIP', '❌ Sirf cluster ke andar'],
              ['Backend Pod IP',   '10.42.0.x',     '4000',  'Pod IP',    '❌ Sirf cluster ke andar'],
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: '5px 8px', color: j === 4 ? (cell.startsWith('✅') ? '#86efac' : '#f87171') : j === 0 ? '#67e8f9' : '#e2e8f0' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PodToPodSection() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState('');

  const ORDERS_URL = K8S_URL;
  const call = async (key, path, method = 'GET', body = null) => {
    setLoading(key);
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);
      const r = await fetch(`${ORDERS_URL}${path}`, opts);
      const data = await r.json();
      setResults(prev => ({ ...prev, [key]: { data, ok: r.ok, status: r.status } }));
    } catch (e) { setResults(prev => ({ ...prev, [key]: { data: { error: e.message }, ok: false } })); }
    setLoading('');
  };

  const ResBox = ({ k, color }) => {
    const r = results[k];
    if (!r) return null;
    return (
      <div style={{ background: r.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${r.ok ? '#86efac' : '#fca5a5'}`, borderRadius: 8, padding: 12, marginTop: 8 }}>
        <pre style={{ fontFamily: 'monospace', fontSize: 11, color: r.ok ? '#15803d' : '#dc2626', margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(r.data, null, 2)}</pre>
      </div>
    );
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#0c4a6e' }}>
        🔗 Pod-to-Pod Communication — Orders Pod calls Products Pod
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
        Browser Orders pod ko call karta hai. Orders pod ke andar se Products pod ki API internally call hoti hai — browser Products pod tak directly nahi pahunchta.
      </div>

      {/* Architecture */}
      <div style={{ background: '#0f172a', borderRadius: 10, padding: 20, marginBottom: 24, overflowX: 'auto' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 2.2 }}>
          <div style={{ color: '#94a3b8' }}>Browser</div>
          <div style={{ color: '#64748b', paddingLeft: 8 }}>↓  GET http://13.201.138.12:<span style={{color:'#fbbf24'}}>30080</span>/combined</div>
          <div style={{ background: '#2e1065', borderLeft: '3px solid #a78bfa', padding: '6px 12px', borderRadius: 4 }}>
            <div style={{ color: '#c4b5fd', fontWeight: 700 }}>Orders Pod (express-api)  <span style={{color:'#94a3b8',fontSize:10,fontWeight:400}}>— NodePort :30080 — browser access ✅</span></div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>express-api-86d5d597bb-rvt65  |  port 3000  |  NodePort 30080</div>
            <div style={{ color: '#86efac', marginTop: 6 }}>↓  fetch("<span style={{color:'#fbbf24'}}>http://products-service:4000</span>/products")</div>
            <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>   k8s DNS: "products-service" → ClusterIP → Products Pod</div>
          </div>
          <div style={{ color: '#64748b', paddingLeft: 8 }}>↓  k8s DNS + kube-proxy route to products pod</div>
          <div style={{ background: '#14532d', borderLeft: '3px solid #4ade80', padding: '6px 12px', borderRadius: 4 }}>
            <div style={{ color: '#86efac', fontWeight: 700 }}>Products Pod (products-api)  <span style={{color:'#94a3b8',fontSize:10,fontWeight:400}}>— NodePort :30081 bhi hai — but orders pod DNS use karta hai</span></div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>products-api-5d849dfbfc-jktzq  |  port 4000  |  NodePort 30081</div>
          </div>
          <div style={{ color: '#64748b', paddingLeft: 8 }}>↓  products data → orders pod → orders + products combined → browser</div>
          <div style={{ color: '#94a3b8' }}>Browser ko dono pods ka data ek response mein milta hai</div>
        </div>
      </div>

      {/* Key concept */}
      <div style={{ background: '#fff7ed', border: '2px solid #fb923c', borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#ea580c', marginBottom: 8 }}>🔑 Orders Pod ke andar yeh code hai</div>
        <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#9a3412', lineHeight: 1.9, background: '#fff', padding: 10, borderRadius: 6, overflow: 'auto' }}>
{`app.get('/combined', async (req, res) => {
  // Orders pod internally products pod ko call karta hai
  const r = await fetch('http://products-service:4000/products')
  //                     ↑ Service ka DNS naam — IP nahi!
  const productsData = await r.json()

  res.json({
    orders,               // orders pod ka apna data
    products: productsData.products,  // products pod se aaya
    podToPod: {
      ordersPod: process.env.HOSTNAME,       // express-api-86d5d...
      productsPod: productsData.servedBy,    // products-api-5d84...
    }
  })
})`}
        </pre>
      </div>

      {/* Live test */}
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0c4a6e', marginBottom: 12 }}>🧪 Live Test — Orders Pod se Products Pod call karo</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#7c3aed', marginBottom: 8 }}>🔗 GET /combined — Pod-to-Pod</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Orders pod internally products pod ko call karega. Response mein dono pods ke naam dikhenge.</div>
          <button onClick={() => call('combined', '/combined')} disabled={!!loading}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
            {loading === 'combined' ? '...' : 'GET /combined (pod-to-pod)'}
          </button>
          <ResBox k="combined" />
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#3b82f6', marginBottom: 8 }}>❤️ Orders Pod Health</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Express-api pod ka health check</div>
          <button onClick={() => call('op-health', '/health')} disabled={!!loading}
            style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
            {loading === 'op-health' ? '...' : 'GET /health'}
          </button>
          <ResBox k="op-health" />
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#059669', marginBottom: 8 }}>🛒 Sirf Orders (pod-to-pod nahi)</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Sirf orders pod ka apna data — products ko call nahi karta</div>
          <button onClick={() => call('orders-only', '/orders')} disabled={!!loading}
            style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
            {loading === 'orders-only' ? '...' : 'GET /orders'}
          </button>
          <ResBox k="orders-only" />
        </div>

      </div>

      {/* What proves pod-to-pod */}
      <div style={{ background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: 8, padding: 14, marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: '#0369a1', marginBottom: 8 }}>📌 /combined ka response dekho — yeh prove karta hai pod-to-pod hua</div>
        <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#1e40af', background: '#fff', padding: 10, borderRadius: 6, lineHeight: 1.8 }}>
{`"podToPod": {
  "ordersPod": "express-api-86d5d597bb-rvt65",   ← Orders pod ka naam
  "productsPod": "Pod: products-api-5d849dfbfc-jktzq",  ← Products pod ka naam
  "productsPodCalledVia": "http://products-service:4000/products",
  "message": "Orders pod ne products-service ko DNS name se call kiya!"
}`}
        </pre>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
          Dono pod names alag hain = dono alag containers mein chal rahe hain = pod-to-pod communication confirmed ✅
        </div>
      </div>
    </div>
  );
}

const SERVICES = [
  {
    name: 'express-api',
    label: '🛒 Orders Service',
    color: '#7c3aed',
    port: 30080,
    nodePort: '30080',
    image: 'node:18-alpine (ConfigMap)',
    imageSource: 'ConfigMap — k8s internal',
    routes: [
      { method: 'GET',  path: '/health',   label: '❤️ Health',           body: null },
      { method: 'GET',  path: '/orders',   label: '🛒 GET Orders',       body: null },
      { method: 'GET',  path: '/combined', label: '🔗 Pod-to-Pod /combined', body: null },
      { method: 'GET',  path: '/pod-info', label: '📦 Pod Info',         body: null },
      { method: 'POST', path: '/orders',   label: '➕ POST Order',       body: { item: 'Laptop', qty: 1, price: 75000 } },
    ],
  },
  {
    name: 'products-api',
    label: '📦 Products Service',
    color: '#059669',
    port: 30081,
    nodePort: '30081',
    image: 'node:18-alpine (ConfigMap)',
    imageSource: 'ConfigMap — k8s internal',
    routes: [
      { method: 'GET',  path: '/health',      label: '❤️ Health',          body: null },
      { method: 'GET',  path: '/products',    label: '📦 GET Products',    body: null },
      { method: 'GET',  path: '/products/1',  label: '🔍 GET Product /1',  body: null },
      { method: 'POST', path: '/products',    label: '➕ POST Product',    body: { name: 'Smart TV', price: 45000, stock: 8 } },
    ],
  },
];

function ServiceTester() {
  const [activeTab, setActiveTab] = useState(0);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const svc = SERVICES[activeTab];
  const baseUrl = svc.port === 30081 ? K8S_PRODUCTS : K8S_URL;

  const run = async (route) => {
    setLoading(true); setError('');
    try {
      const opts = { method: route.method, headers: { 'Content-Type': 'application/json' } };
      if (route.body) opts.body = JSON.stringify(route.body);
      const r = await fetch(`${baseUrl}${route.path}`, opts);
      const data = await r.json();
      setResults(prev => ({ ...prev, [`${activeTab}-${route.path}-${route.method}`]: { data, status: r.status, ok: r.ok } }));
    } catch (e) { setError(`${svc.name} pod not ready — wait 1-2 min`); }
    setLoading(false);
  };

  return (
    <div style={SECTION}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#0c4a6e' }}>🧪 Live API Tester — 3 Alag Pods, 3 Alag Services</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Teeno alag pods hain — alag NodePorts, alag Docker images, alag deployments</div>

      {/* Service overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {SERVICES.map((s, i) => (
          <div key={i} onClick={() => { setActiveTab(i); setError(''); }}
            style={{ background: activeTab === i ? s.color : '#f8fafc', border: `2px solid ${activeTab === i ? s.color : '#e2e8f0'}`, borderRadius: 10, padding: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: activeTab === i ? '#fff' : s.color }}>{s.label}</div>
            <div style={{ fontSize: 10, color: activeTab === i ? 'rgba(255,255,255,0.8)' : '#64748b', marginTop: 4 }}>NodePort: {s.nodePort}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: activeTab === i ? 'rgba(255,255,255,0.7)' : '#94a3b8', marginTop: 2, wordBreak: 'break-all' }}>{s.imageSource}</div>
          </div>
        ))}
      </div>

      {/* Active service detail */}
      <div style={{ background: '#f8fafc', border: `2px solid ${svc.color}30`, borderTop: `3px solid ${svc.color}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, marginBottom: 12 }}>
          <div><span style={{ color: '#64748b' }}>Base URL: </span><span style={{ fontFamily: 'monospace', color: svc.color, fontWeight: 600 }}>{baseUrl}</span></div>
          <div><span style={{ color: '#64748b' }}>Image: </span><span style={{ fontFamily: 'monospace', fontSize: 10, color: '#334155' }}>{svc.image}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {svc.routes.map((route, j) => (
            <button key={j} onClick={() => run(route)} disabled={loading}
              style={{ background: svc.color, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 600, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              <span style={{ fontSize: 10, opacity: 0.8, marginRight: 4 }}>{route.method}</span>{route.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 12, fontSize: 12, color: '#dc2626', marginBottom: 12 }}>❌ {error}</div>}

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {svc.routes.map((route, j) => {
          const key = `${activeTab}-${route.path}-${route.method}`;
          const res = results[key];
          if (!res) return null;
          return (
            <div key={j} style={{ background: res.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${res.ok ? '#86efac' : '#fca5a5'}`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: res.ok ? '#15803d' : '#dc2626', marginBottom: 6 }}>
                <span style={{ fontFamily: 'monospace' }}>{route.method} {route.path}</span>
                <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>HTTP {res.status}</span>
              </div>
              <pre style={{ fontFamily: 'monospace', fontSize: 10, color: res.ok ? '#15803d' : '#dc2626', margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(res.data, null, 2)}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function KubernetesPage() {
  const [health, setHealth] = useState(null);
  const [orders, setOrders] = useState(null);
  const [podInfo, setPodInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [k8sUrl, setK8sUrl] = useState(K8S_URL);

  const fetchHealth = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${k8sUrl}/health`);
      setHealth(await r.json());
    } catch (e) { setError('EC2 not ready yet — k3s + pod starting up (2-3 min wait)'); }
    setLoading(false);
  };

  const fetchOrders = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${k8sUrl}/orders`);
      setOrders(await r.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const fetchPodInfo = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${k8sUrl}/pod-info`);
      setPodInfo(await r.json());
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const createOrder = async () => {
    setLoading(true); setError('');
    try {
      const r = await fetch(`${k8sUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: 'Test Product', qty: 1, price: 999 }),
      });
      const d = await r.json();
      alert('Order created!\n' + JSON.stringify(d, null, 2));
      fetchOrders();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={PAGE_STYLE}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0891b2 100%)', padding: '28px 32px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 36 }}>☸️</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>Docker + Kubernetes (k3s) — Free Tier EC2</div>
              <div style={{ fontSize: 13, color: '#bae6fd' }}>t2.micro + Docker + k3s + Express Container + NodePort Service</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            {['t3.micro (Free Tier)', 'Docker', 'k3s Kubernetes', 'NodePort :30080', 'Express in Pod'].map(t => (
              <span key={t} style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>

        {/* Architecture */}
        <div style={SECTION}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#0c4a6e' }}>🏗️ Architecture — Frontend → Kubernetes → Express Pod</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', padding: '8px 0', flexWrap: 'nowrap' }}>
            {[
              { icon: '🖥️', label: 'React App', sub: 'Browser', color: '#4f46e5' },
              { arrow: 'HTTP request\nport 30080' },
              { icon: '🔒', label: 'Security\nGroup', sub: 'port 30080\nopen', color: '#dc2626' },
              { arrow: 'allow' },
              { icon: '⚙️', label: 'NodePort\nService', sub: 'port 30080\n→ 3000', color: '#d97706' },
              { arrow: 'kube-proxy\nroutes' },
              { icon: '📦', label: 'Pod', sub: 'express-api\nDeployment', color: '#7c3aed' },
              { arrow: 'inside\npod' },
              { icon: '🐳', label: 'Docker\nContainer', sub: 'node:18-alpine\nport 3000', color: '#0891b2' },
            ].map((item, i) => (
              item.arrow ? (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 55 }}>
                  <div style={{ fontSize: 16, color: '#94a3b8' }}>→</div>
                  <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', whiteSpace: 'pre' }}>{item.arrow}</div>
                </div>
              ) : (
                <div key={i} style={{ background: '#fff', border: `2px solid ${item.color}20`, borderTop: `3px solid ${item.color}`, borderRadius: 8, padding: '8px 12px', textAlign: 'center', minWidth: 80, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 18 }}>{item.icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#0f172a', whiteSpace: 'pre', marginTop: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 9, color: '#64748b', whiteSpace: 'pre', marginTop: 2 }}>{item.sub}</div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* ─── KUBE-PROXY SECTION ─── */}
        <div style={SECTION}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#059669' }}>
            ⚙️ kube-proxy — Request Pod ke Andar Kaise Jaati Hai?
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
            Yahi woh component hai jo port 30080 par aane wali request ko Pod ke port 3000 tak pohunchata hai
          </div>

          {/* Step by step flow */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
            {[
              { step: '1', icon: '🖥️', title: 'Browser Request Bhejta Hai', color: '#4f46e5', bg: '#eef2ff',
                detail: 'GET http://13.201.138.12:30080/orders',
                explain: 'Browser EC2 ki PUBLIC IP pe port 30080 par request bhejta hai. Ye ek normal HTTP request hai.' },
              { step: '2', icon: '🔒', title: 'Security Group Check Karta Hai', color: '#dc2626', bg: '#fef2f2',
                detail: 'Inbound rule: port 30080 → ALLOW ✅',
                explain: 'AWS Security Group pehle check karta hai — kya port 30080 allow hai? Humne CF mein ye rule daala tha. Allow hai toh EC2 tak pahunchi.' },
              { step: '3', icon: '⚙️', title: 'kube-proxy Port Pakdta Hai', color: '#059669', bg: '#f0fdf4',
                detail: 'iptables rule: port 30080 → forward to ClusterIP:3000',
                explain: 'kube-proxy EC2 par ek background process hai. Ye Linux iptables rules banata hai. Jab port 30080 par kuch aata hai, iptables automatically usse pod ki taraf bhej deta hai. Tum directly nahi dekhte ye — automatically hota hai.' },
              { step: '4', icon: '🔀', title: 'ClusterIP Service Receive Karta Hai', color: '#d97706', bg: '#fffbeb',
                detail: 'Service ClusterIP: 10.43.29.14 port 3000',
                explain: 'Request Service ke ClusterIP (10.43.29.14) par pahunchi. Service decide karti hai kaunse pod ko bhejni hai. Agar multiple pods hain toh round-robin mein baantegi.' },
              { step: '5', icon: '📦', title: 'Pod Receive Karta Hai', color: '#7c3aed', bg: '#faf5ff',
                detail: 'Pod IP: 10.42.0.5 port 3000',
                explain: 'Request pod ke andar pohunchi. Pod ka IP private hai (10.42.0.x) — sirf cluster ke andar accessible. Browser ye IP kabhi directly nahi jaanta.' },
              { step: '6', icon: '🐳', title: 'Express Container Response Deta Hai', color: '#0891b2', bg: '#f0f9ff',
                detail: '{"orders": [...], "servedBy": "Pod: express-api-55f7d4d4b5-mmj7n"}',
                explain: 'Express.js port 3000 par request receive karta hai, process karta hai, aur response bhejta hai. Response wapas usi path se browser tak jaata hai.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 0 }}>
                {/* Left — step number + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: s.color, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>{s.step}</div>
                  {i < 5 && <div style={{ width: 2, flex: 1, background: '#e2e8f0', minHeight: 20 }} />}
                </div>
                {/* Right — content */}
                <div style={{ flex: 1, background: s.bg, border: `1px solid ${s.color}20`, borderLeft: `3px solid ${s.color}`, borderRadius: 8, padding: '12px 16px', marginBottom: 8, marginLeft: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{s.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: s.color }}>{s.title}</span>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#334155', background: 'rgba(0,0,0,0.04)', padding: '4px 10px', borderRadius: 4, marginBottom: 6 }}>{s.detail}</div>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>{s.explain}</div>
                </div>
              </div>
            ))}
          </div>

          {/* kube-proxy technical detail */}
          <div style={{ background: '#0f172a', borderRadius: 10, padding: 18 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, marginBottom: 12 }}>⚙️ kube-proxy technically kya karta hai — iptables rules</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 2 }}>
              <div style={{ color: '#64748b' }}># EC2 par kube-proxy ne ye iptables rule banaya hai:</div>
              <div style={{ color: '#fbbf24' }}>iptables -t nat -A KUBE-NODEPORTS -p tcp --dport <span style={{color:'#4ade80'}}>30080</span> -j KUBE-SVC-express</div>
              <div style={{ color: '#64748b', marginTop: 8 }}># Matlab: port 30080 par aane wali request → KUBE-SVC chain mein bhejo</div>
              <div style={{ color: '#fbbf24', marginTop: 4 }}>iptables -t nat -A KUBE-SVC-express -j KUBE-SEP-pod</div>
              <div style={{ color: '#64748b', marginTop: 8 }}># Matlab: us chain mein → pod IP pe forward karo</div>
              <div style={{ color: '#fbbf24', marginTop: 4 }}>iptables -t nat -A KUBE-SEP-pod -p tcp -j DNAT --to-destination <span style={{color:'#a78bfa'}}>10.42.0.5</span>:<span style={{color:'#38bdf8'}}>3000</span></div>
              <div style={{ color: '#64748b', marginTop: 8 }}># DNAT = Destination NAT — destination IP badal do pod IP se</div>
              <div style={{ color: '#86efac', marginTop: 12 }}># Result: Browser sochta hai 13.201.138.12:30080 se baat kar raha hoon</div>
              <div style={{ color: '#86efac' }}>#        Asli mein packet 10.42.0.5:3000 (pod) tak gaya!</div>
            </div>
          </div>
        </div>

        {/* ─── IP EXPLANATION ─── */}
        <div style={SECTION}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#dc2626' }}>
            ❓ 3000:30080/TCP ka matlab kya hai? — EC2 IP hai ya Pod IP?
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>
            Ye sabse confusing topic hai Kubernetes mein — ekdum clear kar dete hain
          </div>

          {/* Two IP boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{ background: '#fff7ed', border: '2px solid #fb923c', borderRadius: 10, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#ea580c', marginBottom: 10 }}>🖥️ EC2 (Node) IP — PUBLIC</div>
              <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#c2410c', background: '#fed7aa', padding: '8px 14px', borderRadius: 6, marginBottom: 10 }}>13.201.138.12</div>
              <div style={{ fontSize: 12, color: '#9a3412', lineHeight: 1.8 }}>
                ✅ Browser se access ho sakti hai<br/>
                ✅ Internet par PUBLIC hai<br/>
                ✅ AWS Console mein dikh ti hai<br/>
                ✅ Hum isi IP pe request bhejte hain<br/>
                📌 EC2 instance ki IP hai — Pod ki nahi
              </div>
            </div>
            <div style={{ background: '#f5f3ff', border: '2px solid #a78bfa', borderRadius: 10, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#7c3aed', marginBottom: 10 }}>📦 Pod IP — PRIVATE (Cluster Internal)</div>
              <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '8px 14px', borderRadius: 6, marginBottom: 10 }}>10.42.0.x</div>
              <div style={{ fontSize: 12, color: '#4c1d95', lineHeight: 1.8 }}>
                ❌ Browser se directly access NAHI hoti<br/>
                ❌ Internet par visible nahi<br/>
                ❌ Pod restart pe IP badal jaati hai<br/>
                ❌ Hum kabhi ye IP use nahi karte<br/>
                📌 Sirf cluster ke andar hi kaam aati hai
              </div>
            </div>
          </div>

          {/* NodePort explanation */}
          <div style={{ background: '#f0fdf4', border: '2px solid #4ade80', borderRadius: 10, padding: 18, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d', marginBottom: 14 }}>⚙️ 3000:30080/TCP ka matlab — Step by Step</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flexWrap: 'wrap' }}>
              {[
                { num: '30080', label: 'NodePort', sub: 'EC2 ki port\n(external, public)', color: '#f97316', bg: '#fff7ed' },
                { arrow: '→\nforward\nhota hai' },
                { num: '3000', label: 'Container Port', sub: 'Pod ke andar\nExpress server', color: '#7c3aed', bg: '#f5f3ff' },
              ].map((item, i) => item.arrow ? (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontSize: 11, color: '#64748b', whiteSpace: 'pre', textAlign: 'center', padding: '0 4px' }}>{item.arrow}</div>
              ) : (
                <div key={i} style={{ background: item.bg, border: `2px solid ${item.color}40`, borderTop: `3px solid ${item.color}`, borderRadius: 8, padding: '14px 20px', textAlign: 'center', flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: item.color, fontFamily: 'monospace' }}>{item.num}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, whiteSpace: 'pre' }}>{item.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: '#166534', background: '#dcfce7', padding: 12, borderRadius: 6, lineHeight: 1.9 }}>
              <b>Simple bhasha mein:</b> <code style={{ background: '#bbf7d0', padding: '1px 6px', borderRadius: 3 }}>3000:30080/TCP</code> ka matlab —<br/>
              <b>"EC2 ke port 30080 par aane wali request ko Pod ke andar port 3000 pe bhejo"</b><br/><br/>
              <b>Tumhara request:</b> <code style={{ background: '#bbf7d0', padding: '1px 6px', borderRadius: 3 }}>http://13.201.138.12:30080/orders</code><br/>
              → EC2 IP <b>13.201.138.12</b> pe pahuncha (EC2 ki IP, Pod ki nahi)<br/>
              → kube-proxy ne port <b>30080</b> pe pakda<br/>
              → automatically forward kiya Pod ke andar port <b>3000</b> pe<br/>
              → Express server ne response diya
            </div>
          </div>

          {/* Visual flow diagram */}
          <div style={{ fontWeight: 700, fontSize: 13, color: '#0c4a6e', marginBottom: 12 }}>📊 Visual Flow — Request kaise jaati hai</div>
          <div style={{ background: '#0f172a', borderRadius: 10, padding: 20, fontFamily: 'monospace', fontSize: 12, overflowX: 'auto' }}>
            <div style={{ color: '#94a3b8', marginBottom: 12 }}># Tumhara browser request bhejta hai:</div>
            <div style={{ color: '#fbbf24' }}>GET http://13.201.138.12:30080/orders</div>
            <div style={{ color: '#64748b', marginTop: 8 }}>          ↓</div>
            <div style={{ color: '#94a3b8', marginTop: 4 }}>┌─────────────────────────────────────────────────┐</div>
            <div style={{ color: '#94a3b8' }}>│  EC2 Instance (Node)                            │</div>
            <div style={{ color: '#94a3b8' }}>│  Public IP: <span style={{ color: '#fb923c' }}>13.201.138.12</span>  ← YE EC2 KI IP HAI   │</div>
            <div style={{ color: '#94a3b8' }}>│                                                 │</div>
            <div style={{ color: '#94a3b8' }}>│  kube-proxy: port <span style={{ color: '#4ade80' }}>30080</span> → forward →            │</div>
            <div style={{ color: '#94a3b8' }}>│                                                 │</div>
            <div style={{ color: '#94a3b8' }}>│  ┌──────────────────────────────────────────┐  │</div>
            <div style={{ color: '#94a3b8' }}>│  │  Pod IP: <span style={{ color: '#a78bfa' }}>10.42.0.x</span>  ← YE POD KI IP HAI  │  │</div>
            <div style={{ color: '#94a3b8' }}>│  │                                          │  │</div>
            <div style={{ color: '#94a3b8' }}>│  │  ┌─────────────────────────────────┐    │  │</div>
            <div style={{ color: '#94a3b8' }}>│  │  │  Docker Container               │    │  │</div>
            <div style={{ color: '#94a3b8' }}>│  │  │  Express.js port <span style={{ color: '#38bdf8' }}>3000</span>           │    │  │</div>
            <div style={{ color: '#94a3b8' }}>│  │  │  <span style={{ color: '#86efac' }}>→ GET /orders → response ←</span>    │    │  │</div>
            <div style={{ color: '#94a3b8' }}>│  │  └─────────────────────────────────┘    │  │</div>
            <div style={{ color: '#94a3b8' }}>│  └──────────────────────────────────────────┘  │</div>
            <div style={{ color: '#94a3b8' }}>└─────────────────────────────────────────────────┘</div>
            <div style={{ color: '#64748b', marginTop: 8 }}>          ↓</div>
            <div style={{ color: '#4ade80', marginTop: 4 }}>{`{"orders": [...], "servedBy": "Pod:express-api-8594dc655b-8lx7k"}`}</div>
          </div>

          {/* Summary table */}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {[
              { q: 'Browser request kahan jaati hai?', a: 'EC2 Public IP: 13.201.138.12', color: '#f97316' },
              { q: '30080 kiska port hai?', a: 'EC2 (Node) ka port hai — Pod ka nahi', color: '#dc2626' },
              { q: '3000 kiska port hai?', a: 'Pod ke andar Docker container ka port', color: '#7c3aed' },
              { q: 'Pod IP kya hai?', a: '10.42.0.x — browser se access nahi', color: '#64748b' },
              { q: 'kube-proxy ka kaam?', a: 'Port 30080 → Pod:3000 forward karna', color: '#059669' },
              { q: 'NodePort range kya hoti hai?', a: '30000 se 32767 ke beech', color: '#0891b2' },
            ].map((item, i) => (
              <div key={i} style={{ background: '#f8fafc', border: `1px solid ${item.color}30`, borderLeft: `3px solid ${item.color}`, borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Q: {item.q}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: item.color }}>→ {item.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Tester — 3 Services */}
        <ServiceTester />

        {/* kubectl Commands */}
        <div style={SECTION}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#0c4a6e' }}>⌨️ kubectl Commands — EC2 SSH Mein Chalaao</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>SSH se EC2 mein jaao phir ye commands chalaao</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {[
              { title: 'Pod ke andar jaao', color: '#dc2626', cmds: [
                { cmd: 'kubectl get pods', note: 'pod ka naam dekho' },
                { cmd: 'kubectl exec -it express-api-8594dc655b-8lx7k -- /bin/sh', note: 'pod ke andar jao' },
                { cmd: 'wget -O- localhost:3000/health', note: 'andar se Express test karo' },
                { cmd: 'exit', note: 'pod se bahar aao' },
              ]},
              { title: 'Logs aur Info', color: '#0891b2', cmds: [
                { cmd: 'kubectl logs express-api-8594dc655b-8lx7k', note: 'pod ke logs dekho' },
                { cmd: 'kubectl describe pod express-api-8594dc655b-8lx7k', note: 'poori details dekho' },
                { cmd: 'kubectl get pods -o wide', note: 'pod ki IP bhi dekho' },
              ]},
              { title: 'Service Check', color: '#7c3aed', cmds: [
                { cmd: 'kubectl get svc', note: 'services list' },
                { cmd: 'kubectl get svc express-service -o yaml', note: 'full YAML output' },
                { cmd: 'kubectl describe svc express-service', note: 'endpoints dekho' },
              ]},
              { title: 'Deployment', color: '#059669', cmds: [
                { cmd: 'kubectl get deployments', note: 'deployments list' },
                { cmd: 'kubectl get all', note: 'sab kuch ek saath dekho' },
                { cmd: 'kubectl rollout status deployment/express-api', note: 'deployment status' },
              ]},
              { title: 'Scale Karo', color: '#d97706', cmds: [
                { cmd: 'kubectl scale deployment express-api --replicas=2', note: '2 pods bana do' },
                { cmd: 'kubectl get pods -w', note: 'live watch karo' },
                { cmd: 'kubectl scale deployment express-api --replicas=1', note: 'wapas 1 kar do' },
              ]},
              { title: 'Memory Check', color: '#64748b', cmds: [
                { cmd: 'free -m', note: 'EC2 ki total RAM dekho' },
                { cmd: 'kubectl get nodes', note: 'node status' },
                { cmd: 'sudo k3s crictl ps', note: 'k3s ke containers dekho' },
              ]},
            ].map((c, i) => (
              <div key={i} style={{ background: '#0f172a', borderRadius: 8, padding: 14, borderTop: `3px solid ${c.color}` }}>
                <div style={{ color: c.color, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>$ {c.title}</div>
                {c.cmds.map((item, j) => (
                  <div key={j} style={{ marginTop: 6 }}>
                    <div style={{ color: '#86efac', fontFamily: 'monospace', fontSize: 11 }}>{item.cmd}</div>
                    <div style={{ color: '#475569', fontSize: 10, marginTop: 1, paddingLeft: 8 }}>↳ {item.note}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Live kubectl get svc -o yaml output explained */}
        <div style={SECTION}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#0c4a6e' }}>
            🔍 kubectl get svc express-service -o yaml — Live Output Explained
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            Ye actual output hai jo EC2 par <code style={{background:'#f1f5f9',padding:'1px 6px',borderRadius:3}}>kubectl get svc express-service -o yaml</code> se mila
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Raw YAML */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#334155', marginBottom: 8 }}>📋 Actual Output (EC2 se mila)</div>
              <div style={{ background: '#0d1117', borderRadius: 8, padding: 14, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.8, overflowX: 'auto' }}>
                {[
                  ['apiVersion: v1',                       '#f472b6'],
                  ['kind: Service',                        '#f472b6'],
                  ['metadata:',                            '#67e8f9'],
                  ['  name: express-service',              '#fde68a'],
                  ['  namespace: default',                 '#fde68a'],
                  ['  resourceVersion: "527"',             '#94a3b8'],
                  ['  uid: 3a4e261d-e75d-...',             '#94a3b8'],
                  ['spec:',                                '#67e8f9'],
                  ['  clusterIP: 10.43.29.14',             '#fb923c'],
                  ['  type: NodePort',                     '#4ade80'],
                  ['  ports:',                             '#67e8f9'],
                  ['  - nodePort: 30080',                  '#fbbf24'],
                  ['    port: 3000',                       '#fbbf24'],
                  ['    targetPort: 3000',                 '#fbbf24'],
                  ['    protocol: TCP',                    '#fde68a'],
                  ['  selector:',                          '#67e8f9'],
                  ['    app: express-api',                 '#4ade80'],
                  ['  sessionAffinity: None',              '#94a3b8'],
                  ['  externalTrafficPolicy: Cluster',     '#94a3b8'],
                  ['status:',                              '#67e8f9'],
                  ['  loadBalancer: {}',                   '#94a3b8'],
                ].map(([text, color], i) => (
                  <div key={i} style={{ color }}>{text}</div>
                ))}
              </div>
            </div>
            {/* Explanations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#334155', marginBottom: 0 }}>💡 Har Field ka Matlab</div>
              {[
                { field: 'clusterIP: 10.43.29.14', color: '#fb923c', explain: 'Service ki INTERNAL IP — sirf cluster ke andar kaam aati hai. Pod se pod communication ke liye. Browser se directly access nahi hoti.' },
                { field: 'type: NodePort', color: '#4ade80', explain: 'Service type = NodePort matlab EC2 ke kisi port par expose karo. 3 types hain: ClusterIP (internal), NodePort (EC2 port), LoadBalancer (cloud LB).' },
                { field: 'nodePort: 30080', color: '#fbbf24', explain: 'YE WALA PORT! EC2 ke is port par browser request bhejta hai. Range 30000-32767. Hum http://13.201.138.12:30080 isi liye likhte hain.' },
                { field: 'port: 3000', color: '#fbbf24', explain: 'Service ki internal port — cluster ke andar doosre pods is port se is service ko access karte hain.' },
                { field: 'targetPort: 3000', color: '#fbbf24', explain: 'Pod ke andar container ka actual port. Express.js yahan listen karta hai. kube-proxy yahan forward karta hai.' },
                { field: 'selector: app=express-api', color: '#4ade80', explain: 'Is label waale pods ko dhundo aur unhe traffic bhejo. Deployment ke pod template ke labels se match hota hai.' },
                { field: 'externalTrafficPolicy: Cluster', color: '#94a3b8', explain: 'Cluster = traffic kisi bhi node se kisi bhi pod ko ja sakti hai. Local = sirf us node ke pods ko jaayegi jahan request aayi.' },
                { field: 'sessionAffinity: None', color: '#94a3b8', explain: 'None = har request kisi bhi pod ko ja sakti hai (round-robin). ClientIP = same client ki requests same pod ko jaayengi.' },
                { field: 'loadBalancer: {}', color: '#94a3b8', explain: 'Empty {} kyunki hum NodePort use kar rahe hain. Agar LoadBalancer type hota toh AWS ELB ka IP yahan aata. Hamara free tier NodePort hai.' },
                { field: 'resourceVersion: "527"', color: '#94a3b8', explain: 'k8s internal version number — har update pe badhta hai. etcd mein store hota hai. Concurrency control ke liye use hota hai.' },
                { field: 'uid: 3a4e261d-...', color: '#94a3b8', explain: 'Globally unique ID — puri duniya mein is Service ka ek hi ID hai. Delete karke recreate karo toh naya UID milega.' },
              ].map((item, i) => (
                <div key={i} style={{ background: '#f8fafc', borderLeft: `3px solid ${item.color}`, borderRadius: 4, padding: '8px 10px' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: item.color, marginBottom: 3 }}>{item.field}</div>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6 }}>{item.explain}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── REQUEST TRACE ─── */}
        <RequestTraceSection />

        {/* ─── POD TO POD ─── */}
        <PodToPodSection />

        {/* ─── YAML FILES ─── */}
        <YamlSection />

        {/* Concepts Grid */}
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#0c4a6e' }}>📚 Docker + Kubernetes — Deep Knowledge (Hindi)</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
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

        {/* Route 53 Link */}
        <div style={{ background: 'linear-gradient(135deg, #7c3aed15, #0891b215)', border: '1px solid #7c3aed30', borderRadius: 12, padding: 20, textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontSize: 18, marginBottom: 6 }}>🌐</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Route 53 + ALB DNS Routing</div>
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>
            Subdomain → ALB → Pod routing. nip.io free DNS se live demo — Host-based routing ka concept samjho.
          </div>
          <a href="/route53" style={{ background: '#7c3aed', color: '#fff', padding: '10px 24px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Route 53 Demo dekho →
          </a>
        </div>

      </div>
    </div>
  );
}
