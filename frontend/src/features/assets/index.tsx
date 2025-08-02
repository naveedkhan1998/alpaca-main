import React, { useState, useCallback, useMemo } from 'react';
import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
  PageActions,
} from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
  Calendar,
  Eye,
  ArrowLeft,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';

import {
  useGetAssetsQuery,
  useGetAssetByIdQuery,
  useGetAssetStatsQuery,
} from '@/api/assetService';
import { Asset, GetAssetsParams } from '@/types/common-types';
import { useDebounce } from '@/hooks/useDebounce';

// Sort header component
const SortableHeader: React.FC<{
  children: React.ReactNode;
  field: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
}> = ({ children, field, sortField, sortDirection, onSort }) => {
  const isSorted = sortField === field;

  return (
    <TableHead
      className="transition-colors cursor-pointer select-none hover:bg-muted/50"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        {isSorted ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )
        ) : (
          <ChevronsUpDown className="w-4 h-4 opacity-50" />
        )}
      </div>
    </TableHead>
  );
};

// Asset table component
const AssetTable: React.FC<{
  onAssetSelect: (asset: Asset) => void;
}> = ({ onAssetSelect }) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Filter and search state
  const [quickFilterText, setQuickFilterText] = useState('');
  const [sortField, setSortField] = useState<string>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [assetClassFilter, setAssetClassFilter] = useState<string>('');
  const [tradableFilter, setTradableFilter] = useState<string>('');

  const debouncedQuickFilter = useDebounce(quickFilterText, 300);

  const { data: assetStats } = useGetAssetStatsQuery();

  // Build query parameters
  const queryParams: GetAssetsParams = useMemo(() => {
    const params: GetAssetsParams = {
      limit: pageSize,
      offset: currentPage * pageSize,
      ordering: sortDirection === 'desc' ? `-${sortField}` : sortField,
    };

    if (debouncedQuickFilter) {
      params.search = debouncedQuickFilter;
    }

    if (assetClassFilter) {
      params.asset_class = assetClassFilter;
    }

    if (tradableFilter) {
      params.tradable = tradableFilter === 'true';
    }

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

  const assets = data?.data || [];
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
      if (sortField === field) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
      setCurrentPage(0); // Reset to first page when sorting changes
    },
    [sortField, sortDirection]
  );

  const handleQuickFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuickFilterText(e.target.value);
      setCurrentPage(0); // Reset to first page when searching
    },
    []
  );

  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: string) => {
    setPageSize(parseInt(newSize));
    setCurrentPage(0);
  }, []);

  const handleAssetClassFilterChange = useCallback((value: string) => {
    setAssetClassFilter(value === 'all' ? '' : value);
    setCurrentPage(0);
  }, []);

  const handleTradableFilterChange = useCallback((value: string) => {
    setTradableFilter(value === 'all' ? '' : value);
    setCurrentPage(0);
  }, []);

  const refreshTable = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
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
            onClick={refreshTable}
            disabled={isLoading}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      {/* Loading and Error States */}
      {error && (
        <Alert>
          <AlertDescription>
            Failed to load assets. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
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
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton rows
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
                  onClick={() => onAssetSelect(asset)}
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
                  <TableCell className="w-20">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        onAssetSelect(asset);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
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

      {/* Pagination */}
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
    </div>
  );
};

// Asset Details Component
const AssetDetails: React.FC<{
  assetId: number;
}> = ({ assetId }) => {
  const { data: asset, isLoading, error } = useGetAssetByIdQuery(assetId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-48 h-8" />
            <Skeleton className="w-64 h-4" />
          </div>
        </div>
        <Skeleton className="w-full h-64" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <Alert>
        <AlertDescription>
          Failed to load asset details. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const detailsData = [
    { label: 'Symbol', value: asset.symbol },
    { label: 'Name', value: asset.name },
    {
      label: 'Asset Class',
      value: asset.asset_class.replace('_', ' ').toUpperCase(),
    },
    { label: 'Exchange', value: asset.exchange },
    { label: 'Status', value: asset.status.toUpperCase() },
    { label: 'Tradable', value: asset.tradable ? 'Yes' : 'No' },
    { label: 'Marginable', value: asset.marginable ? 'Yes' : 'No' },
    { label: 'Shortable', value: asset.shortable ? 'Yes' : 'No' },
    { label: 'Easy to Borrow', value: asset.easy_to_borrow ? 'Yes' : 'No' },
    { label: 'Fractionable', value: asset.fractionable ? 'Yes' : 'No' },
  ];

  return (
    <div className="space-y-6">
      {/* Asset Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{asset.symbol}</CardTitle>
              <p className="mt-1 text-muted-foreground">{asset.name}</p>
            </div>
            <Badge
              className={
                asset.asset_class === 'us_equity'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : asset.asset_class === 'us_option'
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    : asset.asset_class === 'crypto'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }
            >
              {asset.asset_class.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {detailsData.map((item, index) => (
              <div key={index} className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {item.label}
                </p>
                <p className="text-base">{item.value}</p>
              </div>
            ))}
          </div>

          {asset.maintenance_margin_requirement && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Margin Requirements</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Maintenance Margin
                    </p>
                    <p className="text-base">
                      {(asset.maintenance_margin_requirement * 100).toFixed(2)}%
                    </p>
                  </div>
                  {asset.margin_requirement_long && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Long Margin
                      </p>
                      <p className="text-base">
                        {asset.margin_requirement_long}
                      </p>
                    </div>
                  )}
                  {asset.margin_requirement_short && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Short Margin
                      </p>
                      <p className="text-base">
                        {asset.margin_requirement_short}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator className="my-6" />
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Created: {new Date(asset.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Updated: {new Date(asset.updated_at).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Main Assets Page Component
const AssetsPage: React.FC = () => {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const handleAssetSelect = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedAsset(null);
  }, []);

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
          {selectedAsset ? (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          ) : null}
        </PageActions>
      }
    >
      <PageContent>
        <div className="space-y-8">
          {selectedAsset ? (
            <AssetDetails assetId={selectedAsset.id} />
          ) : (
            <AssetTable onAssetSelect={handleAssetSelect} />
          )}
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default AssetsPage;
