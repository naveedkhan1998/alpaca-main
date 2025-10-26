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
  Filter,
  X,
  BarChart3,
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
    <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
      <div className="p-4 space-y-4">
        {/* Search and Primary Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute w-4 h-4 left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search symbols or names..."
              value={quickFilterText}
              onChange={e => dispatch(setQuickFilterText(e.target.value))}
              className="pl-10 h-10 bg-background/50 border-input/50 focus:border-primary/50"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Filter Button */}
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="relative lg:hidden h-10 gap-2 border-input/50 hover:bg-accent/50"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge className="flex items-center justify-center h-5 px-1.5 min-w-5 bg-primary text-primary-foreground text-xs font-medium">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80dvh]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5" />
                    Filter Assets
                  </SheetTitle>
                  <SheetDescription>
                    Refine your asset search with these filters
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">
                      Asset Class
                    </label>
                    <Select
                      value={assetClassFilter || 'all'}
                      onValueChange={v =>
                        dispatch(setAssetClassFilter(v === 'all' ? '' : v))
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="All Asset Classes" />
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
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground">
                      Trading Status
                    </label>
                    <Select
                      value={tradableFilter || 'all'}
                      onValueChange={v =>
                        dispatch(setTradableFilter(v === 'all' ? '' : v))
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="All Assets" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assets</SelectItem>
                        <SelectItem value="true">Tradable Only</SelectItem>
                        <SelectItem value="false">Non-tradable Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-4 border-t">
                    <Button
                      variant="outline"
                      className="w-full h-10"
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
              <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => dispatch(setViewMode('table'))}
                      className="h-8 w-8 p-0"
                    >
                      <Rows className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Table view</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => dispatch(setViewMode('grid'))}
                      className="h-8 w-8 p-0"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Grid view</TooltipContent>
                </Tooltip>
              </div>

              <Separator orientation="vertical" className="h-6 mx-2" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      dispatch(
                        setDensity(
                          density === 'comfortable' ? 'compact' : 'comfortable'
                        )
                      )
                    }
                    className="h-8 w-8 p-0"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {density === 'comfortable'
                    ? 'Compact view'
                    : 'Comfortable view'}
                </TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="h-8 w-8 p-0"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </TooltipProvider>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="flex-wrap items-center hidden gap-3 lg:flex">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <Select
              value={assetClassFilter || 'all'}
              onValueChange={v =>
                dispatch(setAssetClassFilter(v === 'all' ? '' : v))
              }
            >
              <SelectTrigger className="w-48 h-9">
                <SelectValue placeholder="All Asset Classes" />
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
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="All Assets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="true">Tradable Only</SelectItem>
                <SelectItem value="false">Non-tradable Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch(clearFilters())}
              className="h-9 px-3 text-muted-foreground hover:text-foreground"
            >
              Clear filters
            </Button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {typeof stats?.total_count === 'number' && (
              <Badge
                variant="secondary"
                className="bg-muted/50 text-muted-foreground border-0"
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                {stats.total_count.toLocaleString()} assets
              </Badge>
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
              <Badge
                variant="secondary"
                className="gap-1.5 h-7 px-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              >
                <span className="font-medium">
                  {getAssetClassName(assetClassFilter)}
                </span>
                <button
                  onClick={() => dispatch(setAssetClassFilter(''))}
                  className="ml-1 rounded-full hover:bg-primary/20 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {tradableFilter && (
              <Badge
                variant="secondary"
                className="gap-1.5 h-7 px-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              >
                <span className="font-medium">
                  {tradableFilter === 'true' ? 'Tradable' : 'Non-tradable'}
                </span>
                <button
                  onClick={() => dispatch(setTradableFilter(''))}
                  className="ml-1 rounded-full hover:bg-primary/20 p-0.5"
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
