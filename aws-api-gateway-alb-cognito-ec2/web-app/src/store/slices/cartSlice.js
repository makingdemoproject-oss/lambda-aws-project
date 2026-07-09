/**
 * Cart slice — mirrors the server cart, but keeps a local optimistic copy so
 * the UI feels snappy. The server is the source of truth: every mutation
 * dispatches a thunk that updates the server and then replaces the slice
 * with the response.
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ecom } from '../../api/index.js';

export const loadCart = createAsyncThunk('cart/load', async (_, { rejectWithValue }) => {
  try { return await ecom.cart.view(); }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'failed to load cart'); }
});

export const addToCart = createAsyncThunk('cart/add', async ({ variantId, qty }, { rejectWithValue }) => {
  try { return await ecom.cart.add({ variantId, qty }); }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'failed to add'); }
});

export const updateCartItem = createAsyncThunk('cart/update', async ({ id, qty }, { rejectWithValue }) => {
  try { return await ecom.cart.update(id, { qty }); }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'failed to update'); }
});

export const removeCartItem = createAsyncThunk('cart/remove', async (id, { rejectWithValue }) => {
  try { await ecom.cart.remove(id); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.message || 'failed to remove'); }
});

const slice = createSlice({
  name: 'cart',
  initialState: { items: [], totalCents: 0, currency: 'INR', status: 'idle', error: null },
  reducers: {
    clearCart(state) { state.items = []; state.totalCents = 0; },
  },
  extraReducers: (b) => {
    const apply = (s, a) => {
      if (!a.payload) return;
      s.items      = a.payload.items      ?? s.items;
      s.totalCents = a.payload.totalCents ?? s.totalCents;
      s.currency   = a.payload.currency   ?? s.currency;
      s.status = 'ready';
    };
    b.addCase(loadCart.pending,    (s) => { s.status = 'loading'; });
    b.addCase(loadCart.fulfilled,  apply);
    b.addCase(loadCart.rejected,   (s, a) => { s.status = 'error'; s.error = a.payload; });
    b.addCase(addToCart.fulfilled, apply);
    b.addCase(updateCartItem.fulfilled, apply);
    b.addCase(removeCartItem.fulfilled, (s, a) => {
      s.items = s.items.filter((i) => i.id !== a.payload);
    });
  },
});

export const { clearCart } = slice.actions;
export const selectCart      = (s) => s.cart;
export const selectCartCount = (s) => s.cart.items.reduce((n, i) => n + (i.qty || 0), 0);
export default slice.reducer;
