/**
 * OptionBarsDialog.tsx
 *
 * A dialog that shows a price chart for a selected option contract.
 * Fetches historical OHLCV bars from the backend and renders them
 * using TradingView Lightweight Charts.
 */
import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import type {
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
} from 'lightweight-charts';
import { CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { RefreshCw, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/components/ThemeProvider';
import { useGetOptionBarsQuery } from '@/api/assetService';
import { getBaseChartOptions } from '../../lib/chartOptions';

interface OptionBarsDialogProps {
  symbol: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const timeframeOptions = [
  { value: '1Min', label: '1 min' },
  { value: '5Min', label: '5 min' },
  { value: '15Min', label: '15 min' },
  { value: '1Hour', label: '1 hour' },
  { value: '1Day', label: '1 day' },
];

const OptionBarsDialog: React.FC<OptionBarsDialogProps> = ({
  symbol,
  open,
  onOpenChange,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [timeframe, setTimeframe] = React.useState('1Day');

  const { data, isFetching, isError, refetch } = useGetOptionBarsQuery(
    { symbol, timeframe, limit: 1000 },
    { skip: !open }
  );

  const bars = data?.data?.bars?.[symbol] ?? [];

  // Build chart data in a single pass
  const { candleData, volumeData } = React.useMemo(() => {
    const candles: CandlestickData<Time>[] = [];
    const volumes: HistogramData<Time>[] = [];
    for (const b of bars) {
      const time = (new Date(b.t).getTime() / 1000) as Time;
      candles.push({ time, open: b.o, high: b.h, low: b.l, close: b.c });
      volumes.push({
        time,
        value: b.v,
        color: b.c >= b.o ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
      });
    }
    return { candleData: candles, volumeData: volumes };
  }, [bars]);

  // Initialize chart when dialog opens
  useEffect(() => {
    if (!open || !chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      ...getBaseChartOptions(isDark),
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });
    chartRef.current = chart;

    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    volSeriesRef.current = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volSeriesRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isDark]);

  // Update chart data when bars arrive or timeframe changes
  useEffect(() => {
    if (!candleSeriesRef.current || !volSeriesRef.current || !chartRef.current) return;
    if (candleData.length === 0) return;

    candleSeriesRef.current.setData(candleData);
    volSeriesRef.current.setData(volumeData);
    chartRef.current.timeScale().fitContent();
  }, [candleData, volumeData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-mono tracking-wide">
              {symbol}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeframeOptions.map(tf => (
                    <SelectItem key={tf.value} value={tf.value} className="text-xs">
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 relative min-h-0">
          {isFetching && (
            <div className="absolute inset-0 z-10 p-4">
              <Skeleton className="h-full w-full" />
            </div>
          )}

          {isError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <AlertCircle className="w-6 h-6" />
              <p className="text-sm">Failed to load option price history</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {!isError && !isFetching && bars.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <p className="text-sm">No price data available for this contract</p>
            </div>
          )}

          <div ref={chartContainerRef} className="w-full h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptionBarsDialog;
