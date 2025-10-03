import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import {
  Search,
  RefreshCw,
  Grid3X3,
  Rows,
  SlidersHorizontal,
  MonitorSmartphone,
  Filter,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  clearFilters,
  setAssetClassFilter,
  setDensity,
  setQuickFilterText,
  setTradableFilter,
  setViewMode,
} from '../assetSlice';
import { useGetAssetStatsQuery } from '@/api/assetService';

type AssetStatItem = { value: string; label: string; count: number };
type AssetStats = {
  asset_classes?: AssetStatItem[];
  exchanges?: AssetStatItem[];
  total_count?: number;
};

type Props = { onRefresh: () => void; refreshing?: boolean };

export const AssetToolbar: React.FC<Props> = ({ onRefresh, refreshing }) => {
  const dispatch = useAppDispatch();
  const {
    quickFilterText,
    assetClassFilter,
    tradableFilter,
    viewMode,
    density,
  } = useAppSelector(s => s.asset);
  const { data: stats } = useGetAssetStatsQuery() as {
    data: AssetStats | undefined;
  };
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (assetClassFilter) count++;
    if (tradableFilter) count++;
    return count;
  }, [assetClassFilter, tradableFilter]);

  const getAssetClassName = (value: string) => {
    return stats?.asset_classes?.find(ac => ac.value === value)?.label || value;
  };

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col gap-3">
        {/* Search and View Controls */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search by symbol or name..."
              value={quickFilterText}
              onChange={e => dispatch(setQuickFilterText(e.target.value))}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile Filter Button */}
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="relative lg:hidden"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="flex items-center justify-center h-5 p-1 ml-2 min-w-5 bg-primary text-primary-foreground">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh]">
                <SheetHeader>
                  <SheetTitle>Filter Assets</SheetTitle>
                  <SheetDescription>
                    Refine your asset search with these filters
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Asset Class</label>
                    <Select
                      value={assetClassFilter || 'all'}
                      onValueChange={v =>
                        dispatch(setAssetClassFilter(v === 'all' ? '' : v))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Asset Class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Asset Classes</SelectItem>
                        {stats?.asset_classes?.map(ac => (
                          <SelectItem key={ac.value} value={ac.value}>
                            {ac.label} ({ac.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Tradable Status
                    </label>
                    <Select
                      value={tradableFilter || 'all'}
                      onValueChange={v =>
                        dispatch(setTradableFilter(v === 'all' ? '' : v))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tradable" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Tradable</SelectItem>
                        <SelectItem value="false">Non-tradable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        dispatch(clearFilters());
                        setFilterSheetOpen(false);
                      }}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => dispatch(setViewMode('table'))}
                  >
                    <Rows className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Table view</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => dispatch(setViewMode('grid'))}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Grid view</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-6" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      dispatch(
                        setDensity(
                          density === 'comfortable' ? 'compact' : 'comfortable'
                        )
                      )
                    }
                  >
                    <MonitorSmartphone className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {density === 'comfortable'
                    ? 'Compact rows'
                    : 'Comfortable rows'}
                </TooltipContent>
              </Tooltip>
              <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </TooltipProvider>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="flex-wrap items-center hidden gap-2 lg:flex">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <Select
              value={assetClassFilter || 'all'}
              onValueChange={v =>
                dispatch(setAssetClassFilter(v === 'all' ? '' : v))
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Asset Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Asset Classes</SelectItem>
                {stats?.asset_classes?.map(ac => (
                  <SelectItem key={ac.value} value={ac.value}>
                    {ac.label} ({ac.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={tradableFilter || 'all'}
              onValueChange={v =>
                dispatch(setTradableFilter(v === 'all' ? '' : v))
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tradable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">Tradable</SelectItem>
                <SelectItem value="false">Non-tradable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(clearFilters())}
          >
            Clear filters
          </Button>

          <div className="flex items-center gap-2 ml-auto text-xs">
            {typeof stats?.total_count === 'number' && (
              <Badge variant="secondary">Total: {stats.total_count}</Badge>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Active filters:
            </span>
            {assetClassFilter && (
              <Badge variant="secondary" className="gap-1">
                {getAssetClassName(assetClassFilter)}
                <button
                  onClick={() => dispatch(setAssetClassFilter(''))}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {tradableFilter && (
              <Badge variant="secondary" className="gap-1">
                {tradableFilter === 'true' ? 'Tradable' : 'Non-tradable'}
                <button
                  onClick={() => dispatch(setTradableFilter(''))}
                  className="ml-1 rounded-full hover:bg-muted-foreground/20"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default AssetToolbar;
