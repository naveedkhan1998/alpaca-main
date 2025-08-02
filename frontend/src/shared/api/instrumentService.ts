import { baseApi } from './baseApi';
import {
  Candle,
  GetCandlesParams,
  GetInstrumentsParams,
  GetPaginatedCandlesParams,
  Instrument,
  PaginatedCandles,
  SubscribedInstrument,
  ApiResponse,
  SubscribeInstrumentParams,
  LoadInstrumentCandlesParams,
  DeleteInstrumentParams,
} from '../types/common-types';

export const instrumentApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getSubscribedInstruments: builder.query<
      ApiResponse<SubscribedInstrument[]>,
      void
    >({
      query: () => {
        return {
          url: 'core/subscribed_instruments/',
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Instrument'],
    }),
    getCandles: builder.query<Candle[], GetCandlesParams>({
      query: ({ id, tf }) => {
        return {
          url: `core/candles/get_candles/?id=${id}&tf=${tf}`,
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Instrument'],
    }),
    getPaginatedCandles: builder.query<
      PaginatedCandles,
      GetPaginatedCandlesParams
    >({
      query: ({ id, tf, limit, offset }) => {
        const params = new URLSearchParams();
        params.append('tf', String(tf));
        if (limit !== undefined && limit !== null)
          params.append('limit', String(limit));
        if (offset !== undefined && offset !== null)
          params.append('offset', String(offset));

        return {
          url: `core/subscribed_instruments/${id}/candles/?${params.toString()}`,
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Instrument'],
    }),
    subscribeInstrument: builder.mutation<
      SubscribedInstrument,
      SubscribeInstrumentParams
    >({
      query: ({ id, duration }) => ({
        url: `core/subscribed_instruments/${id}/subscribe/`,
        method: 'POST',
        body: {
          duration: duration,
        },
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: ['Instrument'],
    }),
    loadInstrumentCandles: builder.mutation<void, LoadInstrumentCandlesParams>({
      query: ({ id }) => ({
        url: `core/candles/${id}`,
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: ['Instrument'],
    }),
    deleteInstrument: builder.mutation<void, DeleteInstrumentParams>({
      query: ({ id }) => ({
        url: `core/subscribed_instruments/${id}/`,
        method: 'DELETE',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: ['Instrument'],
    }),
    getInstruments: builder.query<
      ApiResponse<Instrument[]>,
      GetInstrumentsParams
    >({
      query: ({
        exchange,
        search,
        optionType,
        strikePrice,
        expiryAfter,
        expiryBefore,
      }) => {
        const params = new URLSearchParams();
        if (exchange) params.append('exchange', exchange);
        if (search) params.append('search', search);
        if (optionType) params.append('option_type', optionType);
        if (strikePrice) params.append('strike_price', String(strikePrice));
        if (expiryAfter) params.append('expiry_after', expiryAfter);
        if (expiryBefore) params.append('expiry_before', expiryBefore);

        return {
          url: `core/instruments/?${params.toString()}`,
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Instrument'],
    }),
  }),
});

export const {
  useGetSubscribedInstrumentsQuery,
  useGetCandlesQuery,
  useLazyGetCandlesQuery,
  useGetInstrumentsQuery,
  useSubscribeInstrumentMutation,
  useLoadInstrumentCandlesMutation,
  useDeleteInstrumentMutation,
  useGetPaginatedCandlesQuery,
  useLazyGetPaginatedCandlesQuery,
} = instrumentApi;
