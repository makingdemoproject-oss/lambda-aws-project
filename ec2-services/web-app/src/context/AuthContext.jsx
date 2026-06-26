/**
 * Back-compat shim for the pre-Redux call sites that imported `useAuth()`.
 *
 * Internally it now reads from Redux + dispatches the auth thunks. New code
 * should use `useSelector(selectUser)` / `useDispatch()` directly. Eventually
 * we can delete this file and update the remaining call sites in one sweep.
 *
 * The shim deliberately keeps the same shape `{ user, menu, loading, login,
 * register, logout, can }` the old context exported, so existing pages
 * (LoginPage, AdminLayout, etc.) don't need to change today.
 */
import { useSelector, useDispatch } from 'react-redux';
import {
  selectUser, selectIsSuperAdmin, selectAuthReady,
  login as loginThunk, register as registerThunk, logout as logoutThunk,
} from '../store/slices/authSlice.js';
import { selectMenu } from '../store/slices/menuSlice.js';

// Keep AuthProvider as a no-op for any legacy imports — Redux <Provider> is
// already wired in main.jsx.
export function AuthProvider({ children }) { return children; }

export function useAuth() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const menu = useSelector(selectMenu);
  const ready = useSelector(selectAuthReady);
  const sa = useSelector(selectIsSuperAdmin);

  return {
    user,
    menu,
    loading: !ready,
    login: async (email, password) => {
      const r = await dispatch(loginThunk({ email, password }));
      if (r.error) throw r;
    },
    register: async (form) => {
      const r = await dispatch(registerThunk(form));
      if (r.error) throw r;
    },
    logout: async () => { await dispatch(logoutThunk()); },
    can: (key) => {
      if (!user) return false;
      if (sa) return true;
      return user.permissions?.includes(key);
    },
  };
}
