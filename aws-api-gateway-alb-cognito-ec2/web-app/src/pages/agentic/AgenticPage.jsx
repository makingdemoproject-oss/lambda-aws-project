/**
 * Agentic dashboard — list past agent runs, open alerts, trigger a manual run.
 *
 * Visible to anyone with `agentic:read`. The "Trigger run" form requires
 * `agentic:run` (we still render it for everyone and rely on the server's
 * 403, but disabling here is a nice UX win — uses the <Can> wrapper).
 */
import { useEffect, useState } from 'react';
import { http } from '../../api/http.js';
import Pagination from '../../components/Pagination.jsx';
import FilterBar from '../../components/FilterBar.jsx';
import Can from '../../components/Can.jsx';

const AGENTIC = '/agentic';

export default function AgenticPage() {
  const [runs, setRuns]     = useState({ items: [], total: 0 });
  const [page, setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters]   = useState({ status: '', trigger: '' });
  const [alerts, setAlerts] = useState({ items: [], total: 0 });
  const [channels, setChannels] = useState([]);
  const [goal, setGoal]     = useState('');
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState(null);

  const load = async () => {
    const params = { page, pageSize, ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v)) };
    const [r, a, c] = await Promise.all([
      http.get(`${AGENTIC}/runs`,    { params }).then((x) => x.data.data),
      http.get(`${AGENTIC}/alerts`,  { params: { page: 1, pageSize: 10, state: 'open' } }).then((x) => x.data.data),
      http.get(`${AGENTIC}/notify/channels`).then((x) => x.data.data.channels),
    ]);
    setRuns(r); setAlerts(a); setChannels(c);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [page, pageSize, filters]);

  const trigger = async (e) => {
    e.preventDefault();
    if (!goal.trim()) return;
    setBusy(true); setErr(null);
    try {
      await http.post(`${AGENTIC}/runs`, { goal });
      setGoal('');
      await load();
    } catch (e2) { setErr(e2.response?.data?.message || 'Failed to trigger run'); }
    finally { setBusy(false); }
  };

  return (
    <div className="agentic-page">
      <header className="agentic-header">
        <h1>AI Agent</h1>
        <div className="channels">
          {channels.length === 0
            ? <span className="muted">No notification channels enabled</span>
            : channels.map((c) => <span key={c} className="badge">{c}</span>)}
        </div>
      </header>

      <Can permission="agentic:run">
        <form onSubmit={trigger} className="agentic-trigger">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Tell the agent what to do — e.g. summarize today's orders and ride bookings"
            rows={2}
          />
          <button className="btn btn-primary" disabled={busy || !goal.trim()}>{busy ? 'Running…' : 'Run agent'}</button>
          {err && <div className="error">{err}</div>}
        </form>
      </Can>

      <section>
        <h2>Open alerts</h2>
        {alerts.items.length === 0
          ? <p className="muted">No open alerts.</p>
          : <ul className="alerts">
              {alerts.items.map((a) => (
                <li key={a.id} className={`sev-${a.severity}`}>
                  <strong>{a.title}</strong>
                  <small className="muted"> · {a.kind} · {new Date(a.detectedAt).toLocaleString()}</small>
                  {a.summary && <p>{a.summary}</p>}
                </li>
              ))}
            </ul>}
      </section>

      <section>
        <h2>Recent runs</h2>
        <FilterBar
          value={filters}
          onChange={(v) => { setPage(1); setFilters(v); }}
          fields={[
            { name: 'status', label: 'Status', type: 'select', options: [
              { value: '', label: 'Any' },
              { value: 'running', label: 'Running' },
              { value: 'success', label: 'Success' },
              { value: 'failed',  label: 'Failed' },
            ]},
            { name: 'trigger', label: 'Trigger', type: 'select', options: [
              { value: '', label: 'Any' },
              { value: 'manual',    label: 'Manual' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'event',     label: 'Event' },
            ]},
          ]}
        />
        <table className="table">
          <thead><tr><th>When</th><th>Trigger</th><th>Goal</th><th>Status</th><th>Steps</th></tr></thead>
          <tbody>
            {runs.items.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.startedAt).toLocaleString()}</td>
                <td>{r.trigger}{r.triggerKey ? `:${r.triggerKey}` : ''}</td>
                <td className="ellipsis" title={r.goal}>{r.goal}</td>
                <td><span className={`badge status-${r.status}`}>{r.status}</span></td>
                <td>{(r.steps || []).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page} pageSize={pageSize} total={runs.total}
          onPageChange={setPage} onPageSizeChange={setPageSize}
        />
      </section>
    </div>
  );
}
