/**
 * <Can> — declarative permission/role gate.
 *
 *   <Can permission="user:read"><AdminMenu /></Can>
 *   <Can permissionAny={['agentic:read','agentic:run']}>…</Can>
 *   <Can role="super_admin">…</Can>
 *   <Can permission="x" fallback={<Forbidden />}>…</Can>
 *
 * The check is centralized via the Redux selectors so we apply the same
 * "super_admin bypasses everything" rule everywhere.
 */
import { useSelector } from 'react-redux';
import {
  selectIsAuthed, selectIsSuperAdmin,
  selectHasPermission, selectHasAnyPermission, selectHasRole,
} from '../store/slices/authSlice.js';

export default function Can({ permission, permissionAny, role, requireAuth = true, fallback = null, children }) {
  const authed = useSelector(selectIsAuthed);
  const sa     = useSelector(selectIsSuperAdmin);
  const okPerm = useSelector(permission       ? selectHasPermission(permission)        : () => true);
  const okAny  = useSelector(permissionAny    ? selectHasAnyPermission(permissionAny)  : () => true);
  const okRole = useSelector(role             ? selectHasRole(role)                    : () => true);

  if (requireAuth && !authed) return fallback;
  if (sa) return children;       // bypass for super_admin
  if (!okPerm || !okAny || !okRole) return fallback;
  return children;
}
