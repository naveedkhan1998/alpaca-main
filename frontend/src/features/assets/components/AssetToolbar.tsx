import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Search, RefreshCw, Grid3X3, List, Filter, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  clearFilters,
  setAssetClassFilter,
  setExchangeFilter,
  setMarginableFilter,
  setShortableFilter,
  setFractionableFilter,
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
    exchangeFilter,
    tradableFilter,
    marginableFilter,
    shortableFilter,
    fractionableFilter,
    viewMode,
  } = useAppSelector(s => s.asset);
  const { data: stats } = useGetAssetStatsQuery() as {
    data: AssetStats | undefined;
  };
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (assetClassFilter) count++;
    if (exchangeFilter) count++;
    if (tradableFilter) count++;
    if (marginableFilter) count++;
    if (shortableFilter) count++;
    if (fractionableFilter) count++;
    return count;
  }, [
    assetClassFilter,
    exchangeFilter,
    tradableFilter,
    marginableFilter,
    shortableFilter,
    fractionableFilter,
  ]);

  const getAssetClassName = (value: string) => {
    return stats?.asset_classes?.find(ac => ac.value === value)?.label || value;
  };

  const getExchangeName = (value: string) => {
    return stats?.exchanges?.find(ex => ex.value === value)?.label || value;
  };

  const BooleanFilterSelect = ({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (val: string) => void;
    label: string;
  }) => (
    <Select
      value={value || 'all'}
      onValueChange={v => onChange(v === 'all' ? '' : v)}
    >
      <SelectTrigger className="w-32 h-8 text-sm">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        <SelectItem value="true">Yes</SelectItem>
        <SelectItem value="false">No</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      {/* Search and Primary Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input
            placeholder="Search symbols or names..."
            value={quickFilterText}
            onChange={e => dispatch(setQuickFilterText(e.target.value))}
            className="h-9 pl-9 pr-9"
          />
          {quickFilterText && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute w-7 h-7 p-0 -translate-y-1/2 right-1 top-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => dispatch(setQuickFilterText(''))}
            >
              <X className="w-3 h-3" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Filter Button */}
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden h-9">
                <Filter className="w-4 h-4" />
                <span className="ml-2">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85dvh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Filter instruments</SheetDescription>
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
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {stats?.asset_classes?.map(ac => (
                        <SelectItem key={ac.value} value={ac.value}>
                          {ac.label} ({ac.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Exchange</label>
                  <Select
                    value={exchangeFilter || 'all'}
                    onValueChange={v =>
                      dispatch(setExchangeFilter(v === 'all' ? '' : v))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {stats?.exchanges?.map(ex => (
                        <SelectItem key={ex.value} value={ex.value}>
                          {ex.label} ({ex.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tradable</label>
                    <Select
                      value={tradableFilter || 'all'}
                      onValueChange={v =>
                        dispatch(setTradableFilter(v === 'all' ? '' : v))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Marginable</label>
                    <Select
                      value={marginableFilter || 'all'}
                      onValueChange={v =>
                        dispatch(setMarginableFilter(v === 'all' ? '' : v))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Shortable</label>
                    <Select
                      value={shortableFilter || 'all'}
                      onValueChange={v =>
                        dispatch(setShortableFilter(v === 'all' ? '' : v))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fractionable</label>
                    <Select
                      value={fractionableFilter || 'all'}
                      onValueChange={v =>
                        dispatch(setFractionableFilter(v === 'all' ? '' : v))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => {
                    dispatch(clearFilters());
                    setFilterSheetOpen(false);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <TooltipProvider>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => dispatch(setViewMode('table'))}
                    className="w-8 h-8 p-0"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Table</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => dispatch(setViewMode('grid'))}
                    className="w-8 h-8 p-0"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Grid</TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="w-8 h-8 p-0 ml-1"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="flex-wrap items-center hidden gap-3 lg:flex">
        <Select
          value={assetClassFilter || 'all'}
          onValueChange={v =>
            dispatch(setAssetClassFilter(v === 'all' ? '' : v))
          }
        >
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="Asset Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {stats?.asset_classes?.map(ac => (
              <SelectItem key={ac.value} value={ac.value}>
                {ac.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={exchangeFilter || 'all'}
          onValueChange={v => dispatch(setExchangeFilter(v === 'all' ? '' : v))}
        >
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue placeholder="Exchange" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exchanges</SelectItem>
            {stats?.exchanges?.map(ex => (
              <SelectItem key={ex.value} value={ex.value}>
                {ex.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <BooleanFilterSelect
          label="Tradable"
          value={tradableFilter}
          onChange={v => dispatch(setTradableFilter(v))}
        />
        <BooleanFilterSelect
          label="Marginable"
          value={marginableFilter}
          onChange={v => dispatch(setMarginableFilter(v))}
        />
        <BooleanFilterSelect
          label="Shortable"
          value={shortableFilter}
          onChange={v => dispatch(setShortableFilter(v))}
        />
        <BooleanFilterSelect
          label="Fractionable"
          value={fractionableFilter}
          onChange={v => dispatch(setFractionableFilter(v))}
        />

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch(clearFilters())}
            className="h-8 text-xs text-muted-foreground"
          >
            Clear
          </Button>
        )}

        {typeof stats?.total_count === 'number' && (
          <span className="ml-auto text-sm text-muted-foreground">
            {stats.total_count.toLocaleString()} instruments
          </span>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 lg:hidden">
          {assetClassFilter && (
            <Badge variant="secondary" className="h-6 gap-1">
              {getAssetClassName(assetClassFilter)}
              <button
                onClick={() => dispatch(setAssetClassFilter(''))}
                className="ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {exchangeFilter && (
            <Badge variant="secondary" className="h-6 gap-1">
              {getExchangeName(exchangeFilter)}
              <button
                onClick={() => dispatch(setExchangeFilter(''))}
                className="ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {tradableFilter && (
            <Badge variant="secondary" className="h-6 gap-1">
              {tradableFilter === 'true' ? 'Tradable' : 'Not Tradable'}
              <button
                onClick={() => dispatch(setTradableFilter(''))}
                className="ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {marginableFilter && (
            <Badge variant="secondary" className="h-6 gap-1">
              {marginableFilter === 'true' ? 'Marginable' : 'Not Marginable'}
              <button
                onClick={() => dispatch(setMarginableFilter(''))}
                className="ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {shortableFilter && (
            <Badge variant="secondary" className="h-6 gap-1">
              {shortableFilter === 'true' ? 'Shortable' : 'Not Shortable'}
              <button
                onClick={() => dispatch(setShortableFilter(''))}
                className="ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {fractionableFilter && (
            <Badge variant="secondary" className="h-6 gap-1">
              {fractionableFilter === 'true'
                ? 'Fractionable'
                : 'Not Fractionable'}
              <button
                onClick={() => dispatch(setFractionableFilter(''))}
                className="ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetToolbar;
