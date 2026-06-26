/**
 * Post-login bootstrap — runs once on app load and after every successful
 * login. Fetches /auth/me + /users/me/menu in parallel so the sidebar and
 * permission gates are populated before the first render of the protected
 * area.
 *
 * Decoupled from React Router so it can be called from anywhere (login form,
 * register form, App-level effect).
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { bootstrap, selectAuthReady, selectIsAuthed } from '../store/slices/authSlice.js';
import { fetchMenu, clearMenu } from '../store/slices/menuSlice.js';

export default function useBootstrap() {
  const dispatch = useDispatch();
  const authed = useSelector(selectIsAuthed);
  const ready  = useSelector(selectAuthReady);

  useEffect(() => { dispatch(bootstrap()); }, [dispatch]);

  useEffect(() => {
    if (authed) dispatch(fetchMenu());
    else dispatch(clearMenu());
  }, [authed, dispatch]);

  return { ready, authed };
}
