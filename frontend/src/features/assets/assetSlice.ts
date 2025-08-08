import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Asset } from '@/types/common-types';

interface AssetState {
  selectedAsset: Asset | null;
  currentPage: number;
  pageSize: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  assetClassFilter: string;
  tradableFilter: string;
  quickFilterText: string;
  viewMode: 'table' | 'grid';
  density: 'comfortable' | 'compact';
}

const initialState: AssetState = {
  selectedAsset: null,
  currentPage: 0,
  pageSize: 10,
  sortField: 'symbol',
  sortDirection: 'asc',
  assetClassFilter: '',
  tradableFilter: '',
  quickFilterText: '',
  viewMode: 'table',
  density: 'comfortable',
};

const assetSlice = createSlice({
  name: 'asset',
  initialState,
  reducers: {
    setSelectedAsset: (state, action: PayloadAction<Asset | null>) => {
      state.selectedAsset = action.payload;
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pageSize = action.payload;
    },
    setSort: (
      state,
      action: PayloadAction<{
        sortField: string;
        sortDirection: 'asc' | 'desc';
      }>
    ) => {
      state.sortField = action.payload.sortField;
      state.sortDirection = action.payload.sortDirection;
    },
    setAssetClassFilter: (state, action: PayloadAction<string>) => {
      state.assetClassFilter = action.payload;
    },
    setTradableFilter: (state, action: PayloadAction<string>) => {
      state.tradableFilter = action.payload;
    },
    setQuickFilterText: (state, action: PayloadAction<string>) => {
      state.quickFilterText = action.payload;
    },
    setViewMode: (state, action: PayloadAction<'table' | 'grid'>) => {
      state.viewMode = action.payload;
    },
    setDensity: (state, action: PayloadAction<'comfortable' | 'compact'>) => {
      state.density = action.payload;
    },
    clearFilters: state => {
      state.assetClassFilter = '';
      state.tradableFilter = '';
      state.quickFilterText = '';
      state.currentPage = 0;
    },
  },
});

export const {
  setSelectedAsset,
  setCurrentPage,
  setPageSize,
  setSort,
  setAssetClassFilter,
  setTradableFilter,
  setQuickFilterText,
  setViewMode,
  setDensity,
  clearFilters,
} = assetSlice.actions;

export default assetSlice.reducer;
