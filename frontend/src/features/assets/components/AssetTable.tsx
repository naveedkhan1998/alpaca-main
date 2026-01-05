import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  TrendingUp,
} from 'lucide-react';
import { useGetAssetsQuery } from '@/api/assetService';
import { Asset, GetAssetsParams } from '@/types/common-types';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/useMobile';

import {
  setCurrentPage,
  setPageSize,
  setSort,
  setQuickFilterText,
  setAssetClassFilter,
} from '../assetSlice';
import { SortableHeader } from './SortableHeader';
import { AddToWatchlistDialog } from './AddToWatchlistDialog';
import { AssetToolbar } from './AssetToolbar';
import { AssetCard } from './AssetCard';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export const AssetTable: React.FC<{ refetchTrigger?: number }> = ({
  refetchTrigger,
}) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    currentPage,
    pageSize,
    sortField,
    sortDirection,
    assetClassFilter,
    exchangeFilter,
    tradableFilter,
    marginableFilter,
    shortableFilter,
    fractionableFilter,
    quickFilterText,
    viewMode,
    density,
  } = useAppSelector(state => state.asset);

  const [addToWatchlistAsset, setAddToWatchlistAsset] = useState<Asset | null>(
    null
  );
  const debouncedQuickFilter = useDebounce(quickFilterText, 300);
  const requireAuth = useRequireAuth();

  const queryParams: GetAssetsParams = useMemo(() => {
    const params: GetAssetsParams = {
      limit: pageSize,
      offset: currentPage * pageSize,
      ordering: sortDirection === 'desc' ? `-${sortField}` : sortField,
    };
    if (debouncedQuickFilter) params.q = debouncedQuickFilter;
    if (assetClassFilter) params.asset_class = assetClassFilter;
    if (exchangeFilter) params.exchange = exchangeFilter;
    if (tradableFilter) params.tradable = tradableFilter === 'true';
    if (marginableFilter) params.marginable = marginableFilter === 'true';
    if (shortableFilter) params.shortable = shortableFilter === 'true';
    if (fractionableFilter) params.fractionable = fractionableFilter === 'true';
    return params;
  }, [
    currentPage,
    pageSize,
    sortField,
    sortDirection,
    debouncedQuickFilter,
    assetClassFilter,
    exchangeFilter,
    tradableFilter,
    marginableFilter,
    shortableFilter,
    fractionableFilter,
  ]);

  const { data, isLoading, error, refetch } = useGetAssetsQuery(queryParams);
  const errorStatus =
    error && typeof error === 'object' && 'status' in error
      ? (error as { status?: number }).status
      : undefined;
  const errorMessage =
    errorStatus === 429
      ? 'Rate limit reached. Please wait a moment or log in for higher limits.'
      : 'Failed to load assets. Please try again.';

  // Trigger refetch when refetchTrigger changes (e.g., after sync completion)
  useEffect(() => {
    if (refetchTrigger && refetchTrigger > 0) {
      refetch();
    }
  }, [refetchTrigger, refetch]);

  const assets = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / Math.max(1, pageSize));

  const getAssetClassColor = (assetClass: string) => {
    switch (assetClass) {
      case 'us_equity':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'us_option':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'crypto':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleSort = useCallback(
    (field: string) => {
      const newSortDirection =
        sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
      dispatch(setSort({ sortField: field, sortDirection: newSortDirection }));
      dispatch(setCurrentPage(0));
    },
    [sortField, sortDirection, dispatch]
  );

  const handlePageChange = (newPage: number) =>
    dispatch(setCurrentPage(newPage));
  const handlePageSizeChange = (newSize: string) => {
    dispatch(setPageSize(parseInt(newSize)));
    dispatch(setCurrentPage(0));
  };

  const handleAddToWatchlist = (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireAuth('add assets to watchlists')) return;
    setAddToWatchlistAsset(asset);
  };

  // Density helpers for compact rows - force compact on mobile
  const effectiveDensity = isMobile ? 'compact' : density;
  const isCompact = effectiveDensity === 'compact';
  const headerCellClass = isCompact ? 'px-3 py-2' : 'px-4 py-3';
  const bodyCellClass = isCompact ? 'px-3 py-3' : 'px-4 py-4';

  return (
    <div className="space-y-6">
      <AssetToolbar onRefresh={() => refetch()} refreshing={isLoading} />

      {error && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-destructive dark:text-destructive-foreground">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: pageSize }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="w-16 h-5" />
                      <Skeleton className="w-6 h-6" />
                    </div>
                    <Skeleton className="w-32 h-4" />
                    <div className="flex gap-2">
                      <Skeleton className="w-16 h-5" />
                      <Skeleton className="w-16 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : assets.length > 0 ? (
            assets.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onSelect={a => navigate(`/instruments/${a.id}`)}
                onWatchlist={handleAddToWatchlist}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center col-span-full">
              <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-muted/50">
                <TrendingUp className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No assets found
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <SortableHeader
                  className={`${headerCellClass} font-medium w-[100px]`}
                  field="symbol"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Symbol
                </SortableHeader>
                <SortableHeader
                  className={`${headerCellClass} font-medium w-[250px]`}
                  field="name"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Name
                </SortableHeader>
                <SortableHeader
                  className={`${headerCellClass} font-medium w-[120px]`}
                  field="asset_class"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Class
                </SortableHeader>
                <SortableHeader
                  className={`${headerCellClass} font-medium w-[100px]`}
                  field="exchange"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Exchange
                </SortableHeader>
                <TableHead
                  className={`${headerCellClass} font-medium w-[140px]`}
                >
                  Attrs
                </TableHead>
                <SortableHeader
                  className={`${headerCellClass} font-medium w-[120px]`}
                  field="tradable"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Status
                </SortableHeader>
                <TableHead
                  className={`${headerCellClass} font-medium w-[80px]`}
                >
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i} className={isCompact ? 'h-12' : 'h-16'}>
                    <TableCell className={bodyCellClass}>
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded" />
                        <Skeleton className="w-16 h-4" />
                      </div>
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-32 h-4" />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-20 h-6 rounded-full" />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-16 h-4" />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <div className="flex gap-1">
                        <Skeleton className="w-4 h-4" />
                        <Skeleton className="w-4 h-4" />
                      </div>
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-12 h-5 rounded-full" />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-16 h-8 rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : assets.length > 0 ? (
                assets.map(asset => (
                  <TableRow
                    key={asset.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/instruments/${asset.id}`)}
                  >
                    <TableCell
                      className={`${bodyCellClass} font-medium font-mono text-primary`}
                    >
                      {asset.symbol}
                    </TableCell>
                    <TableCell className={`${bodyCellClass} max-w-[250px]`}>
                      <div
                        className="truncate font-medium text-foreground/90"
                        title={asset.name}
                      >
                        {asset.name}
                      </div>
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Badge
                        variant="secondary"
                        className={`text-xs whitespace-nowrap ${getAssetClassColor(asset.asset_class)}`}
                      >
                        {asset.asset_class.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`${bodyCellClass} text-muted-foreground text-xs uppercase`}
                    >
                      {asset.exchange}
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <div className="flex gap-1.5 flex-wrap">
                        {asset.marginable && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-center w-5 h-5 rounded-sm bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold cursor-help">
                                  M
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Marginable</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {asset.shortable && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-center w-5 h-5 rounded-sm bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[10px] font-bold cursor-help">
                                  S
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Shortable</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {asset.fractionable && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-center w-5 h-5 rounded-sm bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-[10px] font-bold cursor-help">
                                  F
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>Fractionable</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Badge
                        variant={asset.tradable ? 'default' : 'secondary'}
                        className={`text-xs whitespace-nowrap ${!asset.tradable && 'opacity-50'}`}
                      >
                        {asset.tradable ? 'Active' : 'Halted'}
                      </Badge>
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => handleAddToWatchlist(asset, e)}
                          className="w-8 h-8 hover:text-primary"
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/instruments/${asset.id}`);
                          }}
                          className="w-8 h-8 hover:text-primary"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-muted/50">
                        <TrendingUp className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-lg font-medium text-foreground">
                        No assets found
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                        We couldn't find any assets matching your filters. Try
                        adjusting your search criteria.
                      </p>
                      <Button
                        variant="outline"
                        className="mt-6"
                        onClick={() => {
                          dispatch(setQuickFilterText(''));
                          dispatch(setAssetClassFilter(''));
                          // clear other filters if needed via dispatch(clearFilters())
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && totalCount > 0 && (
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1}-
            {Math.min((currentPage + 1) * pageSize, totalCount)} of{' '}
            {totalCount.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={pageSize.toString()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="h-8 px-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-2 text-sm">
                {currentPage + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="h-8 px-2"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <AddToWatchlistDialog
        asset={addToWatchlistAsset}
        open={!!addToWatchlistAsset}
        onOpenChange={open => !open && setAddToWatchlistAsset(null)}
      />
    </div>
  );
};
