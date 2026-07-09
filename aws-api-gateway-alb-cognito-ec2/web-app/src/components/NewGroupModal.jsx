import { useEffect, useState } from 'react';
import { rbac } from '../api/index.js';

export default function NewGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState([]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      rbac.users.list({ q, limit: 10 })
        .then((r) => setResults(r.rows || []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const toggle = (u) => {
    setPicked((prev) =>
      prev.some((p) => p.id === u.id) ? prev.filter((p) => p.id !== u.id) : [...prev, u],
    );
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !picked.length) return;
    onCreate({ name: name.trim(), memberIds: picked.map((p) => p.id) });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>New group</h3>
        <input
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          placeholder="Search users to add"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="chips">
          {picked.map((p) => (
            <span key={p.id} className="chip" onClick={() => toggle(p)}>
              {p.email} ×
            </span>
          ))}
        </div>
        <ul className="user-results">
          {results.map((u) => (
            <li key={u.id} onClick={() => toggle(u)}>
              <input type="checkbox" readOnly checked={picked.some((p) => p.id === u.id)} />
              <strong>{u.email}</strong>
              <span className="muted"> · {u.firstName} {u.lastName}</span>
            </li>
          ))}
          {q && results.length === 0 && <li className="empty">No matches</li>}
        </ul>
        <div className="modal-actions">
          <button type="button" className="link" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={!name.trim() || !picked.length}>Create group</button>
        </div>
      </form>
    </div>
  );
}
