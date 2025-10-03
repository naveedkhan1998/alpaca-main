import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Building2,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Heart,
} from 'lucide-react';
import { useGetAssetsQuery } from '@/api/assetService';
import { Asset, GetAssetsParams } from '@/types/common-types';
import { useDebounce } from '@/hooks/useDebounce';

import {
  setCurrentPage,
  setPageSize,
  setSort,
  setSelectedAsset,
} from '../assetSlice';
import { SortableHeader } from './SortableHeader';
import { AddToWatchlistDialog } from './AddToWatchlistDialog';
import { AssetToolbar } from './AssetToolbar';
import { AssetCard } from './AssetCard';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';

export const AssetTable: React.FC = () => {
  const dispatch = useAppDispatch();
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

  const assets = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / Math.max(1, pageSize));

  const getAssetClassColor = (assetClass: string) => {
    switch (assetClass) {
      case 'us_equity':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'us_option':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'crypto':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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

  // Density helpers for compact rows
  const isCompact = density === 'compact';
  const headerCellClass = isCompact ? 'px-3 py-1.5' : 'px-4 py-3';
  const bodyCellClass = isCompact ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <div className="space-y-4">
      <AssetToolbar onRefresh={() => refetch()} refreshing={isLoading} />

      {error && (
        <Alert>
          <AlertDescription>
            Failed to load assets. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            Array.from({ length: pageSize }).map((_, i) => (
              <div key={i} className="p-4 space-y-3 border rounded-md">
                <Skeleton className="w-24 h-5" />
                <Skeleton className="w-48 h-4" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="w-full h-4" />
                  <Skeleton className="w-full h-4" />
                  <Skeleton className="w-full h-4" />
                  <Skeleton className="w-full h-4" />
                </div>
              </div>
            ))
          ) : assets.length > 0 ? (
            assets.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onSelect={a => dispatch(setSelectedAsset(a))}
                onWatchlist={handleAddToWatchlist}
              />
            ))
          ) : (
            <div className="py-10 text-center border rounded-md col-span-full">
              <div className="flex flex-col items-center gap-2">
                <Search className="w-12 h-12 text-muted-foreground" />
                <p className="text-lg font-semibold">No assets found</p>
                <p className="text-muted-foreground">
                  {quickFilterText
                    ? 'Try adjusting your search terms or filters'
                    : 'No assets match your current filters'}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden border rounded-md">
          <Table className={isCompact ? 'text-sm leading-tight' : ''}>
            <TableHeader>
              <TableRow>
                <SortableHeader
                  className={headerCellClass}
                  field="symbol"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Symbol
                </SortableHeader>
                <SortableHeader
                  className={headerCellClass}
                  field="name"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Name
                </SortableHeader>
                <SortableHeader
                  className={headerCellClass}
                  field="asset_class"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Asset Class
                </SortableHeader>
                <SortableHeader
                  className={headerCellClass}
                  field="exchange"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Exchange
                </SortableHeader>
                <SortableHeader
                  className={headerCellClass}
                  field="tradable"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Tradable
                </SortableHeader>
                <SortableHeader
                  className={headerCellClass}
                  field="marginable"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Marginable
                </SortableHeader>
                <SortableHeader
                  className={headerCellClass}
                  field="shortable"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                >
                  Shortable
                </SortableHeader>
                <TableHead className={`w-32 ${headerCellClass}`}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i} className={isCompact ? 'h-10' : ''}>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-16 h-4" />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-32 h-4" />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-20 h-6" />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-16 h-4" />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-16 h-6" />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-16 h-6" />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-16 h-6" />
                    </TableCell>
                    <TableCell className={bodyCellClass}>
                      <Skeleton className="w-8 h-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : assets.length > 0 ? (
                assets.map(asset => (
                  <TableRow
                    key={asset.id}
                    className={`cursor-pointer hover:bg-muted/50 ${isCompact ? 'h-10' : ''}`}
                    onClick={() => dispatch(setSelectedAsset(asset))}
                  >
                    <TableCell
                      className={`font-medium w-32 min-w-[8rem] ${bodyCellClass}`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="flex-shrink-0 w-4 h-4 text-primary" />
                        <span className="truncate">{asset.symbol}</span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={`max-w-[200px] min-w-[150px] ${bodyCellClass}`}
                    >
                      <div className="truncate" title={asset.name}>
                        {asset.name}
                      </div>
                    </TableCell>
                    <TableCell className={`w-36 min-w-[9rem] ${bodyCellClass}`}>
                      <Badge className={getAssetClassColor(asset.asset_class)}>
                        {asset.asset_class.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className={`w-24 min-w-[6rem] ${bodyCellClass}`}>
                      <span className="truncate">{asset.exchange}</span>
                    </TableCell>
                    <TableCell className={`w-20 min-w-[5rem] ${bodyCellClass}`}>
                      <Badge variant={asset.tradable ? 'default' : 'secondary'}>
                        {asset.tradable ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`w-24 min-w-[6rem] ${bodyCellClass}`}>
                      <Badge
                        variant={asset.marginable ? 'default' : 'secondary'}
                      >
                        {asset.marginable ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`w-20 min-w-[5rem] ${bodyCellClass}`}>
                      <Badge
                        variant={asset.shortable ? 'default' : 'secondary'}
                      >
                        {asset.shortable ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`w-32 ${bodyCellClass}`}>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => handleAddToWatchlist(asset, e)}
                          title="Add to Watchlist"
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            dispatch(setSelectedAsset(asset));
                          }}
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
                  <TableCell colSpan={8} className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="w-12 h-12 text-muted-foreground" />
                      <p className="text-lg font-semibold">No assets found</p>
                      <p className="text-muted-foreground">
                        {quickFilterText
                          ? 'Try adjusting your search terms or filters'
                          : 'No assets match your current filters'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && totalCount > 0 && (
        <div className="flex flex-col gap-4 p-4 border-t sm:flex-row sm:items-center sm:justify-between bg-muted/20">
          <div className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {currentPage * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-medium text-foreground">
              {Math.min((currentPage + 1) * pageSize, totalCount)}
            </span>{' '}
            of <span className="font-medium text-foreground">{totalCount}</span>{' '}
            assets
          </div>
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Per page:</span>
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
                className="h-9"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Prev</span>
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
                className="h-9"
              >
                <span className="hidden sm:inline mr-1">Next</span>
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
