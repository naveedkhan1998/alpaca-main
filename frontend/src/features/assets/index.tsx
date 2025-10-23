import React, { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
  PageActions,
} from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

import { ArrowLeft } from 'lucide-react';

import { AssetTable } from './components/AssetTable';
import { AssetDetails } from './components/AssetDetails';

import {
  setSelectedAsset,
  setCurrentPage,
  setPageSize,
  setSort,
  setAssetClassFilter,
  setTradableFilter,
  setQuickFilterText,
  setViewMode,
  setDensity,
} from './assetSlice';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { useGetSyncStatusQuery, useSyncAssetsMutation } from '@/api/assetService';

const AssetsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const assetState = useAppSelector(state => state.asset);
  const selectedAsset = assetState.selectedAsset;
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync status
  const { data: syncStatus } = useGetSyncStatusQuery();
  const [syncAssets, { isLoading: isSyncing }] = useSyncAssetsMutation();

  const handleBack = useCallback(() => {
    dispatch(setSelectedAsset(null));
  }, [dispatch]);

  const handleSyncAssets = useCallback(async () => {
    try {
      await syncAssets().unwrap();
    } catch (error) {
      console.error('Failed to sync assets:', error);
    }
  }, [syncAssets]);

  // Read URL params -> Redux state
  useEffect(() => {
    const p = Object.fromEntries(searchParams.entries());
    // Only dispatch when values differ to avoid extra renders
    if (p.search !== undefined && p.search !== assetState.quickFilterText) {
      dispatch(setQuickFilterText(p.search));
    }
    if (
      p.asset_class !== undefined &&
      p.asset_class !== assetState.assetClassFilter
    ) {
      dispatch(setAssetClassFilter(p.asset_class));
    }
    if (p.tradable !== undefined && p.tradable !== assetState.tradableFilter) {
      dispatch(setTradableFilter(p.tradable));
    }
    if (p.page !== undefined) {
      const page = Number(p.page);
      if (!Number.isNaN(page) && page !== assetState.currentPage) {
        dispatch(setCurrentPage(page));
      }
    }
    if (p.page_size !== undefined) {
      const size = Number(p.page_size);
      if (!Number.isNaN(size) && size !== assetState.pageSize) {
        dispatch(setPageSize(size));
      }
    }
    if (p.sort !== undefined || p.dir !== undefined) {
      const sortField = p.sort ?? assetState.sortField;
      const sortDirection =
        p.dir === 'asc' || p.dir === 'desc'
          ? (p.dir as 'asc' | 'desc')
          : assetState.sortDirection;
      if (
        sortField !== assetState.sortField ||
        sortDirection !== assetState.sortDirection
      ) {
        dispatch(setSort({ sortField, sortDirection }));
      }
    }
    if (p.view !== undefined && p.view !== assetState.viewMode) {
      if (p.view === 'table' || p.view === 'grid') {
        dispatch(setViewMode(p.view));
      }
    }
    if (p.density !== undefined && p.density !== assetState.density) {
      if (p.density === 'comfortable' || p.density === 'compact') {
        dispatch(setDensity(p.density));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Redux state -> URL params
  useEffect(() => {
    const next = new URLSearchParams();
    // Persist core filters
    if (assetState.quickFilterText)
      next.set('search', assetState.quickFilterText);
    if (assetState.assetClassFilter)
      next.set('asset_class', assetState.assetClassFilter);
    if (assetState.tradableFilter)
      next.set('tradable', assetState.tradableFilter);
    if (assetState.currentPage !== 0)
      next.set('page', String(assetState.currentPage));
    if (assetState.pageSize !== 10)
      next.set('page_size', String(assetState.pageSize));
    if (assetState.sortField) next.set('sort', assetState.sortField);
    if (assetState.sortDirection) next.set('dir', assetState.sortDirection);
    if (assetState.viewMode !== 'table') next.set('view', assetState.viewMode);
    if (assetState.density !== 'comfortable')
      next.set('density', assetState.density);

    // Update only if changed to avoid history churn
    const current = new URLSearchParams(searchParams.toString());
    const changed = next.toString() !== current.toString();
    if (changed) setSearchParams(next, { replace: true });
  }, [assetState, searchParams, setSearchParams]);

  return (
    <PageLayout
      header={
        <PageHeader>
          <div className="flex items-center gap-3">Assets</div>
        </PageHeader>
      }
      subheader={
        <PageSubHeader>
          Browse and search through available trading assets with advanced
          filtering and sorting capabilities.
        </PageSubHeader>
      }
      actions={
        <PageActions>
          {selectedAsset && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
        </PageActions>
      }
    >
      {/* Sync Banner */}
      {syncStatus?.needs_sync && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {syncStatus.is_syncing
                ? "Assets are currently being synced..."
                : syncStatus.total_assets === 0
                ? "No assets found in your database. Sync assets to get started."
                : "Your asset data is outdated. Consider syncing to get the latest information."}
            </span>
            {!syncStatus.is_syncing && (
              <Button
                onClick={handleSyncAssets}
                disabled={isSyncing}
                size="sm"
                className="ml-4"
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Assets'}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <PageContent>
        <div className="space-y-8">
          {selectedAsset ? (
            <AssetDetails assetId={selectedAsset.id} />
          ) : (
            <AssetTable />
          )}
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default AssetsPage;
