/**
 * Pure UI state — locale + dark/light + sidebar open. Persisted into
 * localStorage so a refresh keeps the user's chosen language and theme.
 */
import { createSlice } from '@reduxjs/toolkit';

const read = (k, def) => { try { return localStorage.getItem(k) ?? def; } catch { return def; } };

const slice = createSlice({
  name: 'ui',
  initialState: {
    locale: read('ui.locale', 'en'),
    theme:  read('ui.theme',  'light'),
    sidebarOpen: false,
    toasts: [],
  },
  reducers: {
    setLocale(s, a)    { s.locale = a.payload; localStorage.setItem('ui.locale', a.payload); },
    setTheme(s, a)     { s.theme  = a.payload; localStorage.setItem('ui.theme',  a.payload); },
    toggleSidebar(s)   { s.sidebarOpen = !s.sidebarOpen; },
    addToast(s, a)     { s.toasts.push({ id: Date.now() + Math.random(), ...a.payload }); },
    removeToast(s, a)  { s.toasts = s.toasts.filter((t) => t.id !== a.payload); },
  },
});

export const { setLocale, setTheme, toggleSidebar, addToast, removeToast } = slice.actions;
export const selectLocale = (s) => s.ui.locale;
export const selectTheme  = (s) => s.ui.theme;
export const selectToasts = (s) => s.ui.toasts;
export default slice.reducer;
