/**
 * Auth slice — current user, JWT lifecycle, login/logout/register thunks.
 *
 * Roles are mirrored into localStorage (`roleKeys`) so a hard reload doesn't
 * flash the "Login" screen for half a second before the /auth/me round-trip
 * resolves. The actual permission checks still wait for the bootstrap thunk
 * to come back, so this is purely a UX optimization, not a security boundary.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { rbac } from '../../api/index.js';
import { tokens } from '../../utils/tokens.js';

const ROLES_KEY = 'auth.roleKeys';

const readRoles = () => {
  try { return JSON.parse(localStorage.getItem(ROLES_KEY) || '[]'); }
  catch { return []; }
};

const initialState = {
  user: null,
  // Optimistic — populated from localStorage so the sidebar can render correctly
  // before bootstrap finishes. Replaced when /auth/me returns.
  cachedRoles: readRoles(),
  status: 'idle',     // 'idle' | 'loading' | 'ready' | 'error'
  error: null,
};

export const bootstrap = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  if (!tokens.access()) return null;
  try { return await rbac.me(); }
  catch (e) { tokens.clear(); return rejectWithValue(e.response?.data?.message || 'session expired'); }
});

export const login = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    const { accessToken, refreshToken, user } = await rbac.login(creds);
    tokens.set(accessToken, refreshToken);
    return user;
  } catch (e) { return rejectWithValue(e.response?.data?.message || 'login failed'); }
});

export const register = createAsyncThunk('auth/register', async (form, { rejectWithValue }) => {
  try {
    const { accessToken, refreshToken, user } = await rbac.register(form);
    tokens.set(accessToken, refreshToken);
    return user;
  } catch (e) { return rejectWithValue(e.response?.data?.message || 'registration failed'); }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try { await rbac.logout(); } catch { /* ignore */ }
  tokens.clear();
  localStorage.removeItem(ROLES_KEY);
  return null;
});

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    const accept = (state, action) => {
      state.user = action.payload;
      state.status = 'ready';
      state.error = null;
      if (action.payload?.roleKeys) {
        state.cachedRoles = action.payload.roleKeys;
        localStorage.setItem(ROLES_KEY, JSON.stringify(action.payload.roleKeys));
      }
    };
    b.addCase(bootstrap.pending,  (s) => { s.status = 'loading'; });
    b.addCase(bootstrap.fulfilled, accept);
    b.addCase(bootstrap.rejected, (s, a) => { s.status = 'ready'; s.user = null; s.error = a.payload; });

    b.addCase(login.pending,  (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(login.fulfilled, accept);
    b.addCase(login.rejected, (s, a) => { s.status = 'ready'; s.error = a.payload; });

    b.addCase(register.pending,  (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(register.fulfilled, accept);
    b.addCase(register.rejected, (s, a) => { s.status = 'ready'; s.error = a.payload; });

    b.addCase(logout.fulfilled, (s) => { s.user = null; s.cachedRoles = []; s.status = 'ready'; });
  },
});

// ─── selectors ────────────────────────────────────────────────────────
export const selectUser     = (s) => s.auth.user;
export const selectAuthReady = (s) => s.auth.status === 'ready';
export const selectIsAuthed = (s) => Boolean(s.auth.user);
export const selectRoleKeys = (s) => s.auth.user?.roleKeys || s.auth.cachedRoles || [];
export const selectIsSuperAdmin = (s) => selectRoleKeys(s).includes('super_admin');
export const selectHasPermission = (key) => (s) => {
  if (selectIsSuperAdmin(s)) return true;
  return (s.auth.user?.permissions || []).includes(key);
};
export const selectHasAnyPermission = (keys) => (s) => keys.some((k) => selectHasPermission(k)(s));
export const selectHasRole = (key) => (s) => selectRoleKeys(s).includes(key);

export default slice.reducer;
