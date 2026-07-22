import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Infrastructure() {
  const [stackStatus, setStackStatus] = useState(null);
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState(null);
  const [stackName, setStackName] = useState('event-driven-workflow-dev');

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/infra/status', { params: { stackName } });
      setStackStatus(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      if (msg.includes('does not exist')) {
        setStackStatus(null);
      }
    }
  };

  useEffect(() => { fetchStatus(); }, [stackName]);

  const handleDeploy = async () => {
    setDeploying(true);
    setResult(null);
    try {
      const res = await axios.post('/api/infra/deploy', { stackName, environment: 'dev' });
      setResult({ type: 'success', message: res.data.message });
      setTimeout(fetchStatus, 5000);
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || err.message });
    }
    setDeploying(false);
  };

  const STATUS_COLOR = {
    CREATE_COMPLETE: '#4ade80',
    UPDATE_COMPLETE: '#4ade80',
    CREATE_IN_PROGRESS: '#fbbf24',
    UPDATE_IN_PROGRESS: '#fbbf24',
    ROLLBACK_IN_PROGRESS: '#f87171',
    ROLLBACK_COMPLETE: '#f87171',
    CREATE_FAILED: '#f87171',
    DELETE_IN_PROGRESS: '#f87171',
  };

  const resources = [
    { icon: '⚡', name: 'EventBridge Bus', type: 'AWS::Events::EventBus', desc: 'workflow-event-bus-dev' },
    { icon: '📦', name: 'SQS Queue 1', type: 'AWS::SQS::Queue', desc: 'event-buffer-queue-dev' },
    { icon: '📦', name: 'SQS Queue 2', type: 'AWS::SQS::Queue', desc: 'notification-queue-dev' },
    { icon: '💀', name: 'Dead Letter Queue', type: 'AWS::SQS::Queue', desc: 'event-buffer-dlq-dev' },
    { icon: '📢', name: 'SNS Topic', type: 'AWS::SNS::Topic', desc: 'event-notification-topic-dev' },
    { icon: 'λ1', name: 'Lambda 1 — Processor', type: 'AWS::Lambda::Function', desc: 'SQS→Process→SNS' },
    { icon: 'λ2', name: 'Lambda 2 — Email', type: 'AWS::Lambda::Function', desc: 'SQS→SES email' },
    { icon: 'λ3', name: 'Lambda 3 — Analytics', type: 'AWS::Lambda::Function', desc: 'SNS→PostgreSQL' },
    { icon: '🪣', name: 'S3 DLQ Archival', type: 'AWS::S3::Bucket', desc: 'Failed messages archive' },
    { icon: '🔐', name: 'IAM Roles (×3)', type: 'AWS::IAM::Role', desc: 'Per-Lambda least-privilege' },
  ];

  return (
    <div>
      <div className="page-title">🏗️ Infrastructure</div>
      <div className="page-subtitle">Deploy and monitor CloudFormation stack — creates all AWS resources</div>

      {result && (
        <div className={`alert ${result.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {result.message}
        </div>
      )}

      {/* Stack Control */}
      <div className="section">
        <div className="section-title">CloudFormation Stack</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input value={stackName} onChange={e => setStackName(e.target.value)}
            style={{ padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 13, width: 280 }} />
          <button className="btn btn-primary" onClick={handleDeploy} disabled={deploying}>
            {deploying ? 'Deploying...' : '🚀 Deploy Stack'}
          </button>
          <button className="btn btn-ghost" onClick={fetchStatus}>
            🔄 Check Status
          </button>
        </div>

        {stackStatus ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>Stack Status</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: STATUS_COLOR[stackStatus.status] || '#94a3b8' }}>
                {stackStatus.status}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>Created</div>
              <div style={{ fontSize: 13, color: '#e2e8f0' }}>{stackStatus.createdAt ? new Date(stackStatus.createdAt).toLocaleString() : '-'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>Updated</div>
              <div style={{ fontSize: 13, color: '#e2e8f0' }}>{stackStatus.updatedAt ? new Date(stackStatus.updatedAt).toLocaleString() : '-'}</div>
            </div>
            {stackStatus.statusReason && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>Reason</div>
                <div style={{ fontSize: 13, color: '#f87171' }}>{stackStatus.statusReason}</div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: '#475569', fontSize: 13 }}>Stack not deployed yet. Click "Deploy Stack" to create all resources.</div>
        )}

        {/* Stack Outputs */}
        {stackStatus?.outputs?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Outputs</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Key</th><th>Value</th></tr></thead>
                <tbody>
                  {stackStatus.outputs.map(o => (
                    <tr key={o.OutputKey}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{o.OutputKey}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>{o.OutputValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Resources List */}
      <div className="section">
        <div className="section-title">Resources in Stack</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {resources.map((r, i) => (
            <div key={i} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 12 }}>
              <div style={{ fontSize: r.icon.startsWith('λ') ? 14 : 20, color: '#38bdf8', fontWeight: 700, width: 32, flexShrink: 0, textAlign: 'center' }}>
                {r.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{r.name}</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{r.type}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="alert alert-info">
        <strong>Before deploying:</strong> Upload Lambda zips to S3 bucket first using <code>scripts/deploy-lambdas.js</code>.
        Run: <code>node scripts/deploy-lambdas.js</code>
      </div>
    </div>
  );
}
