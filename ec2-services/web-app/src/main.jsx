import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import { store } from './store/index.js';
import i18n from './i18n/index.js';
import App from './App.jsx';
import CookieConsent from './components/CookieConsent.jsx';
import 'leaflet/dist/leaflet.css';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <App />
          <CookieConsent />
        </BrowserRouter>
      </I18nextProvider>
    </Provider>
  </React.StrictMode>,
);
