/**
 * Cookie consent storage helper.
 *
 *   { essential: true,            // always on — required for auth + cart to work
 *     analytics: boolean,         // page-view + funnel metrics (SigNoz RUM)
 *     marketing: boolean,         // 3rd-party pixels (Meta, Google Ads)
 *     savedAt:   iso-timestamp }
 *
 * Re-prompt every 12 months per ePrivacy guidance.
 */
const KEY = 'platform.cookie-consent.v1';
const STALE_MS = 365 * 24 * 60 * 60 * 1000;

export const cookieConsent = {
  get() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
  },
  set(prefs) {
    const value = { essential: true, ...prefs, savedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(value));
    // Tell the rest of the app — page-level effects can subscribe.
    window.dispatchEvent(new CustomEvent('cookie-consent:change', { detail: value }));
    return value;
  },
  clear() { localStorage.removeItem(KEY); },
  needsPrompt() {
    const v = this.get();
    if (!v?.savedAt) return true;
    return Date.now() - new Date(v.savedAt).getTime() > STALE_MS;
  },
  allow(category) { return !!this.get()?.[category]; },
};
