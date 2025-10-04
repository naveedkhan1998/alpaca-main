import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App';
import '../index.css';
import { Provider } from 'react-redux';
import { store } from './store';

export function bootstrapApp() {
  const landingRoot = document.getElementById('landing-root');
  if (landingRoot) {
    landingRoot.setAttribute('hidden', 'true');
  }

  const container = document.getElementById('app-root');

  if (!container) {
    throw new Error('App root element not found');
  }

  container.removeAttribute('hidden');

  ReactDOM.createRoot(container).render(
    <Provider store={store}>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </Provider>
  );
}
