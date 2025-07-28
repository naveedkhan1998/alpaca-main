import { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HiClock,
  HiChartBar,
  HiTrendingUp,
  HiCog,
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
} from 'react-icons/hi';
import { SeriesType } from 'lightweight-charts';

export default function ChartControls() {
  const dispatch = useAppDispatch();
  const timeframe = useAppSelector(selectTimeframe);
  const chartType = useAppSelector(selectChartType);
  const showVolume = useAppSelector(selectShowVolume);
  const autoRefresh = useAppSelector(selectAutoRefresh);
  const activeIndicators = useAppSelector(selectActiveIndicators);
  const [isCustomTfDialogOpen, setIsCustomTfDialogOpen] = useState(false);
  const [customTimeframeInput, setCustomTimeframeInput] = useState('');

  const handleCustomTimeframeSubmit = () => {
    const parsedTimeframe = parseInt(customTimeframeInput, 10);
    if (!isNaN(parsedTimeframe) && parsedTimeframe > 0) {
      dispatch(setTimeframe(parsedTimeframe));
      setIsCustomTfDialogOpen(false);
      setCustomTimeframeInput('');
    }
  };

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
    description: string;
  }[] = [
    {
      value: 'Candlestick',
      label: 'Candlestick',
      icon: <HiChartBar className="w-4 h-4" />,
      description: 'OHLC data visualization',
    },
    {
      value: 'Line',
      label: 'Line Chart',
      icon: <HiTrendingUp className="w-4 h-4" />,
      description: 'Price trend line',
    },
    {
      value: 'Area',
      label: 'Area',
      icon: <HiPresentationChartLine className="w-4 h-4" />,
      description: 'Filled line chart',
    },
    {
      value: 'Bar',
      label: 'Bar',
      icon: <HiChartSquareBar className="w-4 h-4" />,
      description: 'OHLC as bars',
    },
    {
      value: 'Baseline',
      label: 'Baseline',
      icon: <HiBeaker className="w-4 h-4" />,
      description: 'Price vs baseline',
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
    if (checked) {
      dispatch(addIndicator(indicatorName));
    } else {
      dispatch(removeIndicator(indicatorName));
    }
  };

  return (
    <div className="space-y-4 scrollbar-hidden">
      {/* Timeframe Section */}
      <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="p-2 border rounded-lg bg-primary/10 text-primary border-primary/20">
              <HiClock className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-card-foreground">
                Timeframe
              </span>
              <span className="text-xs text-muted-foreground">
                Select chart interval
              </span>
            </div>
            {timeframe && (
              <Badge
                variant="secondary"
                className="ml-auto text-xs border bg-primary/10 text-primary border-primary/20"
              >
                {timeframeOptions.find(t => t.value === timeframe)?.label ||
                  `${timeframe}m`}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {timeframeOptions.map(tf => (
              <Button
                key={tf.value}
                size="sm"
                variant={timeframe === tf.value ? 'default' : 'outline'}
                className="transition-all duration-200"
                onClick={() => dispatch(setTimeframe(tf.value))}
              >
                {tf.label}
              </Button>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-xs font-medium transition-all duration-300 border-2 border-dashed border-border hover:border-primary/50 hover:text-primary"
            onClick={() => setIsCustomTfDialogOpen(true)}
          >
            <HiCog className="w-4 h-4 mr-2" />
            Custom
          </Button>
        </CardContent>
      </Card>

      {/* Chart Type Section */}
      <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="p-2 border rounded-lg bg-primary/10 text-primary border-primary/20">
              <HiViewGrid className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-card-foreground">
                Chart Style
              </span>
              <span className="text-xs text-muted-foreground">
                Choose visualization type
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {chartTypes.map(type => (
            <div
              key={type.value}
              className={`p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                chartType === type.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
              }`}
              onClick={() => dispatch(setChartType(type.value))}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <div
                  className={`p-2 rounded-lg ${
                    chartType === type.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {type.icon}
                </div>
                <div className="flex-1">
                  <div
                    className={`font-semibold text-xs ${
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
        </CardContent>
      </Card>

      {/* Indicators Section */}
      <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="p-2 border rounded-lg bg-primary/10 text-primary border-primary/20">
              <HiOutlineTrendingUp className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-card-foreground">
                Indicators
              </span>
              <span className="text-xs text-muted-foreground">
                Add technical indicators
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {indicators.map(indicator => (
            <div
              key={indicator.name}
              className="flex items-center justify-between p-2 rounded-lg bg-background/50"
            >
              <Label
                htmlFor={`indicator-${indicator.name}`}
                className="flex items-center gap-2 text-sm font-medium cursor-pointer text-card-foreground"
              >
                {indicator.icon}
                {indicator.label}
              </Label>
              <Switch
                id={`indicator-${indicator.name}`}
                checked={activeIndicators.includes(indicator.name)}
                onCheckedChange={checked =>
                  handleIndicatorToggle(indicator.name, checked)
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Settings Section */}
      <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="p-2 border rounded-lg bg-primary/10 text-primary border-primary/20">
              <HiAdjustments className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-card-foreground">
                Settings
              </span>
              <span className="text-xs text-muted-foreground">
                Tweak chart options
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
            <Label
              htmlFor="show-volume"
              className="flex items-center gap-2 text-sm font-medium cursor-pointer text-card-foreground"
            >
              <HiChartSquareBar className="w-4 h-4 text-muted-foreground" />
              Show Volume
            </Label>
            <Switch
              id="show-volume"
              checked={showVolume}
              onCheckedChange={(show: boolean) => dispatch(setShowVolume(show))}
            />
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
            <Label
              htmlFor="auto-refresh"
              className="flex items-center gap-2 text-sm font-medium cursor-pointer text-card-foreground"
            >
              <HiLightningBolt className="w-4 h-4 text-muted-foreground" />
              Live Data
            </Label>
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={(auto: boolean) =>
                dispatch(setAutoRefresh(auto))
              }
            />
          </div>
          {autoRefresh && (
            <div className="flex items-center gap-2 p-2 text-xs text-green-400 border rounded-lg bg-green-500/10 border-green-500/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
              <span>Live updates enabled</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Timeframe Dialog */}
      <Dialog
        open={isCustomTfDialogOpen}
        onOpenChange={setIsCustomTfDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px] bg-popover/95 backdrop-blur-md border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <HiClock className="w-4 h-4" />
              </div>
              Custom Timeframe
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              handleCustomTimeframeSubmit();
            }}
            className="space-y-6"
          >
            <div className="space-y-3">
              <Label
                htmlFor="custom-timeframe"
                className="text-sm font-semibold text-popover-foreground"
              >
                Enter timeframe in minutes:
              </Label>
              <Input
                type="number"
                id="custom-timeframe"
                value={customTimeframeInput}
                onChange={e => setCustomTimeframeInput(e.target.value)}
                placeholder="e.g., 45"
                required
                min={1}
                className="text-lg font-semibold text-center transition-all duration-200 border-2 h-11 focus:border-primary"
              />
              <div className="p-3 border rounded-lg bg-background/50 border-border">
                <p className="text-xs font-medium text-muted-foreground">
                  Examples: 3, 7, 45, 120, 360, etc.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomTfDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Apply
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
