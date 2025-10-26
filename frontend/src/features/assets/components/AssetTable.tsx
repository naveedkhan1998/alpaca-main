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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Search,
} from 'lucide-react';
import { useGetAssetsQuery } from '@/api/assetService';
import { Asset, GetAssetsParams } from '@/types/common-types';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/useMobile';

import {
  setCurrentPage,
  setPageSize,
  setSort,
} from '../assetSlice';
import { SortableHeader } from './SortableHeader';
import { AddToWatchlistDialog } from './AddToWatchlistDialog';
import { AssetToolbar } from './AssetToolbar';
import { AssetCard } from './AssetCard';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';

export const AssetTable: React.FC<{ refetchTrigger?: number }> = ({ refetchTrigger }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    currentPage,
    pageSize,
    sortField,
    sortDirection,
    assetClassFilter,
    tradableFilter,
    quickFilterText,
    viewMode,
    density,
  } = useAppSelector(state => state.asset);

  const [addToWatchlistAsset, setAddToWatchlistAsset] = useState<Asset | null>(
    null
  );
  const debouncedQuickFilter = useDebounce(quickFilterText, 300);

  const queryParams: GetAssetsParams = useMemo(() => {
    const params: GetAssetsParams = {
      limit: pageSize,
      offset: currentPage * pageSize,
      ordering: sortDirection === 'desc' ? `-${sortField}` : sortField,
    };
    if (debouncedQuickFilter) params.search = debouncedQuickFilter;
    if (assetClassFilter) params.asset_class = assetClassFilter;
    if (tradableFilter) params.tradable = tradableFilter === 'true';
    return params;
  }, [
    currentPage,
    pageSize,
    sortField,
    sortDirection,
    debouncedQuickFilter,
    assetClassFilter,
    tradableFilter,
  ]);

  const { data, isLoading, error, refetch } = useGetAssetsQuery(queryParams);

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
        return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 dark:from-blue-900/20 dark:to-blue-800/20 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'us_option':
        return 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 dark:from-purple-900/20 dark:to-purple-800/20 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'crypto':
        return 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 dark:from-orange-900/20 dark:to-orange-800/20 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 dark:from-gray-900/20 dark:to-gray-800/20 dark:text-gray-300 border-gray-200 dark:border-gray-800';
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
            Failed to load assets. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: pageSize }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="w-16 h-5" />
                        <Skeleton className="w-24 h-4" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Skeleton className="w-full h-4" />
                      <div className="flex gap-2">
                        <Skeleton className="w-16 h-6 rounded-full" />
                        <Skeleton className="w-20 h-6 rounded-full" />
                      </div>
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
            <Card className="col-span-full border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No assets found</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  {quickFilterText
                    ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                    : 'No assets match your current filters. Try broadening your search criteria.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
                <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
                  <SortableHeader
                    className={`${headerCellClass} font-semibold`}
                    field="symbol"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Symbol
                    </div>
                  </SortableHeader>
                  <SortableHeader
                    className={`${headerCellClass} font-semibold`}
                    field="name"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Name
                  </SortableHeader>
                  <SortableHeader
                    className={`${headerCellClass} font-semibold`}
                    field="asset_class"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Asset Class
                  </SortableHeader>
                  <SortableHeader
                    className={`${headerCellClass} font-semibold`}
                    field="exchange"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Exchange
                  </SortableHeader>
                  <SortableHeader
                    className={`${headerCellClass} font-semibold`}
                    field="tradable"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Status
                  </SortableHeader>
                  <TableHead className={`${headerCellClass} font-semibold w-24`}>
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
                          <Skeleton className="w-12 h-5 rounded-full" />
                          <Skeleton className="w-12 h-5 rounded-full" />
                        </div>
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
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => navigate(`/instruments/${asset.id}`)}
                    >
                      <TableCell className={`${bodyCellClass} font-medium`}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-mono text-sm">{asset.symbol}</span>
                        </div>
                      </TableCell>
                      <TableCell className={`${bodyCellClass} max-w-xs`}>
                        <div className="truncate font-medium" title={asset.name}>
                          {asset.name}
                        </div>
                      </TableCell>
                      <TableCell className={bodyCellClass}>
                        <Badge className={`${getAssetClassColor(asset.asset_class)} border shadow-sm`}>
                          {asset.asset_class.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className={`${bodyCellClass} text-muted-foreground`}>
                        {asset.exchange}
                      </TableCell>
                      <TableCell className={bodyCellClass}>
                        <div className="flex gap-1">
                          <Badge
                            variant={asset.tradable ? 'default' : 'secondary'}
                            className="text-xs px-2 py-0.5"
                          >
                            {asset.tradable ? 'Tradable' : 'No Trade'}
                          </Badge>
                          {asset.marginable && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              Margin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={bodyCellClass}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => handleAddToWatchlist(asset, e)}
                            className="h-8 w-8 p-0 hover:text-red-500"
                            title="Add to Watchlist"
                          >
                            <Heart className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/instruments/${asset.id}`);
                            }}
                            className="h-8 w-8 p-0"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/50">
                          <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-lg font-semibold mb-2">No assets found</h3>
                          <p className="text-muted-foreground max-w-sm">
                            {quickFilterText
                              ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                              : 'No assets match your current filters. Try broadening your search criteria.'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {!isLoading && totalCount > 0 && (
        <Card className="border-0 shadow-sm bg-muted/20">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing{' '}
                <span className="font-semibold text-foreground">
                  {currentPage * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-foreground">
                  {Math.min((currentPage + 1) * pageSize, totalCount)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-foreground">
                  {totalCount.toLocaleString()}
                </span>{' '}
                assets
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger className="w-20 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="h-9 gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum =
                        Math.max(
                          0,
                          Math.min(Math.max(0, totalPages - 5), currentPage - 2)
                        ) + i;
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-9 h-9"
                        >
                          {pageNum + 1}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="h-9 gap-1"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AddToWatchlistDialog
        asset={addToWatchlistAsset}
        open={!!addToWatchlistAsset}
        onOpenChange={open => !open && setAddToWatchlistAsset(null)}
      />
    </div>
  );
};
