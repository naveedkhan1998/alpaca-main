import {
  PaginatedApiResponse,
  Asset,
  GetAssetsParams,
  SearchAssetsParams,
  Candle,
  CompactCandlesResponse,
  GetCandlesV3Params,
  OptionChainResponse,
  OptionBarsResponse,
  GetOptionChainParams,
  GetOptionBarsParams,
} from '@/types/common-types';
import { baseApi } from './baseApi';

export interface EnhancedGetAssetsParams extends GetAssetsParams {
  // Pagination
  limit?: number;
  offset?: number;

  // Sorting
  ordering?: string;

  // Search and filtering
  search?: string;
  q?: string;
  asset_class?: string;
  exchange?: string;
  tradable?: boolean;
  marginable?: boolean;
  shortable?: boolean;
  fractionable?: boolean;
  status?: string;
}

const assetApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getAssets: builder.query<
      PaginatedApiResponse<Asset>,
      EnhancedGetAssetsParams
    >({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();

        // Pagination
        if (params.limit !== undefined) {
          searchParams.append('limit', params.limit.toString());
        }
        if (params.offset !== undefined) {
          searchParams.append('offset', params.offset.toString());
        }

        // Sorting
        if (params.ordering) {
          searchParams.append('ordering', params.ordering);
        }

        // Search
        if (params.q) {
          searchParams.append('q', params.q);
        }

        // Filtering
        if (params.asset_class) {
          searchParams.append('asset_class', params.asset_class);
        }
        if (params.exchange) {
          searchParams.append('exchange', params.exchange);
        }
        if (params.tradable !== undefined) {
          searchParams.append('tradable', params.tradable.toString());
        }
        if (params.marginable !== undefined) {
          searchParams.append('marginable', params.marginable.toString());
        }
        if (params.shortable !== undefined) {
          searchParams.append('shortable', params.shortable.toString());
        }
        if (params.fractionable !== undefined) {
          searchParams.append('fractionable', params.fractionable.toString());
        }
        if (params.status) {
          searchParams.append('status', params.status);
        }

        return {
          url: `core/assets/?${searchParams.toString()}`,
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Asset'],
    }),

    searchAssets: builder.query<
      PaginatedApiResponse<Asset>,
      SearchAssetsParams
    >({
      query: ({ q, limit, offset }) => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', q);

        if (limit) searchParams.append('limit', limit.toString());
        if (offset) searchParams.append('offset', offset.toString());

        return {
          url: `core/assets/search/?${searchParams.toString()}`,
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Asset'],
    }),

    // Optimized search with debouncing support
    searchAssetsOptimized: builder.query<
      PaginatedApiResponse<Asset>,
      SearchAssetsParams & { debounced?: boolean }
    >({
      query: ({ q, limit = 50, offset = 0 }) => {
        const searchParams = new URLSearchParams();
        searchParams.append('q', q);
        searchParams.append('limit', limit.toString());
        searchParams.append('offset', offset.toString());

        return {
          url: `core/assets/search/?${searchParams.toString()}`,
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Asset'],
      // Add cache timeout for search results
      keepUnusedDataFor: 60, // 1 minute
    }),

    // Get asset stats for filter options
    getAssetStats: builder.query<
      {
        asset_classes: Array<{ value: string; label: string; count: number }>;
        exchanges: Array<{ value: string; label: string; count: number }>;
        total_count: number;
      },
      void
    >({
      query: () => ({
        url: 'core/assets/stats/',
        method: 'GET',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      providesTags: ['Asset'],
      // Cache stats for 5 minutes
      keepUnusedDataFor: 300,
    }),

    getAssetById: builder.query<Asset, number>({
      query: id => ({
        url: `core/assets/${id}/`,
        method: 'GET',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      providesTags: (_result, _error, id) => [{ type: 'Asset', id }],
    }),

    getAssetCandles: builder.query<
      PaginatedApiResponse<Candle>,
      { id: number; tf?: number; limit?: number; offset?: number }
    >({
      query: ({ id, tf = 1, limit, offset }) => {
        const searchParams = new URLSearchParams();
        searchParams.append('tf', tf.toString());

        if (limit) searchParams.append('limit', limit.toString());
        if (offset) searchParams.append('offset', offset.toString());

        return {
          url: `core/assets/${id}/candles_v2/?${searchParams.toString()}`,
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: (_result, _error, { id }) => [
        { type: 'Asset', id: id },
        'Candle',
      ],
    }),

    /**
     * V3 Candle endpoint with cursor-based pagination and compact format.
     *
     * Uses compact array format by default (~60% smaller payload):
     * - Backend returns: { columns: [...], results: [[...], [...]] }
     * - GZip compressed via middleware
     *
     * Optimized for high-performance reads with no COUNT(*) overhead.
     */
    getAssetCandlesV3: builder.query<
      CompactCandlesResponse,
      GetCandlesV3Params
    >({
      query: ({ id, timeframe = 1, limit = 1000, cursor }) => {
        const searchParams = new URLSearchParams();
        searchParams.append('timeframe', timeframe.toString());
        searchParams.append('limit', limit.toString());
        // format=compact is default, no need to specify
        if (cursor) searchParams.append('cursor', cursor);

        return {
          url: `core/assets/${id}/candles_v3/?${searchParams.toString()}`,
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
            'Accept-Encoding': 'gzip, deflate, br',
          },
        };
      },
      providesTags: (_result, _error, { id }) => [
        { type: 'Asset', id: id },
        'Candle',
      ],
    }),

    // Get sync status
    getSyncStatus: builder.query<
      {
        last_sync_at: string | null;
        total_assets: number;
        needs_sync: boolean;
        is_syncing: boolean;
      },
      void
    >({
      query: () => ({
        url: 'core/alpaca/sync_status/',
        method: 'GET',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      transformResponse: (response: {
        msg: string;
        data: {
          last_sync_at: string | null;
          total_assets: number;
          needs_sync: boolean;
          is_syncing: boolean;
        };
      }) => response.data,
      providesTags: ['SyncStatus'],
    }),

    // Sync assets
    syncAssets: builder.mutation<{ msg: string; data: string }, void>({
      query: () => ({
        url: 'core/alpaca/sync_assets/',
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: ['Asset', 'SyncStatus'],
    }),

    /**
     * Fetch the options chain snapshots (quotes + greeks) for an underlying equity asset.
     */
    getOptionChain: builder.query<
      { msg: string; data: OptionChainResponse },
      GetOptionChainParams
    >({
      query: ({ id, expiration_date_gte, expiration_date_lte, type, limit = 200, page_token }) => {
        const params = new URLSearchParams();
        if (expiration_date_gte) params.append('expiration_date_gte', expiration_date_gte);
        if (expiration_date_lte) params.append('expiration_date_lte', expiration_date_lte);
        if (type) params.append('type', type);
        params.append('limit', limit.toString());
        if (page_token) params.append('page_token', page_token);
        return {
          url: `core/assets/${id}/option_chain/?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (_result, _error, { id }) => [{ type: 'Asset', id }],
      keepUnusedDataFor: 60,
    }),

    /**
     * Fetch historical OHLCV bars for a specific option contract symbol.
     */
    getOptionBars: builder.query<
      { msg: string; data: OptionBarsResponse },
      GetOptionBarsParams
    >({
      query: ({ symbol, timeframe = '1Day', start, end, limit = 1000 }) => {
        const params = new URLSearchParams({ symbol, timeframe, limit: limit.toString() });
        if (start) params.append('start', start);
        if (end) params.append('end', end);
        return {
          url: `core/assets/option_bars/?${params.toString()}`,
          method: 'GET',
        };
      },
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetAssetsQuery,
  useSearchAssetsQuery,
  useSearchAssetsOptimizedQuery,
  useGetAssetStatsQuery,
  useGetAssetByIdQuery,
  useGetAssetCandlesQuery,
  useLazyGetAssetCandlesQuery,
  useGetAssetCandlesV3Query,
  useLazyGetAssetCandlesV3Query,
  useGetSyncStatusQuery,
  useSyncAssetsMutation,
  useGetOptionChainQuery,
  useLazyGetOptionChainQuery,
  useGetOptionBarsQuery,
  useLazyGetOptionBarsQuery,
} = assetApi;
export { assetApi };
