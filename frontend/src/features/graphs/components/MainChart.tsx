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

import type { Asset } from '@/types/common-types';
import { useAppSelector } from 'src/app/hooks';
import {
  selectAutoRefresh,
  selectChartType,
  selectTimeframe,
} from '../graphSlice';
import { getBaseChartOptions } from '../lib/chartOptions';
import { createSeriesForType } from '../lib/createSeries';
import { useResizeObserver } from '../hooks/useResizeObserver';

interface MainChartProps {
  seriesData: (BarData | LineData | HistogramData)[];
  mode: boolean;
  obj: Asset;
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
  obj,
  setTimeScale,
  emaData,
  bollingerBandsData,
  onLoadMoreData,
  isLoadingMore,
  hasMoreData,
}) => {
  const chartType = useAppSelector(selectChartType);
  const timeframe = useAppSelector(selectTimeframe);
  const autoRefresh = useAppSelector(selectAutoRefresh);
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
  const timeframeBadgeRef = useRef<HTMLSpanElement | null>(null);
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

    // Create legend
    const legendContainer = document.createElement('div');
    legendContainer.className =
      'absolute flex flex-wrap items-center p-2 rounded-lg top-2 left-2 glass-card gap-x-4 gap-y-1';

    mainChartContainerRef.current.appendChild(legendContainer);
    legendContainerRef.current = legendContainer;

    // Left section: Company name and exchange
    const infoSection = document.createElement('div');
    infoSection.className = 'flex items-center gap-2';

    const companyName = document.createElement('span');
    companyName.className =
      'hidden text-sm font-bold text-slate-900 dark:text-slate-100';
    companyName.textContent = obj?.name || '';

    const exchangeBadge = document.createElement('span');
    exchangeBadge.className =
      'text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded';
    exchangeBadge.textContent = obj?.symbol || '';

    const timeframeBadge = document.createElement('span');
    timeframeBadge.className =
      'text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 rounded ml-1';
    timeframeBadge.textContent = `${timeframe}m`;
    timeframeBadgeRef.current = timeframeBadge;

    infoSection.appendChild(companyName);
    infoSection.appendChild(exchangeBadge);
    infoSection.appendChild(timeframeBadge);
    legendContainer.appendChild(infoSection);

    // Right section: OHLC values
    const priceSection = document.createElement('div');
    priceSection.className = 'flex items-center gap-3 text-xs';
    legendContainer.appendChild(priceSection);

    const updateLegend = (data: any | null) => {
      if (data) {
        priceSection.innerHTML = '';
        if (
          (chartType === 'Candlestick' || chartType === 'Bar') &&
          'open' in data
        ) {
          const { open, high, low, close } = data as BarData;
          const priceItems = [
            { label: 'O', value: open.toFixed(2) },
            { label: 'H', value: high.toFixed(2) },
            { label: 'L', value: low.toFixed(2) },
            { label: 'C', value: close.toFixed(2) },
          ];

          priceItems.forEach(({ label, value }) => {
            const item = document.createElement('div');
            item.className = 'flex items-center';

            const labelSpan = document.createElement('span');
            labelSpan.className =
              'mr-1 font-medium text-slate-500 dark:text-slate-400';
            labelSpan.textContent = label;

            const valueSpan = document.createElement('span');
            valueSpan.className =
              'font-semibold text-slate-900 dark:text-slate-100';
            valueSpan.textContent = value;

            item.appendChild(labelSpan);
            item.appendChild(valueSpan);
            priceSection.appendChild(item);
          });
        } else if ('value' in data) {
          const { value } = data as LineData;
          const item = document.createElement('div');
          item.className = 'flex items-center';

          const labelSpan = document.createElement('span');
          labelSpan.className =
            'mr-1 font-medium text-slate-500 dark:text-slate-400';
          labelSpan.textContent = 'Price';

          const valueSpan = document.createElement('span');
          valueSpan.className =
            'font-semibold text-slate-900 dark:text-slate-100';
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

    // Create loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className =
      'absolute hidden p-2 rounded-lg shadow-md top-12 left-2 glass-card';
    loadingIndicator.innerHTML = `
      <div class="flex items-center gap-2 text-sm">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span class="text-slate-700 dark:text-slate-300">Loading historical data...</span>
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
    obj?.name,
    obj?.symbol,
    timeframe,
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

  // Update timeframe badge
  useEffect(() => {
    if (timeframeBadgeRef.current) {
      timeframeBadgeRef.current.textContent = `${timeframe}m`;
    }
  }, [timeframe]);

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
    return () => {
      if (mainChartRef.current) {
        mainChartRef.current.remove();
        mainChartRef.current = null;
      }
      legendContainerRef.current = null;
      seriesRef.current = null;
      emaSeriesRef.current = null;
      bollingerBandsSeriesRefs.current.upper = null;
      bollingerBandsSeriesRefs.current.middle = null;
      bollingerBandsSeriesRefs.current.lower = null;
    };
  }, []);

  return (
    <div ref={mainChartContainerRef} className="relative w-full h-full">
      {/* Chart will be rendered here */}
    </div>
  );
};

export default MainChart;
