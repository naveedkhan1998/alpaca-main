import React from 'react';
import { Button } from '@/components/ui/button';
import { HiChartBar, HiTrendingUp, HiViewGrid, HiChartSquareBar } from 'react-icons/hi';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { selectChartType, selectShowVolume, selectTimeframe, setChartType, setShowVolume, setTimeframe } from '../graphSlice';
import type { SeriesType } from 'lightweight-charts';

interface ChartToolbarProps { compact?: boolean }

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
    <div className="hidden sm:flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg bg-card/80 backdrop-blur border border-border/50 p-1 shadow-sm">
        {TF_OPTS.map(tf => (
          <Button key={tf.v} size="sm" variant={timeframe === tf.v ? 'secondary' : 'ghost'} className="h-7 px-2 text-[11px]" onClick={() => dispatch(setTimeframe(tf.v))}>
            {tf.l}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-card/80 backdrop-blur border border-border/50 p-1 shadow-sm">
        {STYLES.map(s => (
          <Button key={s.v} size="sm" variant={chartType === s.v ? 'secondary' : 'ghost'} className="h-7 px-2 text-[11px] gap-1" onClick={() => dispatch(setChartType(s.v))} title={s.l}>
            {s.icon}
            {!compact && <span className="hidden md:inline">{s.l}</span>}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-card/80 backdrop-blur border border-border/50 p-1 shadow-sm">
        <Button size="sm" variant={showVolume ? 'secondary' : 'ghost'} className="h-7 px-2 text-[11px] gap-1" onClick={() => dispatch(setShowVolume(!showVolume))} title="Volume">
          <HiChartSquareBar className="w-3.5 h-3.5" />
          {!compact && <span className="hidden md:inline">Vol</span>}
        </Button>
      </div>
    </div>
  );

  const Collapsed = (
    <div className="sm:hidden">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="secondary" className="h-8 px-2 rounded-full shadow-sm" aria-label="Open chart toolbar">
            <HiViewGrid className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-card/80 border border-border/50 p-1">
              {TF_OPTS.map(tf => (
                <Button key={tf.v} size="sm" variant={timeframe === tf.v ? 'secondary' : 'ghost'} className="h-7 px-2 text-[11px]" onClick={() => dispatch(setTimeframe(tf.v))}>
                  {tf.l}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-card/80 border border-border/50 p-1">
              {STYLES.map(s => (
                <Button key={s.v} size="sm" variant={chartType === s.v ? 'secondary' : 'ghost'} className="h-7 px-2 text-[11px] gap-1" onClick={() => dispatch(setChartType(s.v))}>
                  {s.icon}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-card/80 border border-border/50 p-1">
              <Button size="sm" variant={showVolume ? 'secondary' : 'ghost'} className="h-7 px-2 text-[11px] gap-1" onClick={() => dispatch(setShowVolume(!showVolume))}>
                <HiChartSquareBar className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
      {Inline}
      {Collapsed}
    </div>
  );
};

export default ChartToolbar;
