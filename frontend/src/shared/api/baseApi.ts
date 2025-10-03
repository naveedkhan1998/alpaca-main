import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { getToken, removeToken } from './auth';
import { getApiBaseUrl } from '../lib/environment';
import { logOut } from 'src/features/auth/authSlice';

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

// Custom base query with 401 handling
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  // If we get a 401 (Unauthorized), clear tokens and redirect to login
  if (result.error && result.error.status === 401) {
    // Get the endpoint URL
    const url = typeof args === 'string' ? args : args.url;

    // Check if this is a public endpoint
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint =>
      url.includes(endpoint)
    );

    // Only clear tokens and redirect if:
    // 1. Not on login page already
    // 2. Not a public endpoint
    const isLoginPage = window.location.pathname === '/login';

    if (!isLoginPage && !isPublicEndpoint) {
      // Clear tokens from storage
      removeToken();

      // Dispatch logout action to clear Redux state
      api.dispatch(logOut());

      // Redirect to login page
      window.location.href = '/login';
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
