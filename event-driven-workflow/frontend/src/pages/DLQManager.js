import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function DLQManager() {
  const [messages, setMessages] = useState([]);
  const [archived, setArchived] = useState([]);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('live');

  const fetchLive = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/dlq/messages');
      setMessages(res.data.messages || []);
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || err.message });
    }
    setLoading(false);
  };

  const fetchArchived = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/dlq/archived');
      setArchived(res.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === 'live') fetchLive();
    else fetchArchived();
  }, [tab]);

  const handleArchive = async (msg) => {
    setArchiving(msg.MessageId);
    try {
      await axios.post('/api/dlq/archive', {
        receiptHandle: msg.ReceiptHandle,
        messageId: msg.MessageId,
        body: msg.Body,
      });
      setResult({ type: 'success', message: `Message ${msg.MessageId.slice(0, 8)}... archived.` });
      fetchLive();
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.error || err.message });
    }
    setArchiving(null);
  };

  return (
    <div>
      <div className="page-title">💀 DLQ Manager</div>
      <div className="page-subtitle">Dead Letter Queue — messages that failed after 3 retries</div>

      {result && (
        <div className={`alert ${result.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {result.message}
        </div>
      )}

      <div className="section" style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
          <strong style={{ color: '#e2e8f0' }}>DLQ Flow:</strong> When Lambda 1 fails to process a message 3 times,
          SQS moves it to the Dead Letter Queue. From here you can inspect the message body,
          archive it to PostgreSQL + remove from DLQ, or redrive it manually.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #334155' }}>
        {['live', 'archived'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: '6px 6px 0 0', fontSize: 13, padding: '8px 18px' }}>
            {t === 'live' ? '📬 Live DLQ' : '🗂️ Archived'}
          </button>
        ))}
      </div>

      {tab === 'live' ? (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button className="btn btn-ghost" onClick={fetchLive} disabled={loading}>
              {loading ? 'Loading...' : '🔄 Poll DLQ (max 10)'}
            </button>
          </div>

          {!messages.length ? (
            <div className="section" style={{ textAlign: 'center', color: '#475569' }}>
              {loading ? 'Polling DLQ...' : '✅ DLQ is empty — no failed messages'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map(msg => (
                <div key={msg.MessageId} className="section" style={{ borderLeft: '3px solid #f87171' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontFamily: 'monospace' }}>
                        ID: {msg.MessageId}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                        Receive Count: <strong style={{ color: '#fbbf24' }}>{msg.Attributes?.ApproximateReceiveCount || '-'}</strong>
                      </div>
                      <pre style={{ fontSize: 12, color: '#94a3b8', background: '#0f172a', padding: 10, borderRadius: 6, overflowX: 'auto', maxHeight: 150, marginTop: 8 }}>
                        {(() => { try { return JSON.stringify(JSON.parse(msg.Body), null, 2); } catch { return msg.Body; } })()}
                      </pre>
                    </div>
                    <button className="btn btn-danger" style={{ flexShrink: 0, fontSize: 12 }}
                      disabled={archiving === msg.MessageId}
                      onClick={() => handleArchive(msg)}>
                      {archiving === msg.MessageId ? 'Archiving...' : '🗂️ Archive & Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button className="btn btn-ghost" onClick={fetchArchived} disabled={loading}>
              {loading ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {!archived.length ? (
            <div className="section" style={{ textAlign: 'center', color: '#475569' }}>
              No archived messages yet
            </div>
          ) : (
            <div className="section" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>ID</th><th>Message ID</th><th>Archived At</th></tr>
                  </thead>
                  <tbody>
                    {archived.map(row => (
                      <tr key={row.id}>
                        <td style={{ color: '#64748b' }}>{row.id}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.message_id?.slice(0, 20)}...</td>
                        <td style={{ color: '#64748b', fontSize: 12 }}>{new Date(row.archived_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
