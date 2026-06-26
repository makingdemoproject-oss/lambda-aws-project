/**
 * Forgot-password — collects an email and asks rbac to send a reset link.
 *
 * The server always returns 204 (or "if the address exists you'll get an
 * email") so we can't leak which accounts exist. UX-wise we always show the
 * success message after a 200/2xx response, regardless of whether the
 * address was real.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { rbac } from '../api/index.js';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [done, setDone]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      await rbac.forgotPassword({ email });
      setDone(true);
    } catch (e2) {
      // Even on 429 we want a friendly message — don't reveal internals.
      setErr(e2.response?.data?.message || t('errors.generic'));
    } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Check your inbox</h1>
          <p className="muted">
            If <strong>{email}</strong> is registered with us, we've sent a link to reset your password.
            The link expires in 30 minutes.
          </p>
          <p><Link to="/login">Back to sign in</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>{t('auth.forgot')}</h1>
        <p className="muted">Enter the email you used to sign up — we'll send you a reset link.</p>
        {err && <div className="error">{err}</div>}
        <label>{t('auth.email')}
          <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button disabled={busy || !email}>{busy ? '…' : 'Send reset link'}</button>
        <p><Link to="/login">{t('auth.haveAccount')}</Link></p>
      </form>
    </div>
  );
}
