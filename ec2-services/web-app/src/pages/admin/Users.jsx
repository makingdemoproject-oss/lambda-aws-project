import { useEffect, useState, useCallback } from 'react';
import { rbac } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Users admin — list with search, activate/deactivate, assign roles via modal.
 * All mutations call rbac-service which invalidates the perm cache automatically.
 */
export default function Users() {
  const { can } = useAuth();
  const [data, setData]   = useState({ rows: [], count: 0 });
  const [q, setQ]         = useState('');
  const [allRoles, setAllRoles] = useState([]);
  const [editing, setEditing]   = useState(null);     // user being edited
  const [err, setErr]     = useState(null);

  const reload = useCallback(async () => {
    try { setData(await rbac.users.list({ q, limit: 100 })); }
    catch (e) { setErr(e.response?.data?.message || e.message); }
  }, [q]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { rbac.roles.list().then((r) => setAllRoles(r.rows || [])).catch(() => {}); }, []);

  const toggleActive = async (u) => {
    try { await rbac.users.setActive(u.id, !u.isActive); reload(); }
    catch (e) { setErr(e.response?.data?.message || e.message); }
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Users</h1>
        <input className="search-input" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </header>
      {err && <div className="error">{err}</div>}
      <table className="table">
        <thead>
          <tr><th>Email</th><th>Name</th><th>Roles</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {data.rows.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.firstName} {u.lastName}</td>
              <td>{(u.roles || []).map((r) => <span key={r.id} className="chip muted">{r.name}</span>)}</td>
              <td>
                <span className={u.isActive ? 'badge ok' : 'badge danger'}>
                  {u.isActive ? 'Active' : 'Disabled'}
                </span>
              </td>
              <td>
                {can('user:manage') && (
                  <>
                    <button className="link" onClick={() => setEditing(u)}>Roles</button>
                    <button className="link" onClick={() => toggleActive(u)}>
                      {u.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {data.count === 0 && <tr><td colSpan={5} className="empty">No users found</td></tr>}
        </tbody>
      </table>

      {editing && (
        <RoleAssignModal
          user={editing}
          allRoles={allRoles}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}

function RoleAssignModal({ user, allRoles, onClose, onSaved }) {
  const [selected, setSelected] = useState(new Set((user.roles || []).map((r) => r.id)));
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);

  const toggle = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const save = async () => {
    setBusy(true); setErr(null);
    try { await rbac.users.updateRoles(user.id, [...selected]); onSaved(); }
    catch (e) { setErr(e.response?.data?.message || e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Roles for {user.email}</h3>
        {err && <div className="error">{err}</div>}
        <ul className="checklist">
          {allRoles.map((r) => (
            <li key={r.id} onClick={() => toggle(r.id)}>
              <input type="checkbox" readOnly checked={selected.has(r.id)} />
              <strong>{r.name}</strong>
              <span className="muted"> ({r.key})</span>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button className="link" onClick={onClose}>Cancel</button>
          <button type="button" onClick={save} disabled={busy} className="primary">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
