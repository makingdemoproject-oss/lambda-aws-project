/**
 * Email verification landing — user clicked the link in their inbox.
 *
 *   /verify-email?token=<hex>
 *
 * We hit the API once on mount, show success/failure, and let the user resend
 * if the token expired. Resend takes the email from the URL or asks for it.
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { rbac } from '../api/index.js';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const emailFromUrl = params.get('email') || '';
  const [state, setState] = useState('checking'); // checking | ok | bad
  const [err, setErr]     = useState(null);
  const [email, setEmail] = useState(emailFromUrl);
  const [resent, setResent] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    // React 18 StrictMode runs effects twice in dev — guard so we only call once.
    if (ran.current) return;
    ran.current = true;
    if (!token) { setState('bad'); setErr('Verification link is missing its token.'); return; }
    (async () => {
      try { await rbac.verifyEmail({ token }); setState('ok'); }
      catch (e) {
        setState('bad');
        setErr(e.response?.data?.message || 'Verification failed — the link may have expired.');
      }
    })();
  }, [token]);

  const resend = async (e) => {
    e.preventDefault();
    if (!email) return;
    try { await rbac.resendVerification({ email }); setResent(true); }
    catch (e2) { setErr(e2.response?.data?.message || 'Could not resend right now — try again in a minute.'); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {state === 'checking' && (<><h1>Verifying…</h1><p className="muted">Just a moment.</p></>)}
        {state === 'ok' && (
          <>
            <h1>Email verified</h1>
            <p className="muted">Thanks — your email is now confirmed.</p>
            <p><Link to="/login">Continue to sign in</Link></p>
          </>
        )}
        {state === 'bad' && (
          <>
            <h1>Couldn't verify</h1>
            {err && <div className="error">{err}</div>}
            {resent ? (
              <p className="muted">If <strong>{email}</strong> matches an account, a fresh link is on its way.</p>
            ) : (
              <form onSubmit={resend}>
                <label>Resend to
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your email" />
                </label>
                <button>Send new link</button>
              </form>
            )}
            <p><Link to="/login">Back to sign in</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
