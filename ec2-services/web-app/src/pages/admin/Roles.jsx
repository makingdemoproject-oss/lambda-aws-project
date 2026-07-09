import { useEffect, useState, useCallback } from 'react';
import { rbac } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Roles admin — list, create, edit (with grouped permission picker), delete.
 * System roles (super_admin etc.) are read-only — the API enforces that too.
 */
export default function Roles() {
  const { can } = useAuth();
  const [data, setData] = useState({ rows: [], count: 0 });
  const [permissions, setPermissions] = useState([]);
  const [editing, setEditing] = useState(null);      // {} for new, role obj for edit
  const [err, setErr] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [roles, perms] = await Promise.all([rbac.roles.list(), rbac.roles.permissions()]);
      setData(roles);
      setPermissions(perms);
    } catch (e) { setErr(e.response?.data?.message || e.message); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const remove = async (role) => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try { await rbac.roles.remove(role.id); reload(); }
    catch (e) { setErr(e.response?.data?.message || e.message); }
  };

  return (
    <div className="page">
      <header className="page-head">
        <h1>Roles</h1>
        {can('role:manage') && <button className="primary" onClick={() => setEditing({})}>+ New role</button>}
      </header>
      {err && <div className="error">{err}</div>}

      <table className="table">
        <thead><tr><th>Key</th><th>Name</th><th>Permissions</th><th>Type</th><th>Actions</th></tr></thead>
        <tbody>
          {data.rows.map((r) => (
            <tr key={r.id}>
              <td><code>{r.key}</code></td>
              <td>{r.name}</td>
              <td>
                <span className="muted">{(r.permissions || []).length} grants</span>
              </td>
              <td>{r.isSystem ? <span className="badge ok">System</span> : <span className="badge">Custom</span>}</td>
              <td>
                {can('role:manage') && (
                  <>
                    <button className="link" onClick={() => setEditing(r)}>Edit</button>
                    {!r.isSystem && <button className="link danger" onClick={() => remove(r)}>Delete</button>}
                  </>
                )}
              </td>
            </tr>
          ))}
          {data.count === 0 && <tr><td colSpan={5} className="empty">No roles yet</td></tr>}
        </tbody>
      </table>

      {editing !== null && (
        <RoleFormModal
          role={editing}
          permissions={permissions}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}

function RoleFormModal({ role, permissions, onClose, onSaved }) {
  const isNew = !role.id;
  const [form, setForm] = useState({
    key: role.key || '',
    name: role.name || '',
    description: role.description || '',
    permissionIds: new Set((role.permissions || []).map((p) => p.id)),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);

  // group permissions by module for a saner picker
  const grouped = permissions.reduce((acc, p) => {
    (acc[p.module] = acc[p.module] || []).push(p);
    return acc;
  }, {});

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const togglePerm = (id) => {
    const s = new Set(form.permissionIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setForm({ ...form, permissionIds: s });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const payload = {
        name: form.name, description: form.description,
        permissionIds: [...form.permissionIds],
        ...(isNew ? { key: form.key } : {}),
      };
      if (isNew) await rbac.roles.create(payload);
      else       await rbac.roles.update(role.id, payload);
      onSaved();
    } catch (e2) { setErr(e2.response?.data?.message || e2.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal modal-lg" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{isNew ? 'New role' : `Edit "${role.name}"`}</h3>
        {err && <div className="error">{err}</div>}

        <label>Key
          <input value={form.key} onChange={set('key')} required disabled={!isNew}
            placeholder="lowercase, digits, underscore (e.g. store_manager)" />
          {!isNew && <small>System / created roles keep their key.</small>}
        </label>
        <label>Name
          <input value={form.name} onChange={set('name')} required maxLength={120} />
        </label>
        <label>Description
          <input value={form.description} onChange={set('description')} maxLength={255} />
        </label>

        <fieldset className="perm-picker">
          <legend>Permissions ({form.permissionIds.size} selected)</legend>
          {Object.entries(grouped).map(([module, perms]) => (
            <div key={module} className="perm-group">
              <div className="perm-group-head">{module}</div>
              <ul className="checklist">
                {perms.map((p) => (
                  <li key={p.id} onClick={() => togglePerm(p.id)}>
                    <input type="checkbox" readOnly checked={form.permissionIds.has(p.id)} />
                    <strong>{p.name}</strong>
                    <code className="muted"> {p.key}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </fieldset>

        <div className="modal-actions">
          <button type="button" className="link" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
