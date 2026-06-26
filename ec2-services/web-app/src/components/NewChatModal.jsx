import { useEffect, useState } from 'react';
import { rbac } from '../api/index.js';

export default function NewChatModal({ onClose, onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      rbac.users.list({ q, limit: 10 })
        .then((r) => setResults(r.rows || []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Start a new chat</h3>
        <input
          autoFocus
          placeholder="Search users by name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="user-results">
          {results.map((u) => (
            <li key={u.id} onClick={() => onPick(u.id)}>
              <strong>{u.email}</strong>
              <span className="muted"> · {u.firstName} {u.lastName}</span>
            </li>
          ))}
          {q && results.length === 0 && <li className="empty">No matches</li>}
        </ul>
        <div className="modal-actions">
          <button className="link" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
