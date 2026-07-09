/**
 * Live password-strength checklist. Mirrors the OWASP-aligned policy from
 * rbac-service/src/utils/passwordPolicy.js — keep these rules in sync.
 *
 *   <PasswordPolicy value={pw} email={form.email} />
 *
 * Renders a tick / cross next to each requirement. The checklist updates as
 * the user types so they're never surprised by a server-side rejection.
 */
import { useTranslation } from 'react-i18next';

const COMMON = new Set([
  'password','password1','password123','12345678','qwerty123',
  'admin1234','letmein!','welcome1','iloveyou1','passw0rd',
]);

const rules = (pw, email) => {
  const handle = email ? email.toLowerCase().split('@')[0] : '';
  return [
    { ok: pw.length >= 10 && pw.length <= 128, label: '10–128 characters' },
    { ok: /[a-z]/.test(pw),                    label: 'one lowercase letter' },
    { ok: /[A-Z]/.test(pw),                    label: 'one uppercase letter' },
    { ok: /\d/.test(pw),                       label: 'one digit' },
    { ok: /[^A-Za-z0-9]/.test(pw),             label: 'one symbol' },
    { ok: !handle || !pw.toLowerCase().includes(handle), label: 'does not contain your email handle' },
    { ok: !COMMON.has(pw.toLowerCase()),       label: 'not a common password' },
  ];
};

export function passwordIsValid(pw, email) {
  return rules(pw, email).every((r) => r.ok);
}

export default function PasswordPolicy({ value = '', email = '' }) {
  const { t } = useTranslation();
  const list = rules(value, email);
  const score = list.filter((r) => r.ok).length;
  return (
    <div className="pw-policy">
      <div className="pw-meter">
        <div className={`pw-meter-bar pw-score-${score}`} style={{ width: `${(score / list.length) * 100}%` }} />
      </div>
      <ul>
        {list.map((r) => (
          <li key={r.label} className={r.ok ? 'ok' : 'todo'}>
            <span aria-hidden>{r.ok ? '✓' : '○'}</span> {r.label}
          </li>
        ))}
      </ul>
      <small className="muted">{t('common.search') /* keeps i18n catalog ref */ && null}</small>
    </div>
  );
}
