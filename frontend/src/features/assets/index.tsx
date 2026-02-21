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
import { getCurrentToken } from 'src/features/auth/authSlice';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  useGetSyncStatusQuery,
  useSyncAssetsMutation,
} from '@/api/assetService';
import { useToast } from '@/hooks/useToast';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export const AssetsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const assetState = useAppSelector(state => state.asset);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const accessToken = useAppSelector(getCurrentToken);

  // Sync status with frequent polling to catch sync completion
  const { data: syncStatus } = useGetSyncStatusQuery(undefined, {
    pollingInterval: 5000, // Poll every 5 seconds
    skip: !accessToken,
  });
  const [syncAssets, { isLoading: isSyncing }] = useSyncAssetsMutation();
  const requireAuth = useRequireAuth();

  // Track previous sync status to detect completion
  const prevSyncStatusRef = useRef(syncStatus);
  // Trigger for manual refetch when sync completes
  const [refetchTrigger, setRefetchTrigger] = useState<number>(0);
  // Track initialization to prevent URL overwrite
  const [isInitialized, setIsInitialized] = useState(false);

  // Handle sync completion
  useEffect(() => {
    const prevStatus = prevSyncStatusRef.current;
    const currentStatus = syncStatus;

    // Check if sync just completed (was syncing, now not syncing)
    if (
      prevStatus?.is_syncing &&
      currentStatus &&
      !currentStatus.is_syncing &&
      currentStatus.total_assets > 0
    ) {
      // Sync completed successfully, show success message
      toast({
        title: 'Sync Complete',
        description: `Successfully synced ${currentStatus.total_assets} assets from Alpaca.`,
      });

      // Trigger manual refetch of assets
      setRefetchTrigger((prev: number) => prev + 1);
    }

    prevSyncStatusRef.current = syncStatus;
  }, [syncStatus, toast]);

  const handleSyncAssets = useCallback(async () => {
    if (!requireAuth('sync assets')) return;

    try {
      await syncAssets().unwrap();
    } catch (error) {
      console.error('Failed to sync assets:', error);
    }
  }, [requireAuth, syncAssets]);

  // Read URL params -> Redux state
  useEffect(() => {
    const p = Object.fromEntries(searchParams.entries());
    // Only dispatch when values differ to avoid extra renders
    if (p.q !== undefined && p.q !== assetState.quickFilterText) {
      dispatch(setQuickFilterText(p.q));
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
    setIsInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Redux state -> URL params
  useEffect(() => {
    if (!isInitialized) return;

    const next = new URLSearchParams();
    // Persist core filters
    if (assetState.quickFilterText) next.set('q', assetState.quickFilterText);
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
  }, [assetState, searchParams, setSearchParams, isInitialized]);

  return (
    <PageLayout
      header={<PageHeader>Instruments</PageHeader>}
      subheader={
        <PageSubHeader>Browse and search trading instruments</PageSubHeader>
      }
      actions={
        <PageActions>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAssets}
            disabled={isSyncing || syncStatus?.is_syncing}
            className="h-7 text-[12px] px-2.5"
          >
            <RefreshCcw
              className={`w-3 h-3 ${isSyncing || syncStatus?.is_syncing ? 'animate-spin' : ''}`}
            />
            <span className="hidden ml-1.5 sm:inline">
              {isSyncing || syncStatus?.is_syncing ? 'Syncing...' : 'Sync'}
            </span>
          </Button>
        </PageActions>
      }
    >
      {/* Sync Status */}
      {(syncStatus?.needs_sync || syncStatus?.is_syncing) && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 mb-3 text-[11px] border rounded bg-muted/30 border-border/50">
          {syncStatus.is_syncing ? (
            <>
              <RefreshCcw className="w-3 h-3 animate-spin text-primary/60" />
              <span className="font-mono text-muted-foreground">
                Syncing assets...
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {syncStatus.total_assets === 0
                  ? 'No assets found. Click Sync to fetch data.'
                  : 'Asset data may be outdated.'}
              </span>
            </>
          )}
        </div>
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
