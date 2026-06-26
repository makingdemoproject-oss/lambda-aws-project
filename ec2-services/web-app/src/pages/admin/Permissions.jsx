import { useEffect, useState } from 'react';
import { rbac } from '../../api/index.js';

/**
 * Read-only permission catalogue.
 * Permissions are seeded at install time — adding a new one is a code
 * change in rbac-service (seeders + the service that enforces it). The UI
 * just shows what exists so admins know what they can grant to a role.
 */
export default function Permissions() {
  const [perms, setPerms] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    rbac.roles.permissions()
      .then(setPerms)
      .catch((e) => setErr(e.response?.data?.message || e.message));
  }, []);

  // group by module
  const grouped = perms.reduce((acc, p) => {
    (acc[p.module] = acc[p.module] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="page">
      <header className="page-head">
        <h1>Permissions catalogue</h1>
        <span className="muted">{perms.length} total</span>
      </header>
      {err && <div className="error">{err}</div>}
      <p className="muted">Read-only. Permissions are seeded by the rbac-service deployment — adding a new one requires a code change.</p>

      {Object.entries(grouped).map(([module, list]) => (
        <section key={module} className="perm-group">
          <h2>{module}</h2>
          <table className="table">
            <thead><tr><th>Key</th><th>Name</th><th>Description</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td><code>{p.key}</code></td>
                  <td>{p.name}</td>
                  <td className="muted">{p.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
