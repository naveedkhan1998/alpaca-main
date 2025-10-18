import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';

/**
 * Custom hook to track page views on route changes
 */
export const usePageTracking = (): void => {
  const location = useLocation();

  useEffect(() => {
    // Track page view whenever the location changes
    const path = location.pathname + location.search;
    trackPageView(path);
  }, [location]);
};
