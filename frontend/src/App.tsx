import { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { HelmetProvider } from '@dr.pogodin/react-helmet';
import { useAppDispatch, useAppSelector } from './app/hooks';
import {
  getCurrentToken,
  getIsGuest,
  getLoggedInUser,
  setCredentials,
  setGuestMode,
} from './features/auth/authSlice';

import {
  checkHealth as checkWorkersHealth,
  setServiceStatus,
} from './features/health/healthSlice';
import { useHealthCheckQuery } from '@/api/baseApi';
import LoadingScreen from './shared/components/LoadingScreen';
import { initGA4 } from '@/lib/analytics';
import { usePageTracking } from '@/hooks/usePageTracking';

// Lazy load pages
const GraphsPage = lazy(() => import('./features/graphs'));
const AccountsPage = lazy(() => import('./features/accounts'));
const ContactPage = lazy(() => import('./features/contact'));
const LoginRegPage = lazy(() => import('./features/auth'));
const NotFoundPage = lazy(() => import('./features/notFound'));
const ProfilePage = lazy(() => import('./features/profile'));
const AssetsPage = lazy(() => import('./features/assets'));
const AssetDetailPage = lazy(() => import('./features/assets/AssetDetailPage'));
const WatchlistsPage = lazy(() => import('./features/watchlists'));
const PrivacyPage = lazy(() => import('./features/privacy'));
const TermsPage = lazy(() => import('./features/terms'));

import { checkEnvironment, GOOGLE_CLIENT_ID } from './shared/lib/environment';
import { ThemeProvider } from './shared/components/ThemeProvider';
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useGetLoggedUserQuery } from '@/api/userAuthService';
import { useAlpacaAccount } from './features/auth/hooks';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { DefaultSEO } from '@/components/DefaultSEO';
import { RouteSEO } from '@/components/RouteSEO';
import { setGuestMode as persistGuestMode } from '@/lib/guestMode';

// Subtle page transition loading component
const PageLoadingFallback = () => (
  <div className="fixed top-0 left-0 z-50 w-full h-1.5">
    <div className="h-full bg-gradient-to-r from-primary via-accent to-primary animate-shimmer bg-[length:200%_100%]" />
  </div>
);

const HEALTH_CHECK_INTERVAL = 120000; // 2 minutes
const clientId = GOOGLE_CLIENT_ID || '';
// PrivateRoute Component
const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({
  element,
}) => {
  const accessToken = useAppSelector(getCurrentToken);
  return accessToken ? element : <Navigate to="/login" />;
};

const GuestRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const accessToken = useAppSelector(getCurrentToken);
  const isGuest = useAppSelector(getIsGuest);
  const dispatch = useAppDispatch();
  const shouldEnableGuest = !accessToken && !isGuest;

  useEffect(() => {
    if (shouldEnableGuest) {
      persistGuestMode(true);
      dispatch(setGuestMode(true));
    }
  }, [dispatch, shouldEnableGuest]);

  return accessToken || isGuest || shouldEnableGuest ? (
    element
  ) : (
    <Navigate to="/login" />
  );
};

