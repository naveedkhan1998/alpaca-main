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
} from '../graphSlice';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  HiClock,
  HiChartBar,
  HiTrendingUp,
  HiLightningBolt,
  HiViewGrid,
  HiChartSquareBar,
  HiAdjustments,
  HiBeaker,
  HiPresentationChartLine,
  HiOutlineChartPie,
  HiOutlineCurrencyDollar,
  HiOutlineScale,
  HiOutlineTrendingUp,
  HiInformationCircle,
} from 'react-icons/hi';
import { SeriesType } from 'lightweight-charts';

export default function ChartControls() {
  const dispatch = useAppDispatch();
  const timeframe = useAppSelector(selectTimeframe);
  const chartType = useAppSelector(selectChartType);
  const showVolume = useAppSelector(selectShowVolume);
  const autoRefresh = useAppSelector(selectAutoRefresh);
  const activeIndicators = useAppSelector(selectActiveIndicators);

  const timeframeOptions = [
    { value: 1, label: '1m' },
    { value: 5, label: '5m' },
    { value: 15, label: '15m' },
    { value: 60, label: '1h' },
    { value: 240, label: '4h' },
    { value: 1440, label: '1D' },
  ];

  const chartTypes: {
    value: SeriesType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: 'Candlestick',
      label: 'Candlesticks',
      icon: <HiChartBar className="w-4 h-4" />,
    },
    {
      value: 'Line',
      label: 'Line',
      icon: <HiTrendingUp className="w-4 h-4" />,
    },
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

  const indicators = [
    {
      name: 'RSI',
      label: 'Relative Strength Index',
      icon: <HiOutlineChartPie className="w-4 h-4" />,
    },
    {
      name: 'BollingerBands',
      label: 'Bollinger Bands',
      icon: <HiOutlineScale className="w-4 h-4" />,
    },
    {
      name: 'EMA',
      label: 'Exponential Moving Average',
      icon: <HiOutlineTrendingUp className="w-4 h-4" />,
    },
    {
      name: 'ATR',
      label: 'Average True Range',
      icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
    },
  ];

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

  return (
    <div className="space-y-3 scrollbar-hidden">
      {/* Live Status Banner - Mobile First */}
      {autoRefresh && (
        <Card className="shadow-sm border-green-500/30 bg-gradient-to-r from-green-500/10 via-green-400/10 to-green-500/10 backdrop-blur-sm">
          <CardContent className="px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center flex-1 min-w-0 gap-2">
                <div className="relative">
                  <div className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                <span className="text-xs font-medium text-green-400 truncate">
                  Live data active
                </span>
              </div>
              <Badge
                variant="secondary"
                className="text-xs text-green-400 bg-green-500/20 border-green-500/30 shrink-0"
              >
                LIVE
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips - Responsive */}
      <Card className="shadow-sm border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HiInformationCircle className="w-3 h-3 shrink-0" />
            <div className="overflow-hidden">
              <div className="hidden sm:block">
                <span>
                  Shortcuts:{' '}
                  <kbd className="px-1 py-0.5 rounded bg-muted mx-1 text-[10px]">
                    F
                  </kbd>{' '}
                  Fullscreen
                  <Separator
                    orientation="vertical"
                    className="inline-block h-3 mx-2"
                  />
                  <kbd className="px-1 py-0.5 rounded bg-muted mx-1 text-[10px]">
                    V
                  </kbd>{' '}
                  Volume
                  <Separator
                    orientation="vertical"
                    className="inline-block h-3 mx-2"
                  />
                  <kbd className="px-1 py-0.5 rounded bg-muted mx-1 text-[10px]">
                    C
                  </kbd>{' '}
                  Controls
                </span>
              </div>
              <div className="block sm:hidden text-[10px]">
                <span>Tap and hold chart for options</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Presets - Mobile Optimized */}
      <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="px-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <div className="p-1.5 border rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0">
              <HiAdjustments className="w-3 h-3" />
            </div>
            <span className="font-semibold text-card-foreground">Presets</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="justify-center h-8 gap-1 px-2 text-xs"
              onClick={() => applyPreset('classic')}
            >
              <HiChartBar className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Classic</span>
              <span className="sm:hidden">C</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="justify-center h-8 gap-1 px-2 text-xs"
              onClick={() => applyPreset('clean')}
            >
              <HiTrendingUp className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Clean</span>
              <span className="sm:hidden">Cl</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="justify-center h-8 gap-1 px-2 text-xs"
              onClick={() => applyPreset('baseline')}
            >
              <HiBeaker className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Base</span>
              <span className="sm:hidden">B</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeframe Section - Mobile Optimized */}
      <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="px-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <div className="p-1.5 border rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0">
              <HiClock className="w-3 h-3" />
            </div>
            <div className="flex items-center flex-1 min-w-0 gap-2">
              <span className="font-semibold text-card-foreground">
                Timeframe
              </span>
              {timeframe && (
                <Badge
                  variant="secondary"
                  className="ml-auto text-xs border bg-primary/10 text-primary border-primary/20 shrink-0"
                >
                  {timeframeOptions.find(t => t.value === timeframe)?.label ||
                    `${timeframe}m`}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-3 gap-1.5">
            {timeframeOptions.map(tf => (
              <Button
                key={tf.value}
                size="sm"
                variant={timeframe === tf.value ? 'default' : 'outline'}
                className="h-8 text-xs font-medium transition-all duration-200"
                onClick={() => dispatch(setTimeframe(tf.value))}
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chart Type Section - Mobile Grid */}
      <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="px-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <div className="p-1.5 border rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0">
              <HiViewGrid className="w-3 h-3" />
            </div>
            <span className="font-semibold text-card-foreground">
              Chart Style
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-1.5">
            {chartTypes.map(type => (
              <div
                key={type.value}
                className={`p-2 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                  chartType === type.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                }`}
                onClick={() => dispatch(setChartType(type.value))}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      chartType === type.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {type.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-semibold text-xs truncate ${
                        chartType === type.value
                          ? 'text-primary'
                          : 'text-card-foreground'
                      }`}
                    >
                      {type.label}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Indicators Section - Compact Mobile */}
      <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="px-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <div className="p-1.5 border rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0">
              <HiOutlineTrendingUp className="w-3 h-3" />
            </div>
            <span className="font-semibold text-card-foreground">
              Indicators
            </span>
            {activeIndicators.length > 0 && (
              <Badge className="ml-auto shrink-0" variant="secondary">
                {activeIndicators.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-1.5">
          {indicators.map(indicator => (
            <div
              key={indicator.name}
              className="flex items-center justify-between p-2 rounded-lg bg-background/50 min-h-[36px]"
            >
              <Label
                htmlFor={`indicator-${indicator.name}`}
                className="flex items-center flex-1 min-w-0 gap-2 text-xs font-medium cursor-pointer text-card-foreground"
              >
                <span className="shrink-0">{indicator.icon}</span>
                <span className="truncate">{indicator.label}</span>
              </Label>
              <Switch
                id={`indicator-${indicator.name}`}
                checked={activeIndicators.includes(indicator.name)}
                onCheckedChange={checked =>
                  handleIndicatorToggle(indicator.name, checked)
                }
                className="shrink-0"
              />
            </div>
          ))}
          {activeIndicators.length > 0 && (
            <div className="pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={clearIndicators}
                className="text-xs h-7"
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Section - Enhanced Live Feedback */}
      <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="px-3 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <div className="p-1.5 border rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0">
              <HiAdjustments className="w-3 h-3" />
            </div>
            <span className="font-semibold text-card-foreground">Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-background/50 min-h-[36px]">
            <Label
              htmlFor="show-volume"
              className="flex items-center flex-1 min-w-0 gap-2 text-xs font-medium cursor-pointer text-card-foreground"
            >
              <HiChartSquareBar className="w-3 h-3 text-muted-foreground shrink-0" />
              <span>Show Volume</span>
            </Label>
            <Switch
              id="show-volume"
              checked={showVolume}
              onCheckedChange={(show: boolean) => dispatch(setShowVolume(show))}
              className="shrink-0"
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-background/50 min-h-[36px]">
            <Label
              htmlFor="auto-refresh"
              className="flex items-center flex-1 min-w-0 gap-2 text-xs font-medium cursor-pointer text-card-foreground"
            >
              <HiLightningBolt
                className={`w-3 h-3 shrink-0 ${
                  autoRefresh
                    ? 'text-green-400 animate-pulse'
                    : 'text-muted-foreground'
                }`}
              />
              <span>Live Data</span>
              {autoRefresh && (
                <Badge
                  variant="secondary"
                  className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0.5 ml-1"
                >
                  ON
                </Badge>
              )}
            </Label>
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={(auto: boolean) =>
                dispatch(setAutoRefresh(auto))
              }
              className="shrink-0"
            />
          </div>

          {/* Enhanced Live Status Indicator */}
          <div
            className={`transition-all duration-300 ${autoRefresh ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}
          >
            <div className="flex items-center gap-2 p-2 text-xs border rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
              <div className="relative shrink-0">
                <div className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-green-400">
                  Real-time updates active
                </div>
                <div className="text-green-400/80 text-[10px] mt-0.5">
                  Chart refreshes automatically with new market data
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
