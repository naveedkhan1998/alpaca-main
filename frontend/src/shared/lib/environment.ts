export const checkEnvironment = () => {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(
    window.location.hostname
  );
  localStorage.setItem('isLocalhost', JSON.stringify(isLocalhost));
};

const getEnvironmentMode = () => {
  // Check for manual override via environment variable
  const forceEnv = import.meta.env.VITE_FORCE_ENV;
  if (forceEnv === 'development' || forceEnv === 'production') {
    return forceEnv;
  }

  // Fall back to Vite's default mode
  return import.meta.env.MODE as 'development' | 'production';
};

export const getCurrentEnvironment = getEnvironmentMode;
export const isDevelopment = getEnvironmentMode() === 'development';
export const isProduction = getEnvironmentMode() === 'production';

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
};

export const getCeleryWorkerUrls = () => {
  const workerCount = parseInt(
    import.meta.env.VITE_CELERY_WORKER_COUNT || '1',
    10
  );
  const baseUrl = import.meta.env.VITE_CELERY_BASE_URL;

  const workers = [];

  // Generate worker URLs dynamically
  for (let i = 1; i <= workerCount; i++) {
    const defaultUrl = baseUrl
      ? `${baseUrl.replace('{worker}', i.toString())}`
      : `http://localhost:${8000 + i}/`;

    workers.push({
      name: `Worker ${i}`,
      url: defaultUrl,
    });
  }

  // Add Beat worker
  workers.push({
    name: 'Beat',
    url: import.meta.env.VITE_CELERY_BEAT_URL || 'http://localhost:8888/',
  });

  // Add Websocket service
  workers.push({
    name: 'Websocket',
    url: import.meta.env.VITE_CELERY_WEBSOCKET_URL || 'http://localhost:8889/',
  });

  return workers;
};

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
