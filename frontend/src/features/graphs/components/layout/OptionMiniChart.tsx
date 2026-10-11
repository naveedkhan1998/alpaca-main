import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type MouseEventParams,
} from 'lightweight-charts';
import { Loader2 } from 'lucide-react';
import { useGetAssetOptionBarsQuery } from '@/api/assetService';

interface OptionMiniChartProps {
  assetId: number;
  symbol: string;
  isDarkMode: boolean;
  height?: number;
  type?: 'call' | 'put';
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const OptionMiniChart: React.FC<OptionMiniChartProps> = ({
  assetId,
  symbol,
  isDarkMode,
  height = 200,
  type,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    time: string;
    price: string;
  } | null>(null);

  const { data, isFetching, isError } = useGetAssetOptionBarsQuery(
    { id: assetId, symbol, timeframe: '5Min', days: 14 },
    { skip: !symbol || !assetId }
  );

  const stats = useMemo(() => {
    const candles = data?.candles;
    if (!candles || candles.length === 0) return null;
    const first = candles[0].c;
    const last = candles[candles.length - 1].c;
    const pctChange = first > 0 ? ((last - first) / first) * 100 : 0;
    let high = -Infinity;
    let low = Infinity;
    for (const candle of candles) {
      if (candle.h > high) high = candle.h;
      if (candle.l < low) low = candle.l;
    }
    return {
      last,
      high: high === -Infinity ? last : high,
      low: low === Infinity ? last : low,
      pctChange,
    };
  }, [data?.candles]);

  const chartColors = useMemo(() => {
    if (type === 'call') {
      return {
        line: '#10b981',
        top: 'rgba(16, 185, 129, 0.25)',
        bottom: 'rgba(16, 185, 129, 0.01)',
      };
    }
    if (type === 'put') {
      return {
        line: '#a855f7',
        top: 'rgba(168, 85, 247, 0.25)',
        bottom: 'rgba(168, 85, 247, 0.01)',
      };
    }
    const isUp = (stats?.pctChange ?? 0) >= 0;
    return {
      line: isUp ? '#10b981' : '#f43f5e',
      top: isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)',
      bottom: isUp ? 'rgba(16, 185, 129, 0.01)' : 'rgba(244, 63, 94, 0.01)',
    };
  }, [type, stats]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        textColor: isDarkMode ? 'hsl(0, 0%, 65%)' : 'hsl(0, 0%, 35%)',
        background: { color: 'transparent' },
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace, sans-serif',
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDarkMode
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)',
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      rightPriceScale: {
        borderColor: isDarkMode
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)',
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      grid: {
        vertLines: {
          color: isDarkMode
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.04)',
          style: 1,
        },
        horzLines: {
          color: isDarkMode
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.04)',
          style: 1,
        },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          labelVisible: true,
          color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
        },
        horzLine: {
          labelVisible: true,
          color: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
        },
      },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: chartColors.line,
      topColor: chartColors.top,
      bottomColor: chartColors.bottom,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
      if (
        !param.time ||
        !param.point ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        setTooltip(null);
        return;
      }
      const value = param.seriesData.get(series);
      if (!value || !('value' in value)) {
        setTooltip(null);
        return;
      }
      const date = new Date((param.time as number) * 1000);
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const meridiem = hours >= 12 ? 'PM' : 'AM';
      setTooltip({
        x: param.point.x,
        y: param.point.y,
        time: `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${
          hours % 12 || 12
        }:${String(minutes).padStart(2, '0')} ${meridiem}`,
        price: `$${(value as { value: number }).value.toFixed(2)}`,
      });
    });

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [isDarkMode, height, chartColors]);

  useEffect(() => {
    if (!seriesRef.current || !data?.candles?.length) return;

    seriesRef.current.setData(
      data.candles.map(candle => {
        const date = new Date(candle.t);
        return {
          time: Math.floor(
            (date.getTime() - date.getTimezoneOffset() * 60_000) / 1000
          ) as Time,
          value: candle.c,
        };
      })
    );
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  if (isError) {
    return (
      <div
        className="flex items-center justify-center text-xs font-mono text-muted-foreground"
        style={{ height }}
      >
        No price history available
      </div>
    );
  }

  return (
    <div className="relative font-mono" onMouseLeave={() => setTooltip(null)}>
      {stats && (
        <div className="flex items-center justify-between px-3 py-1 border-b border-border/30 bg-muted/20 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground">
              ${stats.last.toFixed(2)}
            </span>
            <span
              className={`px-1 rounded font-bold text-[9px] ${
                stats.pctChange >= 0
                  ? 'bg-emerald-500/20 text-emerald-500'
                  : 'bg-rose-500/20 text-rose-500'
              }`}
            >
              {stats.pctChange >= 0 ? '+' : ''}
              {stats.pctChange.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground/80 text-[9px]">
            <span>H: ${stats.high.toFixed(2)}</span>
            <span>L: ${stats.low.toFixed(2)}</span>
          </div>
        </div>
      )}
      {isFetching && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isFetching && !data?.candles?.length && (
        <div
          className="flex items-center justify-center text-xs text-muted-foreground"
          style={{ height }}
        >
          No price history available
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ height }} />
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none px-2 py-1 rounded-md shadow-md text-[10px] leading-tight whitespace-nowrap border border-border/60 bg-popover/95 text-popover-foreground backdrop-blur-md"
          style={{
            left: Math.min(
              tooltip.x + 12,
              (containerRef.current?.clientWidth ?? 300) - 100
            ),
            top: Math.max(tooltip.y - 36, 0),
          }}
        >
          <div className="font-bold text-foreground">{tooltip.price}</div>
          <div className="text-[9px] text-muted-foreground">{tooltip.time}</div>
        </div>
      )}
    </div>
  );
};

export default OptionMiniChart;
