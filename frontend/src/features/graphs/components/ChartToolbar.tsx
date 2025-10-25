import React, { useState } from 'react';
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
  addIndicator,
  removeIndicator,
  selectActiveIndicators,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  HiClock,
  HiChartBar,
  HiChartSquareBar,
  HiPresentationChartLine,
  HiTrendingUp,
  HiBeaker,
  HiViewGrid,
  HiOutlineChartPie,
  HiAdjustments,
  HiLightningBolt,
  HiPlay,
  HiCog,
  HiChevronDown,
} from 'react-icons/hi';
import type { SeriesType } from 'lightweight-charts';
import IndicatorSettingsDialog from './IndicatorSettingsDialog';

const timeframeOptions = [
  { value: 1, label: '1m' },
  { value: 5, label: '5m' },
  { value: 15, label: '15m' },
  { value: 60, label: '1h' },
  { value: 240, label: '4h' },
  { value: 1440, label: '1D' },
];

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

const INDICATORS = [
  {
    name: 'RSI',
    label: 'Relative Strength Index',
    icon: <HiOutlineChartPie className="w-4 h-4" />,
  },
  {
    name: 'BollingerBands',
    label: 'Bollinger Bands',
    icon: <HiViewGrid className="w-4 h-4" />,
  },
  {
    name: 'EMA',
    label: 'Exponential Moving Average',
    icon: <HiTrendingUp className="w-4 h-4" />,
  },
  {
    name: 'ATR',
    label: 'Average True Range',
    icon: <HiChartSquareBar className="w-4 h-4" />,
  },
] as const;

export default function ChartToolbar() {
  const dispatch = useAppDispatch();
  const timeframe = useAppSelector(selectTimeframe);
  const chartType = useAppSelector(selectChartType);
  const showVolume = useAppSelector(selectShowVolume);
  const autoRefresh = useAppSelector(selectAutoRefresh);
  const activeIndicators = useAppSelector(selectActiveIndicators);
  const replayEnabled = useAppSelector(selectReplayEnabled);

  const [indicatorsSheetOpen, setIndicatorsSheetOpen] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState<{
    isOpen: boolean;
    indicator: string | null;
  }>({ isOpen: false, indicator: null });

  const handleIndicatorToggle = (indicatorName: string, checked: boolean) => {
    if (checked) dispatch(addIndicator(indicatorName));
    else dispatch(removeIndicator(indicatorName));
  };

  const clearIndicators = () => {
    activeIndicators.forEach(ind => dispatch(removeIndicator(ind)));
  };

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

  const handleSettingsClick = (e: React.MouseEvent, indicatorName: string) => {
    e.stopPropagation();
    setSettingsDialog({ isOpen: true, indicator: indicatorName });
  };

  const handleCloseSettings = () => {
    setSettingsDialog({ isOpen: false, indicator: null });
  };

  return (
    <>
      <div className="flex items-center gap-1 p-2 overflow-x-auto border-b shadow-sm bg-card/80 backdrop-blur-sm border-border/40 scrollbar-hide">
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

          {/* Indicators Sheet */}
          <Sheet
            open={indicatorsSheetOpen}
            onOpenChange={setIndicatorsSheetOpen}
          >
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 gap-1.5 relative"
              >
                <HiOutlineChartPie className="w-4 h-4" />
                <span className="hidden text-xs font-medium sm:inline">
                  Indicators
                </span>
                {activeIndicators.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-primary text-primary-foreground"
                  >
                    {activeIndicators.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <HiOutlineChartPie className="w-5 h-5" />
                  Technical Indicators
                  {activeIndicators.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {activeIndicators.length} active
                    </Badge>
                  )}
                </SheetTitle>
                <SheetDescription>
                  Add technical indicators to your chart
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-3">
                {INDICATORS.map(indicator => (
                  <div
                    key={indicator.name}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all border ${
                      activeIndicators.includes(indicator.name)
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-muted/30 border-transparent hover:bg-muted/50'
                    }`}
                  >
                    <Label
                      htmlFor={`indicator-${indicator.name}`}
                      className="flex items-center flex-1 min-w-0 gap-2.5 text-sm font-semibold cursor-pointer text-foreground"
                    >
                      <span className="shrink-0 text-muted-foreground">
                        {indicator.icon}
                      </span>
                      <span className="truncate">{indicator.label}</span>
                    </Label>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={e => handleSettingsClick(e, indicator.name)}
                        className="p-0 transition-colors h-7 w-7 hover:bg-primary/10 hover:text-primary"
                        title={`Configure ${indicator.label}`}
                      >
                        <HiCog className="w-4 h-4" />
                      </Button>
                      <Switch
                        id={`indicator-${indicator.name}`}
                        checked={activeIndicators.includes(indicator.name)}
                        onCheckedChange={checked =>
                          handleIndicatorToggle(indicator.name, checked)
                        }
                        className="shrink-0"
                      />
                    </div>
                  </div>
                ))}
                {activeIndicators.length > 0 && (
                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearIndicators}
                      className="w-full text-sm font-medium transition-colors h-9 hover:bg-destructive/10 hover:text-destructive"
                    >
                      Clear all indicators
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

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
            <PopoverContent align="end" className="w-64">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="show-volume"
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  >
                    <HiChartSquareBar className="w-4 h-4 text-muted-foreground" />
                    Show Volume
                  </Label>
                  <Switch
                    id="show-volume"
                    checked={showVolume}
                    onCheckedChange={show => dispatch(setShowVolume(show))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="candle-replay"
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  >
                    <HiPlay className="w-4 h-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>Candle Replay</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 w-fit"
                      >
                        Beta
                      </Badge>
                    </div>
                  </Label>
                  <Switch
                    id="candle-replay"
                    checked={replayEnabled}
                    onCheckedChange={value => dispatch(setReplayEnabled(value))}
                  />
                </div>

                <div
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    autoRefresh
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-muted/30 border-transparent'
                  }`}
                >
                  <Label
                    htmlFor="auto-refresh"
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  >
                    <HiLightningBolt
                      className={`w-4 h-4 ${
                        autoRefresh
                          ? 'text-emerald-500 animate-pulse'
                          : 'text-muted-foreground'
                      }`}
                    />
                    Live Data
                  </Label>
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={auto => dispatch(setAutoRefresh(auto))}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Live Data Indicator */}
          {autoRefresh && (
            <>
              <Separator
                orientation="vertical"
                className="hidden h-6 sm:block"
              />
              <div className="flex items-center gap-2 px-2 py-1 border rounded-md bg-emerald-500/10 border-emerald-500/20">
                <div className="relative">
                  <div className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  LIVE
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Indicator Settings Dialog */}
      {settingsDialog.indicator && (
        <IndicatorSettingsDialog
          indicator={
            settingsDialog.indicator as
              | 'RSI'
              | 'ATR'
              | 'EMA'
              | 'BollingerBands'
              | 'MACD'
          }
          isOpen={settingsDialog.isOpen}
          onClose={handleCloseSettings}
        />
      )}
    </>
  );
}
