import { useSelector } from 'react-redux';
import { selectHasPermission, selectIsSuperAdmin } from '../store/slices/authSlice.js';

export default function RequirePerm({ need, children }) {
  const sa = useSelector(selectIsSuperAdmin);
  const ok = useSelector(selectHasPermission(need));
  if (sa || ok) return children;
  return <div className="empty">You don't have permission to view this page.</div>;
}
