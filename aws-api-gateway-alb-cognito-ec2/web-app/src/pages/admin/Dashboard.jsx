import { useAuth } from '../../context/AuthContext.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="page">
      <h1>Welcome, {user?.firstName || user?.email}</h1>
      <p className="muted">The sidebar shows only what your roles can access — pruned by rbac-service before it reaches the browser.</p>
      <div className="card-row">
        <div className="card-stat"><div className="label">Roles</div><div className="value">{(user?.roleKeys || []).join(', ')}</div></div>
        <div className="card-stat"><div className="label">Permissions</div><div className="value">{user?.permissions?.length || 0}</div></div>
      </div>
    </div>
  );
}
