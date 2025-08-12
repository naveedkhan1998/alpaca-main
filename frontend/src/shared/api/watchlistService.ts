import {
  PaginatedApiResponse,
  ApiResponse,
  WatchList,
  WatchListAsset,
  GetWatchListsParams,
  CreateWatchListParams,
  AddAssetToWatchListParams,
  RemoveAssetFromWatchListParams,
} from '@/types/common-types';
import { baseApi } from './baseApi';

const watchlistApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getWatchLists: builder.query<
      PaginatedApiResponse<WatchList>,
      GetWatchListsParams
    >({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();

        // Add pagination params
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset)
          searchParams.append('offset', params.offset.toString());

        return {
          url: `core/watchlists/?${searchParams.toString()}`,
          method: 'GET',
          headers: {
            'Content-type': 'application/json',
          },
        };
      },
      providesTags: ['Watchlist'],
    }),

    getWatchListById: builder.query<WatchList, number>({
      query: id => ({
        url: `core/watchlists/${id}/`,
        method: 'GET',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      providesTags: (_result, _error, id) => [{ type: 'Watchlist', id }],
    }),

    createWatchList: builder.mutation<
      ApiResponse<WatchList>,
      CreateWatchListParams
    >({
      query: data => ({
        url: 'core/watchlists/',
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: data,
      }),
      invalidatesTags: ['Watchlist'],
    }),

    updateWatchList: builder.mutation<
      ApiResponse<WatchList>,
      { id: number; data: Partial<CreateWatchListParams> }
    >({
      query: ({ id, data }) => ({
        url: `core/watchlists/${id}/`,
        method: 'PATCH',
        headers: {
          'Content-type': 'application/json',
        },
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Watchlist', id },
        'Watchlist',
      ],
    }),

    deleteWatchList: builder.mutation<void, number>({
      query: id => ({
        url: `core/watchlists/${id}/`,
        method: 'DELETE',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Watchlist', id },
        'Watchlist',
      ],
    }),

    addAssetToWatchList: builder.mutation<
      ApiResponse<WatchListAsset>,
      AddAssetToWatchListParams
    >({
      query: ({ watchlist_id, asset_id }) => ({
        url: `core/watchlists/${watchlist_id}/add_asset/`,
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: { asset_id },
      }),
      invalidatesTags: (_result, _error, { watchlist_id }) => [
        { type: 'Watchlist', id: watchlist_id },
        'Watchlist',
        'Asset',
      ],
    }),

    removeAssetFromWatchList: builder.mutation<
      ApiResponse<string>,
      RemoveAssetFromWatchListParams
    >({
      query: ({ watchlist_id, asset_id }) => ({
        url: `core/watchlists/${watchlist_id}/remove_asset/${asset_id}/`,
        method: 'DELETE',
        headers: {
          'Content-type': 'application/json',
        },
      }),
      invalidatesTags: (_result, _error, { watchlist_id }) => [
        { type: 'Watchlist', id: watchlist_id },
        'Watchlist',
        'Asset',
      ],
    }),
  }),
});

export const {
  useGetWatchListsQuery,
  useGetWatchListByIdQuery,
  useCreateWatchListMutation,
  useUpdateWatchListMutation,
  useDeleteWatchListMutation,
  useAddAssetToWatchListMutation,
  useRemoveAssetFromWatchListMutation,
} = watchlistApi;
export { watchlistApi };
