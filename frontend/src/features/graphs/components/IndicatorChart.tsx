import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ITimeScaleApi,
  Time,
  LineData,
  LineSeries,
  MouseEventParams,
} from 'lightweight-charts';

interface IndicatorChartProps {
  rsiData: LineData[];
  atrData: LineData[];
  mode: boolean;
  setTimeScale: (timeScale: ITimeScaleApi<Time>) => void;
}

const IndicatorChart: React.FC<IndicatorChartProps> = ({
  rsiData,
  atrData,
  mode,
  setTimeScale,
}) => {
  const indicatorChartContainerRef = useRef<HTMLDivElement | null>(null);
  const indicatorChartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const atrSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const legendContainerRef = useRef<HTMLDivElement | null>(null);

  // Create or destroy chart based on active indicators
  useEffect(() => {
    const hasRSI = rsiData && rsiData.length > 0;
    const hasATR = atrData && atrData.length > 0;

    const containerEl = indicatorChartContainerRef.current;
    if (!containerEl) return;

    if (!hasRSI && !hasATR) {
      // No active indicators, remove chart if it exists
      if (indicatorChartRef.current) {
        indicatorChartRef.current.remove();
        indicatorChartRef.current = null;
        rsiSeriesRef.current = null;
        atrSeriesRef.current = null;
      }
      if (resizeObserverRef.current && containerEl) {
        resizeObserverRef.current.unobserve(containerEl);
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (legendContainerRef.current && containerEl) {
        containerEl.removeChild(legendContainerRef.current);
        legendContainerRef.current = null;
      }
      return;
    }

    if (!indicatorChartRef.current) {
      // Create chart
      const chart = createChart(containerEl, {
        layout: {
          textColor: mode ? '#E2E8F0' : '#475569',
          background: { color: 'transparent' },
          fontSize: 12,
          fontFamily: 'Inter, -apple-system, sans-serif',
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: mode ? '#334155' : '#CBD5E1',
        },
        rightPriceScale: {
          borderColor: mode ? '#334155' : '#CBD5E1',
        },
        crosshair: {
          mode: 1,
          vertLine: {
            width: 1,
            color: mode ? '#64748B' : '#94A3B8',
            style: 2,
          },
          horzLine: {
            visible: true,
            labelVisible: true,
            color: mode ? '#64748B' : '#94A3B8',
            width: 1,
            style: 2,
          },
        },
        grid: {
          vertLines: {
            color: mode ? '#1E293B' : '#F1F5F9',
            style: 1,
          },
          horzLines: {
            color: mode ? '#1E293B' : '#F1F5F9',
            style: 1,
          },
        },
        handleScroll: true,
        handleScale: true,
      });

      indicatorChartRef.current = chart;
      setTimeScale(chart.timeScale());

      // Legend overlay
      const legendContainer = document.createElement('div');
      legendContainer.className =
        'absolute top-2 left-2 p-2 rounded-lg glass-card shadow-md z-[10] text-xs flex items-center gap-3';
      const rsiSpan = document.createElement('span');
      rsiSpan.className = 'text-amber-600 dark:text-amber-300 font-medium';
      rsiSpan.textContent = hasRSI
        ? `RSI: ${Number(rsiData.at(-1)?.value ?? 0).toFixed(2)}`
        : '';
      const atrSpan = document.createElement('span');
      atrSpan.className = 'text-blue-600 dark:text-blue-300 font-medium';
      atrSpan.textContent = hasATR
        ? `ATR: ${Number(atrData.at(-1)?.value ?? 0).toFixed(2)}`
        : '';
      legendContainer.appendChild(rsiSpan);
      legendContainer.appendChild(atrSpan);
      containerEl.appendChild(legendContainer);
      legendContainerRef.current = legendContainer;

      // Crosshair updates legend
      chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
        if (!legendContainerRef.current) return;
        const rsiPoint = rsiSeriesRef.current
          ? (param.seriesData.get(rsiSeriesRef.current) as LineData | undefined)
          : undefined;
        const atrPoint = atrSeriesRef.current
          ? (param.seriesData.get(atrSeriesRef.current) as LineData | undefined)
          : undefined;

        const [rsiLabel, atrLabel] = legendContainerRef.current
          .children as unknown as HTMLSpanElement[];
        if (rsiLabel) {
          rsiLabel.textContent = hasRSI
            ? `RSI: ${Number(rsiPoint?.value ?? rsiData.at(-1)?.value ?? 0).toFixed(2)}`
            : '';
        }
        if (atrLabel) {
          atrLabel.textContent = hasATR
            ? `ATR: ${Number(atrPoint?.value ?? atrData.at(-1)?.value ?? 0).toFixed(2)}`
            : '';
        }
      });

      // Handle Resize
      const resizeObserver = new ResizeObserver(entries => {
        if (containerEl && indicatorChartRef.current) {
          const { width, height } = entries[0].contentRect;
          indicatorChartRef.current.applyOptions({ width, height });
        }
      });

      resizeObserver.observe(containerEl);
      resizeObserverRef.current = resizeObserver;
    }

    // Cleanup function to remove chart on unmount
    return () => {
      const cleanupContainer = containerEl;
      if (indicatorChartRef.current) {
        indicatorChartRef.current.remove();
        indicatorChartRef.current = null;
        rsiSeriesRef.current = null;
        atrSeriesRef.current = null;
      }
      if (resizeObserverRef.current && cleanupContainer) {
        resizeObserverRef.current.unobserve(cleanupContainer);
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (legendContainerRef.current && cleanupContainer) {
        cleanupContainer.removeChild(legendContainerRef.current);
        legendContainerRef.current = null;
      }
    };
  }, [rsiData, atrData, mode, setTimeScale]);

  // Update chart options when mode changes
  useEffect(() => {
    if (indicatorChartRef.current) {
      indicatorChartRef.current.applyOptions({
        layout: {
          textColor: mode ? '#E2E8F0' : '#475569',
          background: { color: 'transparent' },
        },
        timeScale: {
          borderColor: mode ? '#334155' : '#CBD5E1',
        },
        rightPriceScale: {
          borderColor: mode ? '#334155' : '#CBD5E1',
        },
        crosshair: {
          vertLine: {
            color: mode ? '#64748B' : '#94A3B8',
          },
          horzLine: {
            color: mode ? '#64748B' : '#94A3B8',
          },
        },
        grid: {
          vertLines: {
            color: mode ? '#1E293B' : '#F1F5F9',
          },
          horzLines: {
            color: mode ? '#1E293B' : '#F1F5F9',
          },
        },
      });
    }
  }, [mode]);

  // Update RSI series data
  useEffect(() => {
    if (!indicatorChartRef.current) return;

    if (rsiData && rsiData.length > 0) {
      if (!rsiSeriesRef.current) {
        rsiSeriesRef.current = indicatorChartRef.current.addSeries(LineSeries, {
          color: mode ? '#FBBF24' : '#F59E0B', // Yellow/Orange color for RSI
          lineWidth: 2,
        });
      }
      rsiSeriesRef.current?.setData(rsiData);
    } else {
      if (rsiSeriesRef.current) {
        indicatorChartRef.current.removeSeries(rsiSeriesRef.current);
        rsiSeriesRef.current = null;
      }
    }
  }, [rsiData, mode]);

  // Update ATR series data
  useEffect(() => {
    if (!indicatorChartRef.current) return;

    if (atrData && atrData.length > 0) {
      if (!atrSeriesRef.current) {
        atrSeriesRef.current = indicatorChartRef.current.addSeries(LineSeries, {
          color: mode ? '#60A5FA' : '#3B82F6', // Blue color for ATR
          lineWidth: 2,
        });
      }
      atrSeriesRef.current?.setData(atrData);
    } else {
      if (atrSeriesRef.current) {
        indicatorChartRef.current.removeSeries(atrSeriesRef.current);
        atrSeriesRef.current = null;
      }
    }
  }, [atrData, mode]);

  return (
    <div className="w-full h-full">
      {(rsiData && rsiData.length > 0) || (atrData && atrData.length > 0) ? (
        <div
          ref={indicatorChartContainerRef}
          className="relative w-full h-full"
          style={{ height: 'calc(100% - 64px)' }}
        ></div>
      ) : null}
    </div>
  );
};

export default IndicatorChart;
