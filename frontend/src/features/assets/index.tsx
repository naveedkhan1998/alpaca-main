import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import { AssetTable } from './components/AssetTable';

import {
  setAssetClassFilter,
  setCurrentPage,
  setDensity,
  setPageSize,
  setQuickFilterText,
  setSort,
  setTradableFilter,
  setViewMode,
} from './assetSlice';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  useGetSyncStatusQuery,
  useSyncAssetsMutation,
} from '@/api/assetService';
import { useToast } from '@/hooks/useToast';

export const AssetsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const assetState = useAppSelector(state => state.asset);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // Sync status with frequent polling to catch sync completion
  const { data: syncStatus } = useGetSyncStatusQuery(undefined, {
    pollingInterval: 5000, // Poll every 5 seconds
  });
  const [syncAssets, { isLoading: isSyncing }] = useSyncAssetsMutation();

  // Track previous sync status to detect completion
  const prevSyncStatusRef = useRef(syncStatus);
  // Trigger for manual refetch when sync completes
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);

  // Handle sync completion
  useEffect(() => {
    const prevStatus = prevSyncStatusRef.current;
    const currentStatus = syncStatus;

    // Check if sync just completed (was syncing, now not syncing)
    if (prevStatus?.is_syncing && currentStatus && !currentStatus.is_syncing && currentStatus.total_assets > 0) {
      // Sync completed successfully, show success message
      toast({
        title: "Sync Complete",
        description: `Successfully synced ${currentStatus.total_assets} assets from Alpaca.`,
      });
      
      // Trigger manual refetch of assets
      setRefetchTrigger((prev: number) => prev + 1);
    }

    prevSyncStatusRef.current = syncStatus;
  }, [syncStatus, toast]);

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
      header={<PageHeader>Trading Assets</PageHeader>}
      subheader={
        <PageSubHeader>
          Discover and analyze trading instruments across multiple asset classes.
          Filter, sort, and explore market data with advanced search capabilities.
        </PageSubHeader>
      }
      actions={
        <PageActions>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSyncAssets}
              disabled={isSyncing || syncStatus?.is_syncing}
              className="gap-2"
            >
              <RefreshCcw className={`w-4 h-4 ${(isSyncing || syncStatus?.is_syncing) ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {(isSyncing || syncStatus?.is_syncing) ? 'Syncing...' : 'Sync Assets'}
              </span>
            </Button>
          </div>
        </PageActions>
      }
    >
      {/* Sync Banner */}
      {syncStatus?.needs_sync && (
        <Alert className="mb-6 border-amber-200/50 bg-amber-50/50 dark:border-amber-800/50 dark:bg-amber-950/50 backdrop-blur-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              <p className="mb-1 font-medium text-amber-800 dark:text-amber-200">
                Asset Data Sync Required
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {syncStatus.is_syncing
                  ? 'Assets are currently being synced from Alpaca...'
                  : syncStatus.total_assets === 0
                    ? 'No assets found in your database. Sync assets to get started.'
                    : 'Your asset data is outdated. Consider syncing to get the latest information.'}
              </p>
            </div>
            {!syncStatus.is_syncing && (
              <Button
                onClick={handleSyncAssets}
                disabled={isSyncing}
                size="sm"
                className="ml-4 text-white bg-amber-600 hover:bg-amber-700 border-amber-600"
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Syncing Banner */}
      {syncStatus?.is_syncing && (
        <Alert className="mb-6 border-blue-200/50 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-950/50 backdrop-blur-sm">
          <RefreshCcw className="w-4 h-4 text-blue-600 animate-spin dark:text-blue-400" />
          <AlertDescription>
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Syncing Assets from Alpaca
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This may take 30-40 seconds. Please wait while we fetch the latest asset data...
            </p>
          </AlertDescription>
        </Alert>
      )}

      <PageContent>
        <div className="space-y-6">
          <AssetTable refetchTrigger={refetchTrigger} />
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default AssetsPage;
