export function getSiteUrl(): string {
  // Prefer explicit env, fallback to window origin, then hard-coded default
  const envUrl = import.meta.env?.VITE_SITE_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://alpaca.mnaveedk.com';
}

export function buildCanonical(pathname: string, search: string = ''): string {
  const base = getSiteUrl();
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}${search || ''}`;
}