export default function App() {
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);
  const [hasInitialApiHealthCheck, setHasInitialApiHealthCheck] =
    useState(false);
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(getCurrentToken);
  const loggedInUser = useAppSelector(getLoggedInUser);
  const { refetch: getLoggedUser } = useGetLoggedUserQuery(undefined, {
    skip: !accessToken,
  });

  // Initialize Alpaca account when user is logged in
  const { isAlpacaAccountLoading } = useAlpacaAccount();

  const {
    data: healthCheckData,
    isLoading: isHealthCheckLoading,
    error: healthCheckError,
    isSuccess: isHealthCheckSuccess,
  } = useHealthCheckQuery(undefined, {
    // Start polling only after initial health check succeeds
    pollingInterval: hasInitialApiHealthCheck ? HEALTH_CHECK_INTERVAL : 0,
    skip: false,
  });

  // Initialize Google Analytics
  useEffect(() => {
    initGA4();
  }, []);

  // on mount check if we have user in redux store else fetch it
  useEffect(() => {
    if (!loggedInUser && accessToken) {
      const fetchUser = async () => {
        const result = await getLoggedUser();
        if (result.data) {
          dispatch(setCredentials({ user: result.data, access: accessToken }));
        }
      };
      fetchUser();
    }
  }, [accessToken, getLoggedUser, loggedInUser, dispatch]);

  useEffect(() => {
    checkEnvironment();

    // Only mark loading as complete when initial API health check is done and breeze account (if user is logged in) is done
    if (
      hasInitialApiHealthCheck &&
      !isLoadingComplete &&
      (!accessToken || !isAlpacaAccountLoading)
    ) {
      setIsLoadingComplete(true);
    }
  }, [
    hasInitialApiHealthCheck,
    isLoadingComplete,
    accessToken,
    isAlpacaAccountLoading,
  ]);

  // Start worker health checks only after initial API health check succeeds
  useEffect(() => {
    if (hasInitialApiHealthCheck) {
      dispatch(checkWorkersHealth());
      const intervalId = setInterval(
        () => dispatch(checkWorkersHealth()),
        HEALTH_CHECK_INTERVAL
      );
      return () => clearInterval(intervalId);
    }
  }, [dispatch, hasInitialApiHealthCheck]);

  useEffect(() => {
    if (isHealthCheckLoading) {
      dispatch(
        setServiceStatus({
          name: 'API',
          status: 'pending',
        })
      );
    } else if (healthCheckError) {
      dispatch(
        setServiceStatus({
          name: 'API',
          status: 'error',
        })
      );
      // Set this to true even on error so we don't stay in loading forever
      if (!hasInitialApiHealthCheck) {
        setHasInitialApiHealthCheck(true);
      }
    } else if (healthCheckData && isHealthCheckSuccess) {
      dispatch(
        setServiceStatus({
          name: 'API',
          status: 'ok',
        })
      );
      if (!hasInitialApiHealthCheck) {
        setHasInitialApiHealthCheck(true);
      }
    }
  }, [
    healthCheckData,
    isHealthCheckLoading,
    healthCheckError,
    isHealthCheckSuccess,
    dispatch,
    hasInitialApiHealthCheck,
  ]);

  if (!hasInitialApiHealthCheck) {
    return <LoadingScreen />;
  }

  const routes = [
    { path: '/', element: <WatchlistsPage />, access: 'guest' },
    { path: '/profile', element: <ProfilePage />, access: 'auth' },
    { path: '/instruments', element: <AssetsPage />, access: 'guest' },
    { path: '/instruments/:id', element: <AssetDetailPage />, access: 'guest' },
    { path: '/graphs/:id', element: <GraphsPage />, access: 'guest' },
    { path: '/accounts', element: <AccountsPage />, access: 'auth' },
    { path: '/contact', element: <ContactPage />, access: 'public' },
    { path: '/privacy', element: <PrivacyPage />, access: 'public' },
    { path: '/terms', element: <TermsPage />, access: 'public' },
    { path: '/login', element: <LoginRegPage />, access: 'public' },
    { path: '*', element: <NotFoundPage />, access: 'public' },
  ];

  return (
    <HelmetProvider>
      <BrowserRouter basename="/app">
        <DefaultSEO />
        <RouteSEO />
        <PageTracker />
        <GoogleOAuthProvider clientId={clientId}>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <AnnouncementBanner />
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {routes.map(({ path, element, access }) => {
                  const routeElement =
                    access === 'auth' ? (
                      <PrivateRoute element={element} />
                    ) : access === 'guest' ? (
                      <GuestRoute element={element} />
                    ) : (
                      element
                    );

                  return (
                    <Route key={path} path={path} element={routeElement} />
                  );
                })}
              </Routes>
            </Suspense>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3000,
                classNames: {
                  toast: 'glass-card text-foreground border-border shadow-lg',
                  description: 'text-muted-foreground',
                  actionButton: 'bg-primary text-primary-foreground',
                  cancelButton: 'bg-muted text-muted-foreground',
                },
              }}
            />
          </ThemeProvider>
        </GoogleOAuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

// Component to track page views
const PageTracker = () => {
  usePageTracking();
  return null;
};
