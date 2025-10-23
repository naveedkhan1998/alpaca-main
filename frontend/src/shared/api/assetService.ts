import {
  PaginatedApiResponse,
  Asset,
  GetAssetsParams,
  SearchAssetsParams,
  Candle,
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
        if (params.search) {
          searchParams.append('search', params.search);
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
          url: `core/assets/${id}/candles/?${searchParams.toString()}`,
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
    syncAssets: builder.mutation<
      { msg: string; data: string },
      void
    >({
      query: () => ({
        url: 'core/alpaca/sync_assets/',
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: ['Asset', 'SyncStatus'],
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
  useGetSyncStatusQuery,
  useSyncAssetsMutation,
} = assetApi;
export { assetApi };
