import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const STATUS_BADGE = {
  received:   'badge-gray',
  processing: 'badge-yellow',
  published:  'badge-blue',
  failed:     'badge-red',
};

export default function EventsLog() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ status: '', eventType: '', limit: 50, offset: 0 });
  const [selected, setSelected] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.eventType) params.eventType = filters.eventType;
      params.limit = filters.limit;
      params.offset = filters.offset;

      const res = await axios.get('/api/events', { params });
      setEvents(res.data.events || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleFilter = (key, val) => setFilters(f => ({ ...f, [key]: val, offset: 0 }));

  return (
    <div>
      <div className="page-title">📋 Events Log</div>
      <div className="page-subtitle">All events stored in PostgreSQL — processed by Lambda 1</div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Status</label>
          <select value={filters.status} onChange={e => handleFilter('status', e.target.value)}
            style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 13 }}>
            <option value="">All</option>
            <option value="received">received</option>
            <option value="processing">processing</option>
            <option value="published">published</option>
            <option value="failed">failed</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Event Type</label>
          <input value={filters.eventType} onChange={e => handleFilter('eventType', e.target.value)}
            placeholder="e.g. UserRegistered"
            style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 13, width: 180 }} />
        </div>
        <button className="btn btn-ghost" onClick={fetchEvents} style={{ height: 36 }}>
          🔄 Refresh
        </button>
        <span style={{ color: '#64748b', fontSize: 13, alignSelf: 'center' }}>
          {total} total events
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Table */}
        <div style={{ flex: 1 }}>
          <div className="section" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              {loading ? (
                <div className="loading" style={{ padding: 20 }}>Loading...</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Event Type</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: '#475569', padding: 24 }}>No events yet. Send one from the Send Event page.</td></tr>
                    ) : events.map(ev => (
                      <tr key={ev.id} onClick={() => setSelected(ev)}
                        style={{ cursor: 'pointer', background: selected?.id === ev.id ? '#162032' : '' }}>
                        <td style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{ev.id}</td>
                        <td><span className="badge badge-blue">{ev.event_type}</span></td>
                        <td style={{ color: '#64748b', fontSize: 12 }}>{ev.source}</td>
                        <td><span className={`badge ${STATUS_BADGE[ev.status] || 'badge-gray'}`}>{ev.status}</span></td>
                        <td style={{ color: '#64748b', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(ev.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}
              disabled={filters.offset === 0}
              onClick={() => setFilters(f => ({ ...f, offset: Math.max(0, f.offset - f.limit) }))}>
              ← Prev
            </button>
            <span style={{ alignSelf: 'center', fontSize: 12, color: '#64748b' }}>
              {filters.offset + 1}–{Math.min(filters.offset + filters.limit, total)} of {total}
            </span>
            <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}
              disabled={filters.offset + filters.limit >= total}
              onClick={() => setFilters(f => ({ ...f, offset: f.offset + f.limit }))}>
              Next →
            </button>
          </div>
        </div>

        {/* Payload Viewer */}
        {selected && (
          <div className="section" style={{ width: 320, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="section-title" style={{ marginBottom: 0, border: 'none', padding: 0 }}>Event #{selected.id}</div>
              <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setSelected(null)}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              <strong style={{ color: '#94a3b8' }}>Type:</strong> {selected.event_type}<br />
              <strong style={{ color: '#94a3b8' }}>Source:</strong> {selected.source}<br />
              <strong style={{ color: '#94a3b8' }}>Status:</strong> {selected.status}<br />
              <strong style={{ color: '#94a3b8' }}>Created:</strong> {new Date(selected.created_at).toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Payload</div>
            <pre style={{ fontSize: 12, color: '#94a3b8', background: '#0f172a', padding: 12, borderRadius: 6, overflowX: 'auto', maxHeight: 300 }}>
              {JSON.stringify(selected.payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
