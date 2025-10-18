import ReactGA from 'react-ga4';

const GA4_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID;
const IS_PRODUCTION = import.meta.env.PROD;

/**
 * Initialize Google Analytics 4
 */
export const initGA4 = (): void => {
  if (!GA4_MEASUREMENT_ID) {
    console.warn('GA4 Measurement ID not found in environment variables');
    return;
  }

  try {
    ReactGA.initialize(GA4_MEASUREMENT_ID, {
      testMode: !IS_PRODUCTION,
      gaOptions: {
        debug_mode: !IS_PRODUCTION,
      },
    });
    console.log('Google Analytics 4 initialized');
  } catch (error) {
    console.error('Failed to initialize GA4:', error);
  }
};

/**
 * Track page views
 */
export const trackPageView = (path: string, title?: string): void => {
  if (!GA4_MEASUREMENT_ID) return;

  try {
    ReactGA.send({
      hitType: 'pageview',
      page: path,
      title: title || document.title,
    });
    // Only log in development
    if (!IS_PRODUCTION) {
      console.log('📊 GA4 Page view:', path);
    }
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
};

/**
 * Track custom events
 */
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
): void => {
  if (!GA4_MEASUREMENT_ID) return;

  try {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
    // Only log in development, and make it less verbose
    if (!IS_PRODUCTION) {
      console.log(`📊 GA4 Event: ${category} - ${action}${label ? ` (${label})` : ''}`);
    }
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

/**
 * Track user login
 */
export const trackLogin = (method: string): void => {
  trackEvent('User', 'Login', method);
};

/**
 * Track user registration
 */
export const trackRegistration = (method: string): void => {
  trackEvent('User', 'Registration', method);
};

/**
 * Track user logout
 */
export const trackLogout = (): void => {
  trackEvent('User', 'Logout');
};

/**
 * Track errors
 */
export const trackError = (errorMessage: string, errorType?: string): void => {
  trackEvent('Error', errorType || 'General Error', errorMessage);
};

/**
 * Track watchlist actions
 */
export const trackWatchlistAction = (
  action: 'create' | 'delete' | 'add_asset' | 'remove_asset' | 'update',
  label?: string
): void => {
  trackEvent('Watchlist', action, label);
};

/**
 * Track asset interactions
 */
export const trackAssetInteraction = (
  action: 'view' | 'search' | 'add_to_watchlist',
  assetSymbol?: string
): void => {
  trackEvent('Asset', action, assetSymbol);
};

/**
 * Track graph interactions
 */
export const trackGraphInteraction = (
  action: 'view' | 'change_timeframe' | 'change_indicator',
  label?: string
): void => {
  trackEvent('Graph', action, label);
};

/**
 * Track trading actions
 */
export const trackTradingAction = (
  action: 'place_order' | 'cancel_order' | 'view_positions',
  label?: string
): void => {
  trackEvent('Trading', action, label);
};

/**
 * Track account actions
 */
export const trackAccountAction = (
  action: 'view_account' | 'connect_alpaca' | 'disconnect_alpaca' | 'update_alpaca',
  label?: string
): void => {
  trackEvent('Account', action, label);
};

/**
 * Set user properties
 */
export const setUserProperties = (userId: string, properties?: Record<string, string | number | boolean>): void => {
  if (!GA4_MEASUREMENT_ID) return;

  try {
    ReactGA.set({
      userId,
      ...properties,
    });
  } catch (error) {
    console.error('Failed to set user properties:', error);
  }
};

/**
 * Track timing (performance metrics)
 */
export const trackTiming = (
  category: string,
  variable: string,
  value: number,
  label?: string
): void => {
  if (!GA4_MEASUREMENT_ID) return;

  try {
    ReactGA.event({
      category: 'Timing',
      action: category,
      label: `${variable}${label ? ` - ${label}` : ''}`,
      value: Math.round(value),
    });
    // Only log in development
    if (!IS_PRODUCTION) {
      console.log(`📊 GA4 Timing: ${category} - ${variable} (${Math.round(value)}ms)`);
    }
  } catch (error) {
    console.error('Failed to track timing:', error);
  }
};
