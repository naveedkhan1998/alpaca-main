import {
  ApiResponse,
  AlpacaAccount,
  CreateAlpacaAccount,
  UpdateAlpacaParams,
  AlpacaStatusResponse,
} from '@/types/common-types';
import { baseApi } from './baseApi';

export const alpacaApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getAlpaca: builder.query<ApiResponse<AlpacaAccount[]>, void>({
      query: () => {
        return {
          url: 'core/alpaca/',
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Alpaca'],
    }),
    checkAlpacaStatus: builder.query<AlpacaStatusResponse, void>({
      query: () => {
        return {
          url: 'core/alpaca/alpaca_status',
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Alpaca'],
    }),
    createAlpaca: builder.mutation<AlpacaAccount, CreateAlpacaAccount>({
      query: data => ({
        url: 'core/alpaca/',
        method: 'POST',
        body: data,
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: ['Alpaca'],
    }),
    updateAlpaca: builder.mutation<AlpacaAccount, UpdateAlpacaParams>({
      query: ({ data }) => ({
        url: `core/alpaca/${data.id}/`,
        method: 'PUT',
        body: data,
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: ['Alpaca'],
    }),
    startWebsocket: builder.mutation<void, void>({
      query: () => ({
        url: `core/alpaca/websocket_start/`,
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: ['Alpaca'],
    }),
  }),
});

export const {
  useGetAlpacaQuery,
  useCheckAlpacaStatusQuery,
  useUpdateAlpacaMutation,
  useCreateAlpacaMutation,
  useStartWebsocketMutation,
} = alpacaApi;
