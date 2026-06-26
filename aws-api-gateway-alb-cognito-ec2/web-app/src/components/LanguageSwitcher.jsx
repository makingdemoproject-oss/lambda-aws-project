import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { setLocale, selectLocale } from '../store/slices/uiSlice.js';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
];

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const current = useSelector(selectLocale);

  const change = (code) => {
    i18n.changeLanguage(code);
    dispatch(setLocale(code));
  };

  return (
    <label className="lang-switcher">
      <span className="visually-hidden">{t('nav.language')}</span>
      <select value={current} onChange={(e) => change(e.target.value)} aria-label={t('nav.language')}>
        {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
