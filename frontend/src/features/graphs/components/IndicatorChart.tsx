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
import { getBaseChartOptions } from '../lib/chartOptions';
import { useResizeObserver } from '../hooks/useResizeObserver';

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
  // Resize handled by shared hook
  const legendContainerRef = useRef<HTMLDivElement | null>(null);
  const prevRsiLengthRef = useRef<number>(0);
  const prevAtrLengthRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);

  // Initialize chart only once on mount
  useEffect(() => {
    const containerEl = indicatorChartContainerRef.current;
    if (!containerEl || indicatorChartRef.current) return;

    // Create chart
    const chart = createChart(containerEl, getBaseChartOptions(mode));

    indicatorChartRef.current = chart;
    setTimeScale(chart.timeScale());
    isInitializedRef.current = true;

    // Legend overlay
    const legendContainer = document.createElement('div');
    legendContainer.className =
      'absolute -top-4 left-2 p-2 rounded-lg glass-card shadow-md z-[10] text-xs flex items-center gap-3';
    const rsiSpan = document.createElement('span');
    rsiSpan.className = 'font-medium text-amber-600 dark:text-amber-300';
    rsiSpan.textContent = '';
    const atrSpan = document.createElement('span');
    atrSpan.className = 'font-medium text-blue-600 dark:text-blue-300';
    atrSpan.textContent = '';
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
        if (rsiSeriesRef.current && rsiPoint) {
          rsiLabel.textContent = `RSI: ${Number(rsiPoint.value).toFixed(2)}`;
        } else {
          rsiLabel.textContent = '';
        }
      }
      if (atrLabel) {
        if (atrSeriesRef.current && atrPoint) {
          atrLabel.textContent = `ATR: ${Number(atrPoint.value).toFixed(2)}`;
        } else {
          atrLabel.textContent = '';
        }
      }
    });

    // Cleanup function to remove chart on unmount
    return () => {
      if (indicatorChartRef.current) {
        indicatorChartRef.current.remove();
        indicatorChartRef.current = null;
        rsiSeriesRef.current = null;
        atrSeriesRef.current = null;
        isInitializedRef.current = false;
      }
      if (legendContainerRef.current && containerEl) {
        containerEl.removeChild(legendContainerRef.current);
        legendContainerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep chart sized to container
  useResizeObserver(indicatorChartContainerRef, rect => {
    if (indicatorChartRef.current) {
      indicatorChartRef.current.applyOptions({
        width: rect.width,
        height: rect.height,
      });
    }
  });

  // Update chart options when mode changes
  useEffect(() => {
    if (indicatorChartRef.current)
      indicatorChartRef.current.applyOptions(getBaseChartOptions(mode));
  }, [mode]);

  // Update RSI series data - optimized to prevent unnecessary re-renders
  useEffect(() => {
    if (!indicatorChartRef.current || !isInitializedRef.current) return;

    const hasRSI = rsiData && rsiData.length > 0;

    if (hasRSI) {
      if (!rsiSeriesRef.current) {
        // Create new series
        rsiSeriesRef.current = indicatorChartRef.current.addSeries(LineSeries, {
          color: mode ? '#FBBF24' : '#F59E0B',
          lineWidth: 2,
        });
        rsiSeriesRef.current.setData(rsiData);
        prevRsiLengthRef.current = rsiData.length;

        // Update legend with initial value
        if (legendContainerRef.current) {
          const rsiLabel = legendContainerRef.current
            .children[0] as HTMLSpanElement;
          if (rsiLabel) {
            rsiLabel.textContent = `RSI: ${Number(rsiData.at(-1)?.value ?? 0).toFixed(2)}`;
          }
        }
      } else {
        // Check if data length changed or if it's just an update
        if (rsiData.length !== prevRsiLengthRef.current) {
          // Full data change (timeframe change, etc.)
          rsiSeriesRef.current.setData(rsiData);
          prevRsiLengthRef.current = rsiData.length;
        } else if (rsiData.length > 0) {
          // Just update the last point for real-time updates
          const lastPoint = rsiData[rsiData.length - 1];
          rsiSeriesRef.current.update(lastPoint);
        }

        // Update legend with latest value
        if (legendContainerRef.current) {
          const rsiLabel = legendContainerRef.current
            .children[0] as HTMLSpanElement;
          if (rsiLabel) {
            rsiLabel.textContent = `RSI: ${Number(rsiData.at(-1)?.value ?? 0).toFixed(2)}`;
          }
        }
      }
    } else {
      if (rsiSeriesRef.current) {
        indicatorChartRef.current.removeSeries(rsiSeriesRef.current);
        rsiSeriesRef.current = null;
        prevRsiLengthRef.current = 0;

        // Clear legend
        if (legendContainerRef.current) {
          const rsiLabel = legendContainerRef.current
            .children[0] as HTMLSpanElement;
          if (rsiLabel) {
            rsiLabel.textContent = '';
          }
        }
      }
    }
  }, [rsiData, mode]);

  // Update ATR series data - optimized to prevent unnecessary re-renders
  useEffect(() => {
    if (!indicatorChartRef.current || !isInitializedRef.current) return;

    const hasATR = atrData && atrData.length > 0;

    if (hasATR) {
      if (!atrSeriesRef.current) {
        // Create new series
        atrSeriesRef.current = indicatorChartRef.current.addSeries(LineSeries, {
          color: mode ? '#60A5FA' : '#3B82F6',
          lineWidth: 2,
        });
        atrSeriesRef.current.setData(atrData);
        prevAtrLengthRef.current = atrData.length;

        // Update legend with initial value
        if (legendContainerRef.current) {
          const atrLabel = legendContainerRef.current
            .children[1] as HTMLSpanElement;
          if (atrLabel) {
            atrLabel.textContent = `ATR: ${Number(atrData.at(-1)?.value ?? 0).toFixed(2)}`;
          }
        }
      } else {
        // Check if data length changed or if it's just an update
        if (atrData.length !== prevAtrLengthRef.current) {
          // Full data change (timeframe change, etc.)
          atrSeriesRef.current.setData(atrData);
          prevAtrLengthRef.current = atrData.length;
        } else if (atrData.length > 0) {
          // Just update the last point for real-time updates
          const lastPoint = atrData[atrData.length - 1];
          atrSeriesRef.current.update(lastPoint);
        }

        // Update legend with latest value
        if (legendContainerRef.current) {
          const atrLabel = legendContainerRef.current
            .children[1] as HTMLSpanElement;
          if (atrLabel) {
            atrLabel.textContent = `ATR: ${Number(atrData.at(-1)?.value ?? 0).toFixed(2)}`;
          }
        }
      }
    } else {
      if (atrSeriesRef.current) {
        indicatorChartRef.current.removeSeries(atrSeriesRef.current);
        atrSeriesRef.current = null;
        prevAtrLengthRef.current = 0;

        // Clear legend
        if (legendContainerRef.current) {
          const atrLabel = legendContainerRef.current
            .children[1] as HTMLSpanElement;
          if (atrLabel) {
            atrLabel.textContent = '';
          }
        }
      }
    }
  }, [atrData, mode]);

  return (
    <div className="w-full h-full">
      <div
        ref={indicatorChartContainerRef}
        className="relative w-full h-full"
        style={{ height: 'calc(100% - 32px)' }}
      />
    </div>
  );
};

export default IndicatorChart;
