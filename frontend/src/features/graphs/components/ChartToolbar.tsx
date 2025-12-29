import React from 'react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
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
} from '../graphSlice';
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
  HiClock,
  HiChartBar,
  HiChartSquareBar,
  HiPresentationChartLine,
  HiTrendingUp,
  HiBeaker,
  HiOutlineChartPie,
  HiAdjustments,
  HiChevronDown,
} from 'react-icons/hi';
import type { SeriesType } from 'lightweight-charts';
import { timeframeOptions } from '@/lib/constants';
import { useIndicatorUI } from '../context';

const chartTypeOptions: {
  value: SeriesType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'Candlestick',
    label: 'Candlesticks',
    icon: <HiChartBar className="w-4 h-4" />,
  },
  { value: 'Line', label: 'Line', icon: <HiTrendingUp className="w-4 h-4" /> },
  {
    value: 'Area',
    label: 'Area',
    icon: <HiPresentationChartLine className="w-4 h-4" />,
  },
  {
    value: 'Bar',
    label: 'Bars',
    icon: <HiChartSquareBar className="w-4 h-4" />,
  },
  {
    value: 'Baseline',
    label: 'Baseline',
    icon: <HiBeaker className="w-4 h-4" />,
  },
];

const presetOptions = [
  {
    id: 'classic',
    label: 'Classic',
    icon: <HiChartBar className="w-4 h-4" />,
    description: 'Candlesticks + Volume',
  },
  {
    id: 'clean',
    label: 'Clean',
    icon: <HiTrendingUp className="w-4 h-4" />,
    description: 'Line chart only',
  },
  {
    id: 'baseline',
    label: 'Baseline',
    icon: <HiBeaker className="w-4 h-4" />,
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

  return (
    <>
      <div className="flex items-center gap-1 p-2 overflow-x-auto border-b bg-muted/30">
        <div className="flex items-center flex-shrink-0 gap-1">
          {/* Presets Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
                <HiAdjustments className="w-4 h-4" />
                <span className="hidden text-xs font-medium sm:inline">
                  Presets
                </span>
                <HiChevronDown className="w-3 h-3" />
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
                  className="flex items-center gap-2 hover:bg-accent/80 focus:bg-accent/80"
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

          <Separator orientation="vertical" className="hidden h-6 sm:block" />

          {/* Timeframe Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
                <HiClock className="w-4 h-4" />
                <span className="text-xs font-medium">
                  {timeframeOptions.find(t => t.value === timeframe)?.label ||
                    `${timeframe}m`}
                </span>
                <HiChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              <DropdownMenuLabel>Timeframe</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {timeframeOptions.map(tf => (
                <DropdownMenuItem
                  key={tf.value}
                  onClick={() => dispatch(setTimeframe(tf.value))}
                  className={`hover:bg-accent/80 focus:bg-accent/80 ${timeframe === tf.value ? 'bg-accent' : ''}`}
                >
                  {tf.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="hidden h-6 sm:block" />

          {/* Chart Style Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
                {chartTypeOptions.find(t => t.value === chartType)?.icon}
                <span className="hidden text-xs font-medium sm:inline">
                  {chartTypeOptions.find(t => t.value === chartType)?.label}
                </span>
                <HiChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel>Chart Style</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {chartTypeOptions.map(type => (
                <DropdownMenuItem
                  key={type.value}
                  onClick={() => dispatch(setChartType(type.value))}
                  className={`flex items-center gap-2 hover:bg-accent/80 focus:bg-accent/80 ${chartType === type.value ? 'bg-accent' : ''}`}
                >
                  {type.icon}
                  {type.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="hidden h-6 sm:block" />

          {/* Indicators Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1.5 relative"
            onClick={openSelector}
          >
            <HiOutlineChartPie className="w-4 h-4" />
            <span className="hidden text-xs font-medium sm:inline">
              Indicators
            </span>
            {instances.length > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-primary text-primary-foreground"
              >
                {instances.length}
              </Badge>
            )}
          </Button>

          <Separator orientation="vertical" className="hidden h-6 sm:block" />

          {/* Settings Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1.5">
                <HiAdjustments className="w-4 h-4" />
                <span className="hidden text-xs font-medium sm:inline">
                  Settings
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <div className="space-y-3">
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

                <div className="flex items-center justify-between">
                  <Label htmlFor="candle-replay" className="text-sm">
                    Candle Replay
                  </Label>
                  <Switch
                    id="candle-replay"
                    checked={replayEnabled}
                    onCheckedChange={value => dispatch(setReplayEnabled(value))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-refresh" className="text-sm">
                    Live Data
                  </Label>
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={auto => dispatch(setAutoRefresh(auto))}
                  />
                </div>

                {instances.length > 0 && (
                  <>
                    <Separator />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearAll}
                      className="w-full text-destructive hover:text-destructive"
                    >
                      Clear All Indicators
                    </Button>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Live Data Indicator */}
          {autoRefresh && (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-success">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              LIVE
            </div>
          )}
        </div>
      </div>
    </>
  );
}
