import React, { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
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
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Heart,
} from 'lucide-react';
import { useGetAssetsQuery, useGetAssetStatsQuery } from '@/api/assetService';
import { Asset, GetAssetsParams } from '@/types/common-types';
import { useDebounce } from '@/hooks/useDebounce';

import {
  setCurrentPage,
  setPageSize,
  setSort,
  setAssetClassFilter,
  setTradableFilter,
  setQuickFilterText,
  setSelectedAsset,
} from '../assetSlice';
import { SortableHeader } from './SortableHeader';
import { AddToWatchlistDialog } from './AddToWatchlistDialog';
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
  } = useAppSelector(state => state.asset);

  const [addToWatchlistAsset, setAddToWatchlistAsset] = useState<Asset | null>(
    null
  );
  const debouncedQuickFilter = useDebounce(quickFilterText, 300);
  const { data: assetStats } = useGetAssetStatsQuery();

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
  const totalPages = Math.ceil(totalCount / pageSize);

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

  const handleQuickFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setQuickFilterText(e.target.value));
    dispatch(setCurrentPage(0));
  };

  const handlePageChange = (newPage: number) =>
    dispatch(setCurrentPage(newPage));
  const handlePageSizeChange = (newSize: string) => {
    dispatch(setPageSize(parseInt(newSize)));
    dispatch(setCurrentPage(0));
  };

  const handleAssetClassFilterChange = (value: string) => {
    dispatch(setAssetClassFilter(value === 'all' ? '' : value));
    dispatch(setCurrentPage(0));
  };

  const handleTradableFilterChange = (value: string) => {
    dispatch(setTradableFilter(value === 'all' ? '' : value));
    dispatch(setCurrentPage(0));
  };

  const handleAddToWatchlist = (asset: Asset, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddToWatchlistAsset(asset);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Search assets by symbol or name..."
            value={quickFilterText}
            onChange={handleQuickFilterChange}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={assetClassFilter || 'all'}
            onValueChange={handleAssetClassFilterChange}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Asset Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Asset Classes</SelectItem>
              {assetStats?.asset_classes.map(ac => (
                <SelectItem key={ac.value} value={ac.value}>
                  {ac.label} ({ac.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={tradableFilter || 'all'}
            onValueChange={handleTradableFilterChange}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tradable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Tradable</SelectItem>
              <SelectItem value="false">Non-tradable</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={pageSize.toString()}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      {error && (
        <Alert>
          <AlertDescription>
            Failed to load assets. Please try again.
          </AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader
                field="symbol"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Symbol
              </SortableHeader>
              <SortableHeader
                field="name"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Name
              </SortableHeader>
              <SortableHeader
                field="asset_class"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Asset Class
              </SortableHeader>
              <SortableHeader
                field="exchange"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Exchange
              </SortableHeader>
              <SortableHeader
                field="tradable"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Tradable
              </SortableHeader>
              <SortableHeader
                field="marginable"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Marginable
              </SortableHeader>
              <SortableHeader
                field="shortable"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              >
                Shortable
              </SortableHeader>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="w-16 h-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-32 h-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-20 h-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-16 h-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-16 h-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-16 h-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-16 h-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-8 h-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : assets.length > 0 ? (
              assets.map(asset => (
                <TableRow
                  key={asset.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => dispatch(setSelectedAsset(asset))}
                >
                  <TableCell className="font-medium w-32 min-w-[8rem]">
                    <div className="flex items-center gap-2">
                      <Building2 className="flex-shrink-0 w-4 h-4 text-primary" />
                      <span className="truncate">{asset.symbol}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] min-w-[150px]">
                    <div className="truncate" title={asset.name}>
                      {asset.name}
                    </div>
                  </TableCell>
                  <TableCell className="w-36 min-w-[9rem]">
                    <Badge className={getAssetClassColor(asset.asset_class)}>
                      {asset.asset_class.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-24 min-w-[6rem]">
                    <span className="truncate">{asset.exchange}</span>
                  </TableCell>
                  <TableCell className="w-20 min-w-[5rem]">
                    <Badge variant={asset.tradable ? 'default' : 'secondary'}>
                      {asset.tradable ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-24 min-w-[6rem]">
                    <Badge variant={asset.marginable ? 'default' : 'secondary'}>
                      {asset.marginable ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-20 min-w-[5rem]">
                    <Badge variant={asset.shortable ? 'default' : 'secondary'}>
                      {asset.shortable ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-32">
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

      {!isLoading && totalCount > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount}{' '}
            assets
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum =
                  Math.max(0, Math.min(totalPages - 5, currentPage - 2)) + i;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8"
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
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
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
