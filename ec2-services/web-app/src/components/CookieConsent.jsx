import { useEffect, useState } from 'react';
import { cookieConsent } from '../utils/cookieConsent.js';

/**
 * GDPR-style cookie banner.
 *
 *   - Shown when no saved preferences OR they're older than 12 months
 *   - "Essential" is locked-on (auth + cart can't function without it)
 *   - "Analytics" and "Marketing" are opt-in by default
 *   - "Accept all" / "Reject non-essential" big buttons; "Customize" expands
 *
 * Other code subscribes via window.addEventListener('cookie-consent:change')
 * to lazy-load analytics SDKs only after consent.
 */
export default function CookieConsent() {
  const [open, setOpen]   = useState(false);
  const [more, setMore]   = useState(false);
  const [prefs, setPrefs] = useState({ analytics: false, marketing: false });

  useEffect(() => { setOpen(cookieConsent.needsPrompt()); }, []);

  if (!open) return null;

  const save = (overrides) => {
    cookieConsent.set({ ...prefs, ...overrides });
    setOpen(false);
  };

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie preferences">
      <div className="cookie-card">
        <div className="cookie-head">
          <span className="cookie-emoji" aria-hidden>🍪</span>
          <div>
            <h3>We use cookies to keep this site useful</h3>
            <p className="muted">
              Essential cookies keep you signed in and your cart intact.
              Analytics + marketing cookies help us improve and reach you with offers — only with your permission.
            </p>
          </div>
        </div>

        {more && (
          <ul className="cookie-options">
            <li>
              <label>
                <input type="checkbox" checked disabled />
                <div>
                  <strong>Essential</strong>
                  <span className="muted"> — required for sign-in, cart, payments. Always on.</span>
                </div>
              </label>
            </li>
            <li>
              <label>
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                />
                <div>
                  <strong>Analytics</strong>
                  <span className="muted"> — anonymous page views + funnel timings (SigNoz RUM).</span>
                </div>
              </label>
            </li>
            <li>
              <label>
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                />
                <div>
                  <strong>Marketing</strong>
                  <span className="muted"> — 3rd-party pixels (Meta, Google Ads) for ad targeting.</span>
                </div>
              </label>
            </li>
          </ul>
        )}

        <div className="cookie-actions">
          <button className="link"           onClick={() => setMore((v) => !v)}>{more ? 'Hide details' : 'Customize'}</button>
          <button className="btn btn-ghost"  onClick={() => save({ analytics: false, marketing: false })}>Essential only</button>
          {more && <button className="btn btn-secondary" onClick={() => save({})}>Save my choices</button>}
          <button className="btn btn-primary" onClick={() => save({ analytics: true, marketing: true })}>Accept all</button>
        </div>
      </div>
    </div>
  );
}
