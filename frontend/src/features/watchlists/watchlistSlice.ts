import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WatchList } from '@/types/common-types';

interface WatchlistState {
  selectedWatchlist: WatchList | null;
}

const initialState: WatchlistState = {
  selectedWatchlist: null,
};

const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState,
  reducers: {
    setSelectedWatchlist: (state, action: PayloadAction<WatchList | null>) => {
      state.selectedWatchlist = action.payload;
    },
  },
});

export const { setSelectedWatchlist } = watchlistSlice.actions;
export default watchlistSlice.reducer;
