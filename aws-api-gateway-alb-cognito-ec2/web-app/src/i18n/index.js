/**
 * react-i18next bootstrap.
 *
 * Resources are inlined so the app works offline (and tests don't need a
 * network mock). Add a new locale by dropping a JSON file next to this and
 * registering it in `resources` below.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import hi from './hi.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, hi: { translation: hi } },
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'ui.locale',
    },
  });

export default i18n;
