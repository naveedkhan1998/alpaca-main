/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  SeriesType,
  ISeriesApi,
  ITimeScaleApi,
  Time,
  BarData,
  LineData,
  HistogramData,
  MouseEventParams,
  LineSeries,
} from 'lightweight-charts';

import { useAppSelector } from 'src/app/hooks';
import { selectAutoRefresh, selectChartType } from '../graphSlice';
import { getBaseChartOptions } from '../lib/chartOptions';
import { createSeriesForType } from '../lib/createSeries';
import { useResizeObserver } from '../hooks/useResizeObserver';
import { useIsMobile } from '@/hooks/useMobile';

interface MainChartProps {
  seriesData: (BarData | LineData | HistogramData)[];
  mode: boolean;
  setTimeScale: (timeScale: ITimeScaleApi<Time>) => void;
  emaData: LineData[];
  bollingerBandsData: {
    time: Time;
    upper: number;
    middle: number;
    lower: number;
  }[];
  onLoadMoreData: () => void;
  isLoadingMore: boolean;
  hasMoreData: boolean;
}

const MainChart: React.FC<MainChartProps> = ({
  seriesData,
  mode,
  setTimeScale,
  emaData,
  bollingerBandsData,
  onLoadMoreData,
  isLoadingMore,
  hasMoreData,
}) => {
  const chartType = useAppSelector(selectChartType);
  const autoRefresh = useAppSelector(selectAutoRefresh);
  const isMobile = useIsMobile();
  const mainChartContainerRef = useRef<HTMLDivElement | null>(null);
  const mainChartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bollingerBandsSeriesRefs = useRef<{
    upper: ISeriesApi<'Line'> | null;
    middle: ISeriesApi<'Line'> | null;
    lower: ISeriesApi<'Line'> | null;
  }>({
    upper: null,
    middle: null,
    lower: null,
  });
  const prevChartTypeRef = useRef<SeriesType>(chartType);
  const legendContainerRef = useRef<HTMLDivElement | null>(null);
  // Resize handled via shared hook
  const loadingIndicatorRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreDataRef = useRef(onLoadMoreData);

  useEffect(() => {
    onLoadMoreDataRef.current = onLoadMoreData;
  }, [onLoadMoreData]);

  const createSeries = useCallback(
    (chart: IChartApi, type: SeriesType): ISeriesApi<SeriesType> =>
      createSeriesForType(chart, type, mode, seriesData as any),
    [mode, seriesData]
  );

  // Initialize chart only once
  const initializeChart = useCallback(() => {
    if (!mainChartContainerRef.current || mainChartRef.current) return;

    mainChartContainerRef.current.innerHTML = '';

    const chart = createChart(
      mainChartContainerRef.current,
      getBaseChartOptions(mode)
    );

    mainChartRef.current = chart;
    setTimeScale(chart.timeScale());

    // Set initial size
    const rect = mainChartContainerRef.current.getBoundingClientRect();
    chart.applyOptions({ width: rect.width, height: rect.height });

    // Create legend with modern styling
    const legendContainer = document.createElement('div');
    legendContainer.className =
      'absolute px-2 py-1 border rounded-lg shadow-lg top-2 left-2 bg-card/95 backdrop-blur-xl border-border/40';

    mainChartContainerRef.current.appendChild(legendContainer);
    legendContainerRef.current = legendContainer;

    // Compact OHLC display for both mobile and desktop
    const priceSection = document.createElement('div');
    priceSection.className = 'flex items-center gap-2 text-xs font-bold';
    legendContainer.appendChild(priceSection);

    const updateLegend = (data: any | null) => {
      if (!priceSection) return;

      if (data) {
        priceSection.innerHTML = '';
        if (
          (chartType === 'Candlestick' || chartType === 'Bar') &&
          'open' in data
        ) {
          const { open, high, low, close } = data as BarData;

          if (isMobile) {
            // Mobile: Compact OHLC with different colors
            const priceItems = [
              { label: 'O', value: open.toFixed(2), color: '#3B82F6' }, // Blue for Open
              { label: 'H', value: high.toFixed(2), color: '#10B981' }, // Green for High
              { label: 'L', value: low.toFixed(2), color: '#EF4444' }, // Red for Low
              { label: 'C', value: close.toFixed(2), color: '#F59E0B' }, // Orange for Close
            ];

            priceItems.forEach(({ label, value, color }) => {
              const item = document.createElement('div');
              item.className = 'flex items-center gap-0.5';

              const labelSpan = document.createElement('span');
              labelSpan.className = 'text-xs font-bold tracking-wide uppercase';
              labelSpan.style.color = color;
              labelSpan.textContent = label;

              const valueSpan = document.createElement('span');
              valueSpan.className = 'text-xs font-bold';
              valueSpan.style.color = color;
              valueSpan.textContent = value;

              item.appendChild(labelSpan);
              item.appendChild(valueSpan);
              priceSection.appendChild(item);
            });
          } else {
            // Desktop: Standard OHLC display
            const priceItems = [
              { label: 'O', value: open.toFixed(2) },
              { label: 'H', value: high.toFixed(2) },
              { label: 'L', value: low.toFixed(2) },
              { label: 'C', value: close.toFixed(2) },
            ];

            priceItems.forEach(({ label, value }) => {
              const item = document.createElement('div');
              item.className = 'flex items-center gap-1';

              const labelSpan = document.createElement('span');
              labelSpan.className =
                'font-bold tracking-wide uppercase text-muted-foreground';
              labelSpan.textContent = label;

              const valueSpan = document.createElement('span');
              valueSpan.className = 'font-bold text-foreground';
              valueSpan.textContent = value;

              item.appendChild(labelSpan);
              item.appendChild(valueSpan);
              priceSection.appendChild(item);
            });
          }
        } else if ('value' in data) {
          const { value } = data as LineData;
          const item = document.createElement('div');
          item.className = 'flex items-center gap-1';

          const labelSpan = document.createElement('span');
          labelSpan.className = isMobile
            ? 'font-bold tracking-wide uppercase text-xs text-primary'
            : 'font-bold tracking-wide uppercase text-muted-foreground';
          labelSpan.textContent = 'Price';

          const valueSpan = document.createElement('span');
          valueSpan.className = isMobile
            ? 'font-bold text-xs text-primary'
            : 'font-bold text-foreground';
          valueSpan.textContent = (value as number).toFixed(2);

          item.appendChild(labelSpan);
          item.appendChild(valueSpan);
          priceSection.appendChild(item);
        }
      }
    };

    chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
      if (param.time && seriesRef.current) {
        const data = param.seriesData.get(seriesRef.current);
        if (data && ('open' in data || 'value' in data)) {
          updateLegend(data as any);
        } else {
          updateLegend(null);
        }
      } else {
        if (seriesData.length > 0) {
          updateLegend(seriesData[seriesData.length - 1]);
        }
      }
    });

    // Create initial series if data exists
    if (seriesData.length > 0) {
      const mainSeries = createSeries(chart, chartType);
      mainSeries.setData(seriesData as any);
      seriesRef.current = mainSeries;
      prevChartTypeRef.current = chartType;

      // Set initial legend
      updateLegend(seriesData[seriesData.length - 1]);
    }

    // Create loading indicator with modern styling
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className =
      'absolute hidden px-4 py-2.5 rounded-xl shadow-lg top-16 left-3 bg-card/95 backdrop-blur-xl border border-border/40';
    loadingIndicator.innerHTML = `
      <div class="flex items-center gap-2.5 text-sm">
        <div class="animate-spin rounded-full h-4 w-4 border-2 border-primary/30 border-t-primary"></div>
        <span class="text-foreground font-semibold">Loading historical data...</span>
      </div>
    `;
    mainChartContainerRef.current.appendChild(loadingIndicator);
    loadingIndicatorRef.current = loadingIndicator;

    // Subscribe to visible logical range changes for infinite loading
    chart.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
      if (!logicalRange) return;

      // Check if we need to load more data (when user scrolls to the left/beginning)
      const threshold = 10; // Load more data when less than 10 bars are visible on the left

      if (logicalRange.from < threshold && hasMoreData && !isLoadingMore) {
        onLoadMoreDataRef.current();
      }
    });
  }, [
    isMobile,
    setTimeScale,
    chartType,
    mode,
    seriesData,
    createSeries,
    hasMoreData,
    isLoadingMore,
  ]);

  // Initialize chart on mount
  useEffect(() => {
    initializeChart();
  }, [initializeChart]);

  // Keep chart sized to container
  useResizeObserver(mainChartContainerRef, rect => {
    if (mainChartRef.current) {
      mainChartRef.current.applyOptions({
        width: rect.width,
        height: rect.height,
      });
    }
  });

  // Update chart styling when mode changes
  useEffect(() => {
    if (!mainChartRef.current) return;
    mainChartRef.current.applyOptions(getBaseChartOptions(mode));

    // Update series styling for mode change
    if (seriesRef.current && mainChartRef.current) {
      mainChartRef.current.removeSeries(seriesRef.current);
      const newSeries = createSeries(mainChartRef.current, chartType);
      newSeries.setData(seriesData as any);
      seriesRef.current = newSeries;
    }
  }, [mode, createSeries, chartType, seriesData]);

  // Handle series creation/update and data changes
  useEffect(() => {
    if (!mainChartRef.current || !seriesData.length) return;

    // Handle chart type change
    if (prevChartTypeRef.current !== chartType) {
      if (seriesRef.current) {
        mainChartRef.current.removeSeries(seriesRef.current);
      }
      const mainSeries = createSeries(mainChartRef.current, chartType);
      mainSeries.setData(seriesData as any);
      seriesRef.current = mainSeries;
      prevChartTypeRef.current = chartType;
    } else {
      // Just update data without recreating series
      if (seriesRef.current) {
        seriesRef.current.setData(seriesData as any);
      }
    }
  }, [seriesData, chartType, createSeries]);

  // Add/Remove EMA series
  useEffect(() => {
    if (!mainChartRef.current) return;

    if (emaData && emaData.length > 0) {
      if (!emaSeriesRef.current) {
        emaSeriesRef.current = mainChartRef.current.addSeries(LineSeries, {
          color: mode ? '#FBBF24' : '#F59E0B', // Yellow/Orange color for EMA
          lineWidth: 1,
          lineStyle: 0, // Solid line
          crosshairMarkerVisible: false,
          lastValueVisible: false,
        });
      }
      emaSeriesRef.current.setData(emaData);
    } else {
      if (emaSeriesRef.current) {
        mainChartRef.current.removeSeries(emaSeriesRef.current);
        emaSeriesRef.current = null;
      }
    }
  }, [emaData, mode]);

  // Add/Remove Bollinger Bands series
  useEffect(() => {
    if (!mainChartRef.current) return;

    if (bollingerBandsData && bollingerBandsData.length > 0) {
      if (!bollingerBandsSeriesRefs.current.upper) {
        bollingerBandsSeriesRefs.current.upper = mainChartRef.current.addSeries(
          LineSeries,
          {
            color: mode ? '#FBBF24' : '#F59E0B', // Yellow/Orange color for Upper Bollinger Band
            lineWidth: 1,
            lineStyle: 2, // Dashed line
            crosshairMarkerVisible: false,
            lastValueVisible: false,
          }
        );
        bollingerBandsSeriesRefs.current.middle =
          mainChartRef.current.addSeries(LineSeries, {
            color: mode ? '#60A5FA' : '#3B82F6', // Blue color for Middle Bollinger Band
            lineWidth: 1,
            lineStyle: 1, // Dotted line
            crosshairMarkerVisible: false,
            lastValueVisible: false,
          });
        bollingerBandsSeriesRefs.current.lower = mainChartRef.current.addSeries(
          LineSeries,
          {
            color: mode ? '#EF4444' : '#DC2626', // Red color for Lower Bollinger Band
            lineWidth: 1,
            lineStyle: 2, // Dashed line
            crosshairMarkerVisible: false,
            lastValueVisible: false,
          }
        );
      }
      bollingerBandsSeriesRefs.current.upper?.setData(
        bollingerBandsData.map(d => ({ time: d.time, value: d.upper }))
      );
      bollingerBandsSeriesRefs.current.middle?.setData(
        bollingerBandsData.map(d => ({ time: d.time, value: d.middle }))
      );
      bollingerBandsSeriesRefs.current.lower?.setData(
        bollingerBandsData.map(d => ({ time: d.time, value: d.lower }))
      );
    } else {
      if (bollingerBandsSeriesRefs.current.upper) {
        mainChartRef.current.removeSeries(
          bollingerBandsSeriesRefs.current.upper
        );
        bollingerBandsSeriesRefs.current.upper = null;
      }
      if (bollingerBandsSeriesRefs.current.middle) {
        mainChartRef.current.removeSeries(
          bollingerBandsSeriesRefs.current.middle
        );
        bollingerBandsSeriesRefs.current.middle = null;
      }
      if (bollingerBandsSeriesRefs.current.lower) {
        mainChartRef.current.removeSeries(
          bollingerBandsSeriesRefs.current.lower
        );
        bollingerBandsSeriesRefs.current.lower = null;
      }
    }
  }, [bollingerBandsData, mode]);

  // Show/hide loading indicator
  useEffect(() => {
    if (loadingIndicatorRef.current && !autoRefresh) {
      loadingIndicatorRef.current.style.display = isLoadingMore
        ? 'block'
        : 'none';
    }
  }, [isLoadingMore, autoRefresh]);

  // Cleanup effect for component unmount
  useEffect(() => {
    const currentBollingerRefs = bollingerBandsSeriesRefs.current;
    return () => {
      if (mainChartRef.current) {
        mainChartRef.current.remove();
        mainChartRef.current = null;
      }
      legendContainerRef.current = null;
      seriesRef.current = null;
      emaSeriesRef.current = null;
      currentBollingerRefs.upper = null;
      currentBollingerRefs.middle = null;
      currentBollingerRefs.lower = null;
    };
  }, []);

  return (
    <div ref={mainChartContainerRef} className="relative w-full h-full">
      {/* Chart will be rendered here */}
    </div>
  );
};

export default MainChart;
