import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from '@/api/baseApi';
import authSlice from '../features/auth/authSlice';
import graphSlice from '../features/graphs/graphSlice';
import healthSlice from '../features/health/healthSlice';
import watchlistSlice from '../features/watchlists/watchlistSlice';
import assetSlice from '../features/assets/assetSlice';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authSlice,
    graph: graphSlice,
    health: healthSlice,
    watchlist: watchlistSlice,
    asset: assetSlice,
  },

  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

setupListeners(store.dispatch);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
