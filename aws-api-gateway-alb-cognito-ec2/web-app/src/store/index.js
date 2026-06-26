/**
 * Redux Toolkit store — single source of truth for auth/menu/UI/cart state.
 *
 * Replaces the old AuthContext. Each slice keeps a narrow, well-typed shape;
 * cross-cutting derived data (e.g. "is this user a super_admin") lives in the
 * selectors so components don't recompute it inline.
 */
import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice.js';
import menu from './slices/menuSlice.js';
import ui   from './slices/uiSlice.js';
import cart from './slices/cartSlice.js';

export const store = configureStore({
  reducer: { auth, menu, ui, cart },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    // user/menu objects come straight from the API and contain ISO date strings —
    // safe to serialize, so default check is fine.
    serializableCheck: true,
  }),
});

export default store;
