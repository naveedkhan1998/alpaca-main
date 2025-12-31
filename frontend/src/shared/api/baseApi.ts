import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { getToken, removeToken } from './auth';
import { getApiBaseUrl } from '../lib/environment';
import { toast } from 'sonner';
import type { RootState } from 'src/app/store';
import { getIsGuest, logOut, setGuestMode } from 'src/features/auth/authSlice';
import { promptLogin } from '@/lib/loginPrompt';
import { clearGuestMode } from '@/lib/guestMode';

const baseUrl = getApiBaseUrl();

const baseQuery = fetchBaseQuery({
  baseUrl,
  // credentials: "include",
  prepareHeaders: headers => {
    const token = getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// List of public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/account/login/',
  '/account/register/',
  '/account/social/google/',
  '/core/', // health check
];

const getRequestMeta = (args: string | FetchArgs) => {
  if (typeof args === 'string') {
    return { url: args, method: 'GET' };
  }

  return {
    url: args.url,
    method: (args.method || 'GET').toUpperCase(),
  };
};

let lastRateLimitNotice = 0;

// Custom base query with 401 handling
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const { url, method } = getRequestMeta(args);
  const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint =>
    url.includes(endpoint)
  );
  const isGuest = getIsGuest(api.getState() as RootState);

  if (isGuest && method !== 'GET' && !isPublicEndpoint) {
    promptLogin('Log in to perform this action.', () =>
      api.dispatch(setGuestMode(false))
    );
    return {
      error: {
        status: 401,
        data: { detail: 'Authentication required.' },
      },
    };
  }

  const result = await baseQuery(args, api, extraOptions);

  // If we get a 401 (Unauthorized), clear tokens and redirect to login
  if (result.error && result.error.status === 401) {
    if (isGuest && !isPublicEndpoint) {
      promptLogin('Log in to access this feature.', () =>
        api.dispatch(setGuestMode(false))
      );
      return result;
    }

    // Only clear tokens and redirect if:
    // 1. Not on login page already
    // 2. Not a public endpoint
    const isLoginPage = ['/login', '/app/login'].includes(
      window.location.pathname
    );

    if (!isLoginPage && !isPublicEndpoint) {
      // Clear tokens from storage
      removeToken();

      // Dispatch logout action to clear Redux state
      api.dispatch(logOut());

      // Redirect to login page
      window.location.href = '/login';
    }
  }

  if (
    result.error &&
    typeof result.error.status === 'number' &&
    isGuest &&
    !isPublicEndpoint
  ) {
    if (result.error.status === 403) {
      promptLogin('Log in to perform this action.', () =>
        api.dispatch(setGuestMode(false))
      );
    }

    if (result.error.status === 429) {
      const now = Date.now();
      if (now - lastRateLimitNotice > 10000) {
        lastRateLimitNotice = now;
        toast('Rate limit reached', {
          description: 'Guest access is limited. Log in for higher limits.',
          action: {
            label: 'Log in',
            onClick: () => {
              clearGuestMode();
              api.dispatch(setGuestMode(false));
              window.location.href = '/login';
            },
          },
        });
      }
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Alpaca',
    'Asset',
    'Watchlist',
    'User',
    'Tick',
    'Candle',
    'PaperTrade',
    'Instrument',
    'SyncStatus',
  ],
  endpoints: builder => ({
    healthCheck: builder.query<void, void>({
      query: () => ({
        url: '/core/',
        method: 'GET',
        headers: {
          'Content-type': 'application/json',
        },
      }),
    }),
  }),
});

export const { useHealthCheckQuery } = baseApi;
