/**
 * Sidebar menu slice. Lazily fetches /users/me/menu after login, caches in
 * Redux. The shape comes straight from rbac — a flat array of
 *   { key, label, icon, path, permissionKey, sortOrder, children? }.
 *
 * Visibility is double-gated: rbac filters by role before returning, and the
 * <Can> component re-checks the permissionKey at render time so we don't
 * leak admin links via a stale cached payload.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { rbac } from '../../api/index.js';

export const fetchMenu = createAsyncThunk('menu/fetch', async (_, { rejectWithValue }) => {
  try { return await rbac.myMenu(); }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'failed to load menu'); }
});

const slice = createSlice({
  name: 'menu',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {
    clearMenu(state) { state.items = []; state.status = 'idle'; state.error = null; },
  },
  extraReducers: (b) => {
    b.addCase(fetchMenu.pending,  (s) => { s.status = 'loading'; });
    b.addCase(fetchMenu.fulfilled, (s, a) => { s.items = a.payload || []; s.status = 'ready'; });
    b.addCase(fetchMenu.rejected, (s, a) => { s.status = 'error'; s.error = a.payload; });
  },
});

export const { clearMenu } = slice.actions;
export const selectMenu = (s) => s.menu.items;
export const selectMenuStatus = (s) => s.menu.status;
export default slice.reducer;
