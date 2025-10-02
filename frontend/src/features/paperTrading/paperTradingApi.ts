import { baseApi } from '@/api/baseApi';
import type {
  CancelPaperTradePayload,
  ClosePaperTradePayload,
  CreatePaperTradePayload,
  PaperTrade,
  PaperTradeStatus,
} from './types';

interface GetPaperTradesArgs {
  assetId?: number | string;
  status?: PaperTradeStatus;
  currentPrice?: number;
}

export const paperTradingApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getPaperTrades: builder.query<PaperTrade[], GetPaperTradesArgs | void>({
      query: args => {
        const params: Record<string, string | number> = {};
        if (args?.assetId) {
          params.asset = args.assetId as number;
        }
        if (args?.status) {
          params.status = args.status;
        }
        if (args?.currentPrice !== undefined) {
          params.current_price = args.currentPrice;
        }
        return {
          url: '/paper-trading/trades/',
          method: 'GET',
          params,
        };
      },
      providesTags: result =>
        result
          ? [
              ...result.map(trade => ({
                type: 'PaperTrade' as const,
                id: trade.id,
              })),
              { type: 'PaperTrade' as const, id: 'LIST' },
            ]
          : [{ type: 'PaperTrade' as const, id: 'LIST' }],
    }),
    createPaperTrade: builder.mutation<PaperTrade, CreatePaperTradePayload>({
      query: body => ({
        url: '/paper-trading/trades/',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'PaperTrade', id: 'LIST' }],
    }),
    closePaperTrade: builder.mutation<PaperTrade, ClosePaperTradePayload>({
      query: ({ id, ...body }) => ({
        url: `/paper-trading/trades/${id}/close/`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_results, _error, arg) => [
        { type: 'PaperTrade', id: arg.id },
        { type: 'PaperTrade', id: 'LIST' },
      ],
    }),
    cancelPaperTrade: builder.mutation<PaperTrade, CancelPaperTradePayload>({
      query: ({ id, ...body }) => ({
        url: `/paper-trading/trades/${id}/cancel/`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_results, _error, arg) => [
        { type: 'PaperTrade', id: arg.id },
        { type: 'PaperTrade', id: 'LIST' },
      ],
    }),
    deletePaperTrade: builder.mutation<void, number>({
      query: id => ({
        url: `/paper-trading/trades/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: (_results, _error, id) => [
        { type: 'PaperTrade', id },
        { type: 'PaperTrade', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPaperTradesQuery,
  useCreatePaperTradeMutation,
  useClosePaperTradeMutation,
  useCancelPaperTradeMutation,
  useDeletePaperTradeMutation,
} = paperTradingApi;
