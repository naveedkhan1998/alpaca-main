import {
  BreezeAccount,
  CreateBreezeAccount,
  ApiResponse,
  BreezeStatusResponse,
  UpdateBreezeParams,
} from '@/types/common-types';
import { baseApi } from './baseApi';

export const breezeApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getBreeze: builder.query<ApiResponse<BreezeAccount[]>, void>({
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
    checkBreezeStatus: builder.query<BreezeStatusResponse, void>({
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
    createBreeze: builder.mutation<BreezeAccount, CreateBreezeAccount>({
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
    updateBreeze: builder.mutation<BreezeAccount, UpdateBreezeParams>({
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
        url: `core/breeze/websocket_start/`,
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
  useGetBreezeQuery,
  useCheckBreezeStatusQuery,
  useUpdateBreezeMutation,
  useCreateBreezeMutation,
  useStartWebsocketMutation,
} = breezeApi;
