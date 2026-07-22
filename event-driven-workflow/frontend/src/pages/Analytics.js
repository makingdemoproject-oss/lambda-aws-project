import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get('/api/analytics', { params: { days } })
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  const maxCount = data?.totals?.reduce((m, r) => Math.max(m, r.total), 0) || 1;

  const COLORS = ['#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#f472b6', '#f87171'];

  return (
    <div>
      <div className="page-title">📈 Analytics</div>
      <div className="page-subtitle">Event counts by type — updated by Lambda 3 via SNS subscription</div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[1, 7, 14, 30].map(d => (
          <button key={d} className={`btn ${days === d ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setDays(d)} style={{ padding: '7px 16px', fontSize: 13 }}>
            {d}d
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading analytics...</div>
      ) : (
        <>
          {/* Bar chart by event type */}
          <div className="section">
            <div className="section-title">Events by Type — Last {days} Days</div>
            {!data?.totals?.length ? (
              <div style={{ color: '#475569', fontSize: 13 }}>No data yet. Send some events first.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.totals.map((row, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 160, fontSize: 13, color: '#e2e8f0', flexShrink: 0 }}>
                      <span className="badge badge-blue">{row.event_type}</span>
                    </div>
                    <div style={{ flex: 1, background: '#0f172a', borderRadius: 4, height: 28, position: 'relative', overflow: 'hidden' }}>
                      <div style={{
                        width: `${(row.total / maxCount) * 100}%`,
                        background: COLORS[i % COLORS.length],
                        height: '100%',
                        borderRadius: 4,
                        transition: 'width 0.4s ease',
                        minWidth: row.total > 0 ? 4 : 0,
                      }} />
                    </div>
                    <div style={{ width: 48, textAlign: 'right', fontSize: 15, fontWeight: 700, color: COLORS[i % COLORS.length], fontVariantNumeric: 'tabular-nums' }}>
                      {row.total}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Last 24 hours */}
          {data?.last24h?.length > 0 && (
            <div className="section">
              <div className="section-title">Last 24 Hours</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Event Type</th><th>Count</th><th>Last Seen</th></tr>
                  </thead>
                  <tbody>
                    {data.last24h.map((row, i) => (
                      <tr key={i}>
                        <td><span className="badge badge-blue">{row.event_type}</span></td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.count}</td>
                        <td style={{ color: '#64748b', fontSize: 12 }}>{new Date(row.last_seen).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily breakdown */}
          {data?.daily?.length > 0 && (
            <div className="section">
              <div className="section-title">Daily Breakdown</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Event Type</th><th>Source</th><th>Count</th></tr>
                  </thead>
                  <tbody>
                    {data.daily.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                          {new Date(row.event_date).toLocaleDateString()}
                        </td>
                        <td><span className="badge badge-blue">{row.event_type}</span></td>
                        <td style={{ color: '#64748b', fontSize: 12 }}>{row.source}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
