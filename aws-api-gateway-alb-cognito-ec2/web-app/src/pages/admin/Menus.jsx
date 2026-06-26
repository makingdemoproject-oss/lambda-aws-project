import { useEffect, useState, useCallback } from 'react';
import { rbac } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Menus admin — manage the sidebar tree.
 * The tree drives what every authenticated user sees in their navigation
 * (via GET /users/me/menu). Add a menu here → it appears for the right roles
 * on the next page reload.
 */
export default function Menus() {
  const { can } = useAuth();
  const [tree, setTree] = useState([]);
  const [flat, setFlat] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState(null);

  const reload = useCallback(async () => {
    try {
      const [m, r] = await Promise.all([rbac.menus.list(), rbac.roles.list()]);
      setTree(m.tree); setFlat(m.flat);
      setRoles(r.rows || []);
    } catch (e) { setErr(e.response?.data?.message || e.message); }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const remove = async (menu) => {
    if (!confirm(`Delete menu "${menu.label}"? Children will cascade-delete too.`)) return;
    try { await rbac.menus.remove(menu.id); reload(); }
    catch (e) { setErr(e.response?.data?.message || e.message); }
  };

  const renderNode = (n, depth = 0) => (
    <li key={n.id} style={{ marginLeft: depth * 18 }}>
      <div className="menu-row">
        <span className="muted">[{n.sortOrder}]</span>
        <strong>{n.label}</strong>
        <code className="muted">{n.key}</code>
        {n.path && <span className="muted"> → {n.path}</span>}
        {n.permissionKey && <span className="chip muted">{n.permissionKey}</span>}
        {!n.isActive && <span className="badge danger">hidden</span>}
        {can('menu:manage') && (
          <span className="actions">
            <button className="link" onClick={() => setEditing(n)}>Edit</button>
            <button className="link danger" onClick={() => remove(n)}>Delete</button>
          </span>
        )}
      </div>
      {n.children?.length > 0 && <ul>{n.children.map((c) => renderNode(c, depth + 1))}</ul>}
    </li>
  );

  return (
    <div className="page">
      <header className="page-head">
        <h1>Menus</h1>
        {can('menu:manage') && <button className="primary" onClick={() => setEditing({})}>+ New menu</button>}
      </header>
      {err && <div className="error">{err}</div>}

      <ul className="menu-tree">{tree.map((n) => renderNode(n))}</ul>

      {editing !== null && (
        <MenuFormModal
          menu={editing}
          parents={flat}
          roles={roles}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); }}
        />
      )}
    </div>
  );
}

function MenuFormModal({ menu, parents, roles, onClose, onSaved }) {
  const isNew = !menu.id;
  const [form, setForm] = useState({
    key: menu.key || '',
    label: menu.label || '',
    icon: menu.icon || '',
    path: menu.path || '',
    parentId: menu.parentId || '',
    permissionKey: menu.permissionKey || '',
    sortOrder: menu.sortOrder ?? 0,
    isActive: menu.isActive ?? true,
    roleIds: new Set((menu.roles || []).map((r) => r.id)),
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const toggleRole = (id) => {
    const s = new Set(form.roleIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setForm({ ...form, roleIds: s });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const payload = {
        label: form.label,
        icon: form.icon || null,
        path: form.path || null,
        parentId: form.parentId || null,
        permissionKey: form.permissionKey || null,
        sortOrder: Number(form.sortOrder),
        isActive: form.isActive,
        roleIds: [...form.roleIds],
        ...(isNew ? { key: form.key } : {}),
      };
      if (isNew) await rbac.menus.create(payload);
      else       await rbac.menus.update(menu.id, payload);
      onSaved();
    } catch (e2) { setErr(e2.response?.data?.message || e2.message); }
    finally { setBusy(false); }
  };

  // can't be your own parent or descendant — easy guard: just exclude self
  const possibleParents = parents.filter((p) => p.id !== menu.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal modal-lg" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{isNew ? 'New menu' : `Edit "${menu.label}"`}</h3>
        {err && <div className="error">{err}</div>}

        <label>Key
          <input value={form.key} onChange={set('key')} required disabled={!isNew}
            placeholder="lowercase, digits, dash, underscore (e.g. my-orders)" />
        </label>
        <label>Label
          <input value={form.label} onChange={set('label')} required maxLength={160} />
        </label>
        <div className="row">
          <label className="flex-1">Path
            <input value={form.path} onChange={set('path')} placeholder="/admin/orders (leave blank for grouping header)" />
          </label>
          <label>Icon
            <input value={form.icon} onChange={set('icon')} placeholder="cart" />
          </label>
        </div>
        <div className="row">
          <label className="flex-1">Parent
            <select value={form.parentId} onChange={set('parentId')}>
              <option value="">— top level —</option>
              {possibleParents.map((p) => <option key={p.id} value={p.id}>{p.label} ({p.key})</option>)}
            </select>
          </label>
          <label>Sort
            <input type="number" min="0" value={form.sortOrder} onChange={set('sortOrder')} />
          </label>
        </div>
        <label>Permission key (optional)
          <input value={form.permissionKey} onChange={set('permissionKey')}
            placeholder="e.g. product:read — visible only to users with this permission" />
        </label>
        <label className="row">
          <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
          Active (shown in sidebar)
        </label>

        <fieldset className="perm-picker">
          <legend>Visible to roles ({form.roleIds.size})</legend>
          <ul className="checklist">
            {roles.map((r) => (
              <li key={r.id} onClick={() => toggleRole(r.id)}>
                <input type="checkbox" readOnly checked={form.roleIds.has(r.id)} />
                <strong>{r.name}</strong> <code className="muted">{r.key}</code>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="modal-actions">
          <button type="button" className="link" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
