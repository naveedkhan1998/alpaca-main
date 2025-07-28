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
          url: 'core/breeze/',
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Breeze'],
    }),
    checkBreezeStatus: builder.query<BreezeStatusResponse, void>({
      query: () => {
        return {
          url: 'core/breeze/breeze_status',
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Breeze'],
    }),
    createBreeze: builder.mutation<BreezeAccount, CreateBreezeAccount>({
      query: data => ({
        url: 'core/breeze/',
        method: 'POST',
        body: data,
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: ['Breeze'],
    }),
    updateBreeze: builder.mutation<BreezeAccount, UpdateBreezeParams>({
      query: ({ data }) => ({
        url: `core/breeze/${data.id}/`,
        method: 'PUT',
        body: data,
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: ['Breeze'],
    }),
    startWebsocket: builder.mutation<void, void>({
      query: () => ({
        url: `core/breeze/websocket_start/`,
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: ['Breeze'],
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
