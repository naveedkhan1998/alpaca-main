import '../index.css';
import { getApiBaseUrl } from '../shared/lib/environment';

const HEALTH_CHECK_INTERVAL = 120000; // 2 minutes

const warmupHealthCheck = async () => {
  const baseUrl = getApiBaseUrl();
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const healthUrl = `${normalizedBase}/core/`;

  try {
    await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
  } catch (error) {
    console.warn('Pre-warming API resources failed', error);
  }
};

let healthInterval: number | undefined;

export function bootstrapLanding() {
  const landingRoot = document.getElementById('landing-root');
  if (landingRoot) {
    landingRoot.removeAttribute('hidden');
  }

  const appRoot = document.getElementById('app-root');
  if (appRoot) {
    appRoot.setAttribute('hidden', 'true');
  }

  warmupHealthCheck();

  if (healthInterval) {
    window.clearInterval(healthInterval);
  }

  healthInterval = window.setInterval(warmupHealthCheck, HEALTH_CHECK_INTERVAL);

  window.addEventListener(
    'beforeunload',
    () => {
      if (healthInterval) {
        window.clearInterval(healthInterval);
      }
    },
    { once: true }
  );
}
