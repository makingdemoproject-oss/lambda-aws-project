import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [queues, setQueues] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get('/api/analytics').catch(() => ({ data: { totals: [], last24h: [] } })),
      axios.get('/api/queues/status').catch(() => ({ data: {} })),
    ]).then(([analyticsRes, queuesRes]) => {
      setStats(analyticsRes.data);
      setQueues(queuesRes.data);
      setLoading(false);
    });
  }, []);

  const totalEvents = stats?.totals?.reduce((s, r) => s + r.total, 0) || 0;
  const last24h = stats?.last24h?.reduce((s, r) => s + r.count, 0) || 0;
  const queueTotal = queues
    ? Object.values(queues).reduce((s, q) => s + (q.visible || 0), 0)
    : 0;

  const architectureSteps = [
    { icon: '🌐', label: 'Event Source', color: '#60a5fa' },
    { icon: '→', label: '', color: '#475569' },
    { icon: '⚡', label: 'EventBridge', color: '#a78bfa' },
    { icon: '→', label: '', color: '#475569' },
    { icon: '📦', label: 'SQS Queue 1', color: '#34d399' },
    { icon: '→', label: '', color: '#475569' },
    { icon: 'λ1', label: 'Processor', color: '#fbbf24', isLambda: true },
    { icon: '→', label: '', color: '#475569' },
    { icon: '📢', label: 'SNS Topic', color: '#f472b6' },
  ];

  const fanoutSteps = [
    { icon: '📦', label: 'SQS Queue 2', color: '#34d399' },
    { icon: 'λ2', label: 'Email Sender', color: '#fbbf24', isLambda: true },
    { icon: '✉️', label: 'SES Email', color: '#60a5fa' },
    { icon: 'λ3', label: 'Analytics', color: '#fbbf24', isLambda: true },
    { icon: '🗄️', label: 'PostgreSQL', color: '#94a3b8' },
    { icon: '💀', label: 'DLQ → S3', color: '#f87171' },
  ];

  return (
    <div>
      <div className="page-title">📊 Dashboard</div>
      <div className="page-subtitle">EventBridge → SQS → Lambda → SNS fan-out → SES + Analytics</div>

      {loading ? (
        <div className="loading">Loading stats...</div>
      ) : (
        <div className="cards-row">
          <div className="card">
            <div className="card-label">Total Events</div>
            <div className="card-value">{totalEvents}</div>
            <div className="card-sub">All time</div>
          </div>
          <div className="card">
            <div className="card-label">Last 24 Hours</div>
            <div className="card-value">{last24h}</div>
            <div className="card-sub">Events processed</div>
          </div>
          <div className="card">
            <div className="card-label">In Queues</div>
            <div className="card-value">{queueTotal}</div>
            <div className="card-sub">Pending messages</div>
          </div>
          <div className="card">
            <div className="card-label">Event Types</div>
            <div className="card-value">{stats?.totals?.length || 0}</div>
            <div className="card-sub">Distinct types</div>
          </div>
        </div>
      )}

      {/* Architecture Diagram */}
      <div className="section">
        <div className="section-title">Architecture Flow</div>
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 700, flexWrap: 'wrap' }}>
            {architectureSteps.map((step, i) => (
              step.label === '' ? (
                <span key={i} style={{ color: '#475569', fontSize: 18 }}>→</span>
              ) : (
                <div key={i} style={{
                  background: '#0f172a',
                  border: `1px solid ${step.color}40`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  textAlign: 'center',
                  minWidth: 80,
                }}>
                  <div style={{ fontSize: step.isLambda ? 14 : 20, color: step.color, fontWeight: step.isLambda ? 700 : 'normal' }}>
                    {step.icon}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{step.label}</div>
                </div>
              )
            ))}
          </div>
          <div style={{ marginTop: 14, paddingLeft: 8, borderLeft: '2px solid #f472b640' }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>SNS Fan-out →</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {fanoutSteps.map((step, i) => (
                <div key={i} style={{
                  background: '#0f172a',
                  border: `1px solid ${step.color}40`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  textAlign: 'center',
                  minWidth: 70,
                }}>
                  <div style={{ fontSize: step.isLambda ? 13 : 18, color: step.color, fontWeight: step.isLambda ? 700 : 'normal' }}>
                    {step.icon}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{step.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Event Types */}
      {stats?.totals?.length > 0 && (
        <div className="section">
          <div className="section-title">Top Event Types (Last 7 Days)</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Event Type</th><th>Total Count</th></tr>
              </thead>
              <tbody>
                {stats.totals.map((row, i) => (
                  <tr key={i}>
                    <td><span className="badge badge-blue">{row.event_type}</span></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
