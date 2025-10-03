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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, Package, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { AssetTable } from './components/AssetTable';
import { AssetDetails } from './components/AssetDetails';
import { useGetAssetStatsQuery } from '@/api/assetService';
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

const AssetsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const assetState = useAppSelector(state => state.asset);
  const selectedAsset = assetState.selectedAsset;
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: stats } = useGetAssetStatsQuery();

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  };

  const handleBack = useCallback(() => {
    dispatch(setSelectedAsset(null));
  }, [dispatch]);

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
      <PageContent>
        {!selectedAsset && stats && (
          <motion.div {...fadeIn} className="grid gap-4 mb-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Total Assets
                </CardTitle>
                <Package className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.total_count?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Available for trading
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Asset Classes
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.asset_classes?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.asset_classes?.map(ac => ac.label).join(', ') ||
                    'Multiple types'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Active Filters
                </CardTitle>
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(assetState.assetClassFilter ? 1 : 0) +
                    (assetState.tradableFilter ? 1 : 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {assetState.assetClassFilter || assetState.tradableFilter
                    ? 'Filters applied'
                    : 'No filters applied'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

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
