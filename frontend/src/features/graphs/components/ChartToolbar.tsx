import React from 'react';
import { Button } from '@/components/ui/button';
import {
  HiChartBar,
  HiTrendingUp,
  HiViewGrid,
  HiChartSquareBar,
} from 'react-icons/hi';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  selectChartType,
  selectShowVolume,
  selectTimeframe,
  setChartType,
  setShowVolume,
  setTimeframe,
} from '../graphSlice';
import type { SeriesType } from 'lightweight-charts';

interface ChartToolbarProps {
  compact?: boolean;
}

const TF_OPTS = [
  { v: 1, l: '1m' },
  { v: 5, l: '5m' },
  { v: 15, l: '15m' },
  { v: 60, l: '1h' },
  { v: 1440, l: '1D' },
];

const STYLES: { v: SeriesType; l: string; icon: React.ReactNode }[] = [
  { v: 'Candlestick', l: 'Cndl', icon: <HiChartBar className="w-3.5 h-3.5" /> },
  { v: 'Line', l: 'Line', icon: <HiTrendingUp className="w-3.5 h-3.5" /> },
];

export const ChartToolbar: React.FC<ChartToolbarProps> = ({ compact }) => {
  const dispatch = useAppDispatch();
  const timeframe = useAppSelector(selectTimeframe);
  const chartType = useAppSelector(selectChartType);
  const showVolume = useAppSelector(selectShowVolume);

  const Inline = (
    <div className="items-center hidden gap-2 sm:flex">
      {/* Timeframe Selector */}
      <div className="flex items-center gap-0.5 p-1 rounded-lg bg-card/95 backdrop-blur-xl border border-border/40 shadow-lg">
        {TF_OPTS.map(tf => (
          <Button
            key={tf.v}
            size="sm"
            variant={timeframe === tf.v ? 'default' : 'ghost'}
            className={`h-8 px-3 text-xs font-medium rounded-md transition-all ${
              timeframe === tf.v
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => dispatch(setTimeframe(tf.v))}
          >
            {tf.l}
          </Button>
        ))}
      </div>

      {/* Chart Style Selector */}
      <div className="flex items-center gap-0.5 p-1 rounded-lg bg-card/95 backdrop-blur-xl border border-border/40 shadow-lg">
        {STYLES.map(s => (
          <Button
            key={s.v}
            size="sm"
            variant={chartType === s.v ? 'default' : 'ghost'}
            className={`h-8 px-3 text-xs font-medium rounded-md transition-all gap-1.5 ${
              chartType === s.v
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => dispatch(setChartType(s.v))}
            title={s.l}
          >
            {s.icon}
            {!compact && <span className="hidden lg:inline">{s.l}</span>}
          </Button>
        ))}
      </div>

      {/* Volume Toggle */}
      <div className="flex items-center gap-0.5 p-1 rounded-lg bg-card/95 backdrop-blur-xl border border-border/40 shadow-lg">
        <Button
          size="sm"
          variant={showVolume ? 'default' : 'ghost'}
          className={`h-8 px-3 text-xs font-medium rounded-md transition-all gap-1.5 ${
            showVolume
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => dispatch(setShowVolume(!showVolume))}
          title="Volume"
        >
          <HiChartSquareBar className="w-4 h-4" />
          {!compact && <span className="hidden lg:inline">Volume</span>}
        </Button>
      </div>
    </div>
  );

  const Collapsed = (
    <div className="sm:hidden">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className="h-9 px-3 rounded-lg shadow-lg bg-card/95 backdrop-blur-xl border border-border/40 hover:bg-card transition-all"
            aria-label="Open chart toolbar"
          >
            <HiViewGrid className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-auto p-2 border border-border/40 shadow-xl bg-card/98 backdrop-blur-xl"
        >
          <div className="flex flex-col gap-2">
            {/* Timeframe Options */}
            <div className="flex items-center gap-1 p-1 rounded-md bg-muted/30">
              {TF_OPTS.map(tf => (
                <Button
                  key={tf.v}
                  size="sm"
                  variant={timeframe === tf.v ? 'default' : 'ghost'}
                  className={`h-8 px-2.5 text-xs font-medium rounded transition-all ${
                    timeframe === tf.v
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                  onClick={() => dispatch(setTimeframe(tf.v))}
                >
                  {tf.l}
                </Button>
              ))}
            </div>

            {/* Style & Volume Options */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-md bg-muted/30 flex-1">
                {STYLES.map(s => (
                  <Button
                    key={s.v}
                    size="sm"
                    variant={chartType === s.v ? 'default' : 'ghost'}
                    className={`h-8 px-2.5 text-xs font-medium rounded transition-all flex-1 ${
                      chartType === s.v
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                    onClick={() => dispatch(setChartType(s.v))}
                  >
                    {s.icon}
                  </Button>
                ))}
              </div>
              <div className="flex items-center p-1 rounded-md bg-muted/30">
                <Button
                  size="sm"
                  variant={showVolume ? 'default' : 'ghost'}
                  className={`h-8 px-2.5 text-xs font-medium rounded transition-all ${
                    showVolume
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                  onClick={() => dispatch(setShowVolume(!showVolume))}
                >
                  <HiChartSquareBar className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="absolute z-20 flex items-center gap-2 top-3 right-3">
      {Inline}
      {Collapsed}
    </div>
  );
};

export default ChartToolbar;
