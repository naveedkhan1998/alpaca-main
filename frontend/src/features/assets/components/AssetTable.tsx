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

import { setCurrentPage, setPageSize, setSort } from '../assetSlice';
import { SortableHeader } from './SortableHeader';
import { AddToWatchlistDialog } from './AddToWatchlistDialog';
import { AssetToolbar } from './AssetToolbar';
import { AssetCard } from './AssetCard';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';

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
            <div className="py-8 text-center col-span-full">
              <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">No instruments found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <SortableHeader
                  className={`${headerCellClass} font-medium`}
                  field="symbol"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Symbol
                </SortableHeader>
                <SortableHeader
                  className={`${headerCellClass} font-medium`}
                  field="name"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Name
                </SortableHeader>
                <SortableHeader
                  className={`${headerCellClass} font-medium`}
                  field="asset_class"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Class
                </SortableHeader>
                <SortableHeader
                  className={`${headerCellClass} font-medium`}
                  field="exchange"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Exchange
                </SortableHeader>
                <SortableHeader
                  className={`${headerCellClass} font-medium`}
                  field="tradable"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Status
                </SortableHeader>
                <TableHead className={`${headerCellClass} font-medium w-20`}>
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
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/instruments/${asset.id}`)}
                  >
                    <TableCell
                      className={`${bodyCellClass} font-medium font-mono`}
                    >
                      {asset.symbol}
                    </TableCell>
                    <TableCell className={`${bodyCellClass} max-w-xs`}>
                      <span className="truncate" title={asset.name}>
                        {asset.name}
                      </span>
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getAssetClassColor(asset.asset_class)}`}
                      >
                        {asset.asset_class.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`${bodyCellClass} text-muted-foreground`}
                    >
                      {asset.exchange}
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Badge
                        variant={asset.tradable ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {asset.tradable ? 'Tradable' : 'No Trade'}
                      </Badge>
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => handleAddToWatchlist(asset, e)}
                          className="p-0 w-7 h-7"
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
                          className="p-0 w-7 h-7"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium">No instruments found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search or filters
                    </p>
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
