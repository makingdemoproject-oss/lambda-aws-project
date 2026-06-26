import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ firstName: '', email: '', password: '' });
  const [err, setErr] = useState(null); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try { await register(f); nav('/'); }
    catch (e2) { setErr(e2.response?.data?.message || 'Registration failed'); }
    finally { setBusy(false); }
  };
  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Create account</h1>
        {err && <div className="error">{err}</div>}
        <label>First name<input required value={f.firstName} onChange={set('firstName')} /></label>
        <label>Email<input type="email" required value={f.email} onChange={set('email')} /></label>
        <label>Password<input type="password" required value={f.password} onChange={set('password')} /><small>Min 8 chars, upper+lower+digit.</small></label>
        <button disabled={busy}>{busy ? '…' : 'Sign up'}</button>
        <p>Already have one? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
