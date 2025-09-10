import { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { useAppDispatch, useAppSelector } from './app/hooks';
import {
  getCurrentToken,
  getLoggedInUser,
  setCredentials,
} from './features/auth/authSlice';

import {
  checkHealth as checkWorkersHealth,
  setServiceStatus,
} from './features/health/healthSlice';
import { useHealthCheckQuery } from '@/api/baseApi';
import LoadingScreen from './shared/components/LoadingScreen';

// Lazy load pages
const GraphsPage = lazy(() => import('./features/graphs'));
const AccountsPage = lazy(() => import('./features/accounts'));
const ContactPage = lazy(() => import('./features/contact'));
const LoginRegPage = lazy(() => import('./features/auth'));
const NotFoundPage = lazy(() => import('./features/notFound'));
const ProfilePage = lazy(() => import('./features/profile'));
const DashBoardPage = lazy(() => import('./features/dashboard'));
const AssetsPage = lazy(() => import('./features/assets'));
const WatchlistsPage = lazy(() => import('./features/watchlists'));

import { checkEnvironment, GOOGLE_CLIENT_ID } from './shared/lib/environment';
import { ThemeProvider } from './shared/components/ThemeProvider';
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useGetLoggedUserQuery } from '@/api/userAuthService';
import { useAlpacaAccount } from './features/auth/hooks';
import AnnouncementBanner from '@/components/AnnouncementBanner';

// Subtle page transition loading component
const PageLoadingFallback = () => (
  <div className="fixed top-0 left-0 z-50 w-full h-1">
    <div className="h-full bg-primary/20 animate-pulse" />
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
    { path: '/', element: <WatchlistsPage />, private: true },
    { path: '/profile', element: <ProfilePage />, private: true },
    { path: '/dashboard', element: <DashBoardPage />, private: true },
    { path: '/instruments', element: <AssetsPage />, private: true },
    { path: '/graphs/:id', element: <GraphsPage />, private: true },
    { path: '/accounts', element: <AccountsPage />, private: true },
    { path: '/contact', element: <ContactPage />, private: true },
    { path: '/login', element: <LoginRegPage />, private: false },
    { path: '*', element: <NotFoundPage />, private: false },
  ];

  return (
    <BrowserRouter>
      <Analytics />
      <AnnouncementBanner/>
      <GoogleOAuthProvider clientId={clientId}>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              {routes.map(({ path, element, private: isPrivate }) => (
                <Route
                  key={path}
                  path={path}
                  element={
                    isPrivate ? <PrivateRoute element={element} /> : element
                  }
                />
              ))}
            </Routes>
          </Suspense>
          <Toaster />
        </ThemeProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  );
}
