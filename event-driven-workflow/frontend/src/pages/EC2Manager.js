import React, { useEffect, useState } from 'react';
import axios from 'axios';

const STATE_BADGE = {
  running:      { cls: 'badge-green',  label: '● running'  },
  stopped:      { cls: 'badge-red',    label: '○ stopped'  },
  stopping:     { cls: 'badge-yellow', label: '◉ stopping' },
  pending:      { cls: 'badge-yellow', label: '◉ pending'  },
  'shutting-down': { cls: 'badge-red', label: '◉ shutting-down' },
};

export default function EC2Manager() {
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [result, setResult] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/ec2/status');
      setInstance(res.data);
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || err.message });
    }
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleAction = async (action) => {
    setActionLoading(action);
    setResult(null);
    try {
      const res = await axios.post(`/api/ec2/${action}`);
      setResult({ type: 'success', message: res.data.message });
      // Poll for updated state after 5 seconds
      setTimeout(fetchStatus, 5000);
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || err.message });
    }
    setActionLoading(null);
  };

  const stateInfo = instance ? (STATE_BADGE[instance.state] || { cls: 'badge-gray', label: instance.state }) : null;

  return (
    <div>
      <div className="page-title">🖥️ EC2 Manager</div>
      <div className="page-subtitle">PostgreSQL-Server (i-0dda96ea16a03281d) — ap-south-1</div>

      {result && (
        <div className={`alert ${result.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {result.message}
        </div>
      )}

      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        <strong>Note:</strong> EC2 public IP changes on every start. After starting, check the new IP and update
        <code style={{ background: '#0f172a', padding: '1px 6px', borderRadius: 4 }}>PG_HOST</code> in your .env file + backend config.
      </div>

      {loading ? (
        <div className="loading">Fetching EC2 status...</div>
      ) : instance ? (
        <>
          <div className="section">
            <div className="section-title">Instance Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>State</div>
                <span className={`badge ${stateInfo.cls}`} style={{ fontSize: 13, padding: '4px 14px' }}>
                  {stateInfo.label}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Instance ID</div>
                <div style={{ fontSize: 13, color: '#e2e8f0', fontFamily: 'monospace' }}>{instance.instanceId}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Public IP</div>
                <div style={{ fontSize: 16, color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
                  {instance.publicIp || '—'}
                </div>
                {instance.publicIp && (
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Use this as PG_HOST</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Private IP</div>
                <div style={{ fontSize: 13, color: '#e2e8f0', fontFamily: 'monospace' }}>{instance.privateIp || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Instance Type</div>
                <div style={{ fontSize: 13, color: '#e2e8f0' }}>{instance.instanceType}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Name</div>
                <div style={{ fontSize: 13, color: '#e2e8f0' }}>{instance.name || '—'}</div>
              </div>
              {instance.launchTime && (
                <div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Launch Time</div>
                  <div style={{ fontSize: 13, color: '#e2e8f0' }}>{new Date(instance.launchTime).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>

          <div className="section">
            <div className="section-title">Actions</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-success"
                disabled={instance.state === 'running' || actionLoading}
                onClick={() => handleAction('start')}>
                {actionLoading === 'start' ? 'Starting...' : '▶ Start Instance'}
              </button>
              <button className="btn btn-danger"
                disabled={instance.state === 'stopped' || actionLoading}
                onClick={() => handleAction('stop')}>
                {actionLoading === 'stop' ? 'Stopping...' : '■ Stop Instance'}
              </button>
              <button className="btn btn-ghost" onClick={fetchStatus} disabled={loading}>
                🔄 Refresh Status
              </button>
            </div>
          </div>

          <div className="section">
            <div className="section-title">PostgreSQL Connection Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { label: 'Host', value: instance.publicIp || 'Start EC2 to get IP' },
                { label: 'Port', value: '5432' },
                { label: 'Database', value: 'rbacdb' },
                { label: 'User', value: 'lambdauser' },
                { label: 'Password', value: '••••••••' },
              ].map(f => (
                <div key={f.label} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</div>
                  <div style={{ fontSize: 13, color: '#e2e8f0', fontFamily: 'monospace' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="section" style={{ color: '#475569', textAlign: 'center' }}>
          Could not fetch instance details. Check AWS credentials.
        </div>
      )}
    </div>
  );
}
