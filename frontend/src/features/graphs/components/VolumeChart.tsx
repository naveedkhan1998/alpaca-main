import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
  HistogramData,
  ITimeScaleApi,
  HistogramSeries,
} from 'lightweight-charts';
import { getBaseChartOptions } from '../lib/chartOptions';
import { useResizeObserver } from '../hooks/useResizeObserver';

interface VolumeChartProps {
  volumeData: HistogramData<Time>[];
  mode: boolean;
  setTimeScale: (timeScale: ITimeScaleApi<Time>) => void;
}

const VolumeChart: React.FC<VolumeChartProps> = ({
  volumeData,
  mode,
  setTimeScale,
}) => {
  const volumeChartContainerRef = useRef<HTMLDivElement | null>(null);
  const volumeChartRef = useRef<IChartApi | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const legendRef = useRef<HTMLDivElement | null>(null);
  // Resize handled by shared hook

  // Create chart on mount
  useEffect(() => {
    const containerEl = volumeChartContainerRef.current;
    if (!containerEl || volumeChartRef.current) return;

    const base = getBaseChartOptions(mode);
    const chart = createChart(containerEl, {
      ...base,
      layout: { ...base.layout, fontSize: 11 },
      timeScale: { ...base.timeScale, visible: true },
      rightPriceScale: {
        ...base.rightPriceScale,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      grid: {
        ...(base.grid as any),
        vertLines: { visible: false },
        horzLines: (base.grid as any).horzLines,
      },
    });

    // Set initial size from container
    const rect = containerEl.getBoundingClientRect();
    chart.applyOptions({ width: rect.width, height: rect.height });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'right',
      base: 0,
    });

    volumeSeriesRef.current = volumeSeries;
    volumeChartRef.current = chart;
    setTimeScale(chart.timeScale());

    // Legend overlay
    const legend = document.createElement('div');
    legend.className =
      'absolute top-2 left-2 p-2 rounded-lg glass-card shadow-md z-[10] text-xs';
    legend.innerHTML =
      '<span class="font-medium text-slate-700 dark:text-slate-300">Volume: —</span>';
    containerEl.appendChild(legend);
    legendRef.current = legend;

    // Clean up on unmount
    return () => {
      chart.remove();
      volumeChartRef.current = null;
      if (legendRef.current && containerEl) {
        containerEl.removeChild(legendRef.current);
        legendRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep chart sized to container
  useResizeObserver(volumeChartContainerRef, rect => {
    if (volumeChartRef.current) {
      volumeChartRef.current.applyOptions({ width: rect.width, height: rect.height });
    }
  });

  // Update chart options when mode changes
  useEffect(() => {
    if (volumeChartRef.current)
      volumeChartRef.current.applyOptions(getBaseChartOptions(mode));
  }, [mode]);

  // Update data when volumeData changes
  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(volumeData);
    }
    if (legendRef.current) {
      const latest = volumeData.at(-1);
      const value =
        latest && 'value' in latest
          ? Number(latest.value).toLocaleString()
          : '—';
      legendRef.current.innerHTML = `<span class="font-medium text-slate-700 dark:text-slate-300">Volume: ${value}</span>`;
    }
  }, [volumeData]);

  return (
    <div className="w-full h-full">
      <div
        ref={volumeChartContainerRef}
        className="relative w-full h-full"
        style={{ height: 'calc(100% - 64px)' }}
      />
    </div>
  );
};

export default VolumeChart;
