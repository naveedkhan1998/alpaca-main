import '../index.css';
import { getApiBaseUrl } from '../shared/lib/environment';
import { initGA4, trackPageView, trackEvent } from '../shared/lib/analytics';

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
  // Initialize GA4 for landing page
  initGA4();
  
  // Track landing page view
  trackPageView('/', 'Landing Page');
  
  const landingRoot = document.getElementById('landing-root');
  if (landingRoot) {
    landingRoot.removeAttribute('hidden');
  }

  const appRoot = document.getElementById('app-root');
  if (appRoot) {
    appRoot.setAttribute('hidden', 'true');
  }

  // Track landing page interaction events
  setupLandingPageTracking();

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

/**
 * Setup event tracking for landing page interactions
 */
function setupLandingPageTracking() {
  // Track CTA clicks
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Track links to app
    if (target.closest('a[href*="/app"]') || target.closest('a[href*="/login"]')) {
      const link = target.closest('a') as HTMLAnchorElement;
      trackEvent('Landing Page', 'Click', `CTA: ${link.href}`);
    }
    
    // Track any button clicks with tracking data
    const button = target.closest('button[data-track]');
    if (button) {
      const trackLabel = button.getAttribute('data-track');
      trackEvent('Landing Page', 'Click', trackLabel || 'Button');
    }
    
    // Track navigation links
    const navLink = target.closest('nav a');
    if (navLink) {
      const href = (navLink as HTMLAnchorElement).href;
      trackEvent('Landing Page', 'Navigation', href);
    }
  });

  // Track scroll depth
  let maxScroll = 0;
  const trackScrollDepth = () => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );
    
    if (scrollPercent > maxScroll && scrollPercent % 25 === 0) {
      maxScroll = scrollPercent;
      trackEvent('Landing Page', 'Scroll', `${scrollPercent}%`);
    }
  };

  let scrollTimeout: number;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = window.setTimeout(trackScrollDepth, 150);
  }, { passive: true });
}
