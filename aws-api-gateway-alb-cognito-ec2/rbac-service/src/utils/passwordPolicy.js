/**
 * Centralised password-policy module.
 *
 * Defaults follow OWASP ASVS L1 recommendations:
 *   - 10–128 characters
 *   - at least one uppercase, one lowercase, one digit, one symbol
 *   - cannot be the same as the email (case-insensitive)
 *   - cannot be in our small "common passwords" deny-list (extend with a real
 *     list like haveibeenpwned in production)
 *
 * Returns a Joi-compatible custom validator AND a plain-function check so
 * the same policy is enforced at registration, change-password, and reset.
 */
const COMMON = new Set([
  'password','password1','password123','12345678','qwerty123',
  'admin1234','letmein!','welcome1','iloveyou1','passw0rd',
]);

const MIN = 10;
const MAX = 128;
const RULES = [
  { re: /[a-z]/,                msg: 'at least one lowercase letter' },
  { re: /[A-Z]/,                msg: 'at least one uppercase letter' },
  { re: /\d/,                   msg: 'at least one digit' },
  { re: /[^A-Za-z0-9]/,         msg: 'at least one symbol' },
];

function check(password, { email } = {}) {
  const errors = [];
  if (typeof password !== 'string') errors.push('Password is required');
  else {
    if (password.length < MIN) errors.push(`At least ${MIN} characters`);
    if (password.length > MAX) errors.push(`At most ${MAX} characters`);
    for (const r of RULES) if (!r.re.test(password)) errors.push(r.msg);
    if (email && password.toLowerCase().includes(email.toLowerCase().split('@')[0])) {
      errors.push('Password may not contain your email handle');
    }
    if (COMMON.has(password.toLowerCase())) errors.push('Password is too common — pick something unique');
  }
  return { ok: errors.length === 0, errors };
}

/** Joi `.custom()` adapter — usable directly in validators. */
const joiAdapter = (value, helpers) => {
  const { ok, errors } = check(value, { email: helpers?.state?.ancestors?.[0]?.email });
  return ok ? value : helpers.error('any.invalid', { message: errors.join('; ') });
};

module.exports = { check, joiAdapter, MIN, MAX };
