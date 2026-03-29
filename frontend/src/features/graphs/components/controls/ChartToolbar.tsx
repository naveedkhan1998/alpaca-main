import React from 'react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { getIsGuest } from 'src/features/auth/authSlice';
import {
  setTimeframe,
  setChartType,
  setShowVolume,
  setAutoRefresh,
  selectTimeframe,
  selectChartType,
  selectShowVolume,
  selectAutoRefresh,
  selectReplayEnabled,
  setReplayEnabled,
} from '../../graphSlice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Clock,
  BarChart2,
  BarChart,
  AreaChart,
  LineChart,
  Activity,
  ChevronDown,
  LayoutTemplate,
  Settings2,
  FunctionSquare,
} from 'lucide-react';
import type { SeriesType } from 'lightweight-charts';
import { timeframeOptions } from '@/lib/constants';
import { useIndicatorUI } from '../../context';
import { useRequireAuth } from '@/hooks/useRequireAuth';

const chartTypeOptions: {
  value: SeriesType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'Candlestick',
    label: 'Candlesticks',
    icon: <BarChart2 className="w-4 h-4" />,
  },
  { value: 'Line', label: 'Line', icon: <LineChart className="w-4 h-4" /> },
  {
    value: 'Area',
    label: 'Area',
    icon: <AreaChart className="w-4 h-4" />,
  },
  {
    value: 'Bar',
    label: 'Bars',
    icon: <BarChart className="w-4 h-4" />,
  },
  {
    value: 'Baseline',
    label: 'Baseline',
    icon: <Activity className="w-4 h-4" />,
  },
];

const presetOptions = [
  {
    id: 'classic',
    label: 'Classic',
    icon: <BarChart2 className="w-4 h-4" />,
    description: 'Candlesticks + Volume',
  },
  {
    id: 'clean',
    label: 'Clean',
    icon: <LineChart className="w-4 h-4" />,
    description: 'Line chart only',
  },
  {
    id: 'baseline',
    label: 'Baseline',
    icon: <Activity className="w-4 h-4" />,
    description: 'Baseline chart',
  },
];

export default function ChartToolbar() {
  const dispatch = useAppDispatch();
  const timeframe = useAppSelector(selectTimeframe);
  const chartType = useAppSelector(selectChartType);
  const showVolume = useAppSelector(selectShowVolume);
  const autoRefresh = useAppSelector(selectAutoRefresh);
  const replayEnabled = useAppSelector(selectReplayEnabled);
  const isGuest = useAppSelector(getIsGuest);
  const requireAuth = useRequireAuth();

  // Use indicator UI context for modal management
  const { instances, openSelector, clearAll } = useIndicatorUI();

  const applyPreset = (preset: 'classic' | 'clean' | 'baseline') => {
    switch (preset) {
      case 'classic':
        dispatch(setChartType('Candlestick'));
        dispatch(setShowVolume(true));
        break;
      case 'clean':
        dispatch(setChartType('Line'));
        dispatch(setShowVolume(false));
        break;
      case 'baseline':
        dispatch(setChartType('Baseline'));
        dispatch(setShowVolume(false));
        break;
    }
  };

  const handleAutoRefreshChange = (value: boolean) => {
    if (!requireAuth('enable live updates')) return;
    if (isGuest) return;
    dispatch(setAutoRefresh(value));
  };

  return (
    <>
      <div className="flex items-center gap-2 p-2 px-4 overflow-x-auto border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Left Group: View Controls */}
        <div className="flex items-center gap-1">
          {/* Presets Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <LayoutTemplate className="w-4 h-4" />
                <HiChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Quick Presets</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {presetOptions.map(preset => (
                <DropdownMenuItem
                  key={preset.id}
                  onClick={() =>
                    applyPreset(preset.id as 'classic' | 'clean' | 'baseline')
                  }
                  className="flex items-center gap-2"
                >
                  {preset.icon}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{preset.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {preset.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-4 bg-border/50 mx-1" />

          {/* Timeframe Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1.5 font-medium"
              >
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs">
                  {timeframeOptions.find(t => t.value === timeframe)?.label ||
                    `${timeframe}m`}
                </span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              <DropdownMenuLabel>Timeframe</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {timeframeOptions.map(tf => (
                <DropdownMenuItem
                  key={tf.value}
                  onClick={() => dispatch(setTimeframe(tf.value))}
                  className={timeframe === tf.value ? 'bg-accent' : ''}
                >
                  {tf.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Chart Style Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
                {chartTypeOptions.find(t => t.value === chartType)?.icon}
                <span className="hidden text-xs font-medium sm:inline">
                  {chartTypeOptions.find(t => t.value === chartType)?.label}
                </span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel>Chart Style</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {chartTypeOptions.map(type => (
                <DropdownMenuItem
                  key={type.value}
                  onClick={() => dispatch(setChartType(type.value))}
                  className={chartType === type.value ? 'bg-accent' : ''}
                >
                  {type.icon}
                  {type.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="w-px h-4 bg-border/50 mx-1" />

        {/* Center/Right Group: Analysis */}
        <div className="flex items-center gap-1">
          {/* Indicators Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1.5 relative text-muted-foreground hover:text-foreground"
            onClick={openSelector}
          >
            <FunctionSquare className="w-4 h-4" />
            <span className="hidden text-xs font-medium sm:inline">
              Indicators
            </span>
            {instances.length > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-primary text-primary-foreground shadow-sm"
              >
                {instances.length}
              </Badge>
            )}
          </Button>

          {/* Settings Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden text-xs font-medium sm:inline">
                  Settings
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Display
                  </h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-volume" className="text-sm">
                      Show Volume
                    </Label>
                    <Switch
                      id="show-volume"
                      checked={showVolume}
                      onCheckedChange={show => dispatch(setShowVolume(show))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Features
                  </h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="candle-replay" className="text-sm">
                      Candle Replay
                    </Label>
                    <Switch
                      id="candle-replay"
                      checked={replayEnabled}
                      onCheckedChange={value =>
                        dispatch(setReplayEnabled(value))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-refresh" className="text-sm">
                      Live Data
                    </Label>
                    <Switch
                      id="auto-refresh"
                      checked={autoRefresh}
                      onCheckedChange={handleAutoRefreshChange}
                    />
                  </div>
                </div>

                {instances.length > 0 && (
                  <>
                    <Separator />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={clearAll}
                      className="w-full"
                    >
                      Clear All Indicators
                    </Button>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Live Data Indicator */}
        {autoRefresh && (
          <div className="ml-auto flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold tracking-wider text-success uppercase border border-success/20 rounded-full bg-success/5">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            LIVE
          </div>
        )}
      </div>
    </>
  );
}

function HiChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return <ChevronDown {...props} />;
}
