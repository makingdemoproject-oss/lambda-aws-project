/**
 * Authenticated change-password — for users who know their current password
 * and just want to rotate it. Server forces re-auth + revokes all sibling
 * refresh tokens on success, so we clear local tokens and bounce to /login.
 */
import { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { rbac } from '../api/index.js';
import { selectUser, logout } from '../store/slices/authSlice.js';
import PasswordPolicy, { passwordIsValid } from '../components/PasswordPolicy.jsx';

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const user = useSelector(selectUser);
  const [cur, setCur]   = useState('');
  const [pw, setPw]     = useState('');
  const [pw2, setPw2]   = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);
  const [done, setDone] = useState(false);

  const canSubmit = useMemo(
    () => cur && pw === pw2 && passwordIsValid(pw, user?.email || ''),
    [cur, pw, pw2, user?.email],
  );

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await rbac.changePassword({ currentPassword: cur, newPassword: pw });
      setDone(true);
      // Server invalidates the active session — force re-login.
      setTimeout(async () => { await dispatch(logout()); nav('/login'); }, 1500);
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Change failed');
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Password changed</h1>
          <p className="muted">Signing you out — please log back in with your new password.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Change password</h1>
        <p className="muted">Signed in as <strong>{user?.email}</strong></p>
        {err && <div className="error">{err}</div>}
        <label>Current password
          <input type="password" required autoFocus value={cur} onChange={(e) => setCur(e.target.value)} />
        </label>
        <label>New password
          <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <PasswordPolicy value={pw} email={user?.email} />
        <label>Confirm new password
          <input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          {pw2 && pw !== pw2 && <small className="error-inline">Passwords don't match</small>}
        </label>
        <button disabled={busy || !canSubmit}>{busy ? '…' : t('common.save')}</button>
      </form>
    </div>
  );
}
