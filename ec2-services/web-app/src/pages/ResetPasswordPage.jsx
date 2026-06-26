/**
 * Reset-password — landed on by clicking the link in the email.
 *
 * Token is in the URL (?token=…). Form takes the new password twice and
 * shows the policy checklist live; we block submit until every rule passes
 * so the server's policy validator never has to reject a malformed payload.
 */
import { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { rbac } from '../api/index.js';
import PasswordPolicy, { passwordIsValid } from '../components/PasswordPolicy.jsx';

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get('token') || '';
  const email = params.get('email') || '';
  const [pw, setPw]       = useState('');
  const [pw2, setPw2]     = useState('');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState(null);
  const [done, setDone]   = useState(false);

  const canSubmit = useMemo(() => Boolean(token) && pw === pw2 && passwordIsValid(pw, email), [token, pw, pw2, email]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await rbac.resetPassword({ token, password: pw });
      setDone(true);
      setTimeout(() => nav('/login'), 2500);
    } catch (e2) {
      setErr(e2.response?.data?.message || 'Reset failed — the link may have expired.');
    } finally { setBusy(false); }
  };

  if (!token) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Invalid reset link</h1>
          <p className="muted">The link is missing its token. Request a fresh one.</p>
          <p><Link to="/forgot-password">Request new link</Link></p>
        </div>
      </div>
    );
  }
  if (done) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Password updated</h1>
          <p className="muted">All set — taking you to sign in…</p>
        </div>
      </div>
    );
  }
  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Choose a new password</h1>
        {err && <div className="error">{err}</div>}
        <label>New password
          <input type="password" required autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <PasswordPolicy value={pw} email={email} />
        <label>Confirm new password
          <input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          {pw2 && pw !== pw2 && <small className="error-inline">Passwords don't match</small>}
        </label>
        <button disabled={busy || !canSubmit}>{busy ? '…' : t('common.save')}</button>
      </form>
    </div>
  );
}
