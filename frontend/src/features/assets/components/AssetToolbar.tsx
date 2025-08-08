import React from 'react';
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
import { Card } from '@/components/ui/card';
import {
  Search,
  RefreshCw,
  Grid3X3,
  Rows,
  SlidersHorizontal,
  MonitorSmartphone,
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
import { useDebounce } from '@/hooks/useDebounce';
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
  const debounced = useDebounce(quickFilterText, 150);
  const { data: stats } = useGetAssetStatsQuery() as {
    data: AssetStats | undefined;
  };

  return (
    <Card className="p-3 sm:p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute w-4 h-4 left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search by symbol or name..."
              value={quickFilterText}
              onChange={e => dispatch(setQuickFilterText(e.target.value))}
              className="pl-10"
            />
            {debounced && (
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                Press Enter to refine
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
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

        <div className="flex flex-wrap items-center gap-2">
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

          <div className="ml-auto flex items-center gap-2 text-xs">
            {typeof stats?.total_count === 'number' && (
              <Badge variant="secondary">Total: {stats.total_count}</Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AssetToolbar;
