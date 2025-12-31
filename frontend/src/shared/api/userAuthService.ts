import { baseApi } from './baseApi';
import {
  AuthResponse,
  User,
  Credentials,
  UserRegistration,
  GoogleLoginParams,
  EmailVerificationResponse,
} from '../types/common-types';

export const userAuthApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    loginUser: builder.mutation<AuthResponse, Credentials>({
      query: credentials => ({
        url: '/account/login/',
        method: 'POST',
        body: { ...credentials },
        credentials: 'omit',
      }),
      invalidatesTags: ['User'],
    }),
    registerUser: builder.mutation<AuthResponse, UserRegistration>({
      query: user => {
        return {
          url: '/account/register/',
          method: 'POST',
          body: user,
          headers: {
            'Content-type': 'application/json',
          },
          credentials: 'omit',
        };
      },
      invalidatesTags: ['User'],
    }),
    getLoggedUser: builder.query<User, void>({
      query: () => {
        return {
          url: '/account/profile',
          method: 'GET',
        };
      },
      providesTags: ['User'],
    }),
    googleLogin: builder.mutation<AuthResponse, GoogleLoginParams>({
      query: token => {
        return {
          url: '/account/social/google/',
          method: 'POST',
          body: token,
        };
      },
      invalidatesTags: ['User'],
    }),
    sendEmail: builder.query<EmailVerificationResponse, void>({
      query: () => {
        return {
          url: '/account/invoke_verify_email',
          method: 'GET',
        };
      },
      providesTags: ['User'],
    }),
  }),
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useGetLoggedUserQuery,
  useLazyGetLoggedUserQuery,
  useGoogleLoginMutation,
  useLazySendEmailQuery,
} = userAuthApi;
