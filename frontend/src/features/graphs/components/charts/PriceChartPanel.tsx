/**
 * PriceChartPanel.tsx
 *
 * Component rendering the main price chart panel using lightweight-charts.
 * Handles chart initialization, series creation, data updates, legend display,
 * overlay indicators, volume overlay, and responsive resizing.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useCallback, memo } from 'react';
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
  HistogramSeries,
} from 'lightweight-charts';

import { useAppSelector } from 'src/app/hooks';
import { selectAutoRefresh, selectChartType } from '../../graphSlice';
import { getBaseChartOptions } from '../../lib/chartOptions';
import { createSeriesForType } from '../../lib/createSeries';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { useIndicatorUI } from '../../context';
import type { CalculatedIndicator } from '../../lib/indicators';

interface PriceChartPanelProps {
  seriesData: (BarData | LineData | HistogramData)[];
  volumeData?: HistogramData<Time>[];
  showVolume?: boolean;
  mode: boolean;
  setTimeScale: (timeScale: ITimeScaleApi<Time>) => void;
  overlayIndicators: CalculatedIndicator[];
  onLoadMoreData: () => void;
  isLoadingMore: boolean;
  hasMoreData: boolean;
  // Replay state for legend filtering
  isReplayEnabled?: boolean;
  replayStep?: number;
  chartTypeOverride?: SeriesType;
}

// Memoized chart options to avoid recreation
const getChartOptionsForMode = (() => {
  const cache = new Map<boolean, ReturnType<typeof getBaseChartOptions>>();
  return (mode: boolean) => {
    if (!cache.has(mode)) {
      cache.set(mode, getBaseChartOptions(mode));
    }
    return cache.get(mode)!;
  };
})();

// Helper to compare data points for realtime updates
// Returns true if points are equal (no update needed)
const areDataPointsEqual = (
  a: BarData | LineData | HistogramData,
  b: BarData | LineData | HistogramData
): boolean => {
  // Check OHLC data (candlestick/bar)
  if ('open' in a && 'open' in b) {
    const barA = a as BarData;
    const barB = b as BarData;
    return (
      barA.open === barB.open &&
      barA.high === barB.high &&
      barA.low === barB.low &&
      barA.close === barB.close
    );
  }
  // Check line/histogram data
  if ('value' in a && 'value' in b) {
    return (a as LineData).value === (b as LineData).value;
  }
  return false;
};

const PriceChartPanel: React.FC<PriceChartPanelProps> = memo(
  ({
    seriesData,
    volumeData,
    showVolume = false,
    mode,
    setTimeScale,
    overlayIndicators,
    onLoadMoreData,
    isLoadingMore,
    hasMoreData,
    isReplayEnabled = false,
    replayStep = 0,
    chartTypeOverride,
  }) => {
    const reduxChartType = useAppSelector(selectChartType);
    const chartType = chartTypeOverride || reduxChartType;
    const autoRefresh = useAppSelector(selectAutoRefresh);
    const { openConfig, removeIndicator } = useIndicatorUI();
    const mainChartContainerRef = useRef<HTMLDivElement | null>(null);
    const mainChartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

    // Store refs for overlay indicator series - keyed by instanceId
    const overlaySeriesRefs = useRef<Map<string, ISeriesApi<'Line'>[]>>(
      new Map()
    );

    // Keep volumeData in ref for chart initialization
    const volumeDataRef = useRef(volumeData);
    const showVolumeRef = useRef(showVolume);

    const prevChartTypeRef = useRef<SeriesType>(chartType);
    const prevSeriesDataLengthRef = useRef<number>(0);
    const legendContainerRef = useRef<HTMLDivElement | null>(null);
    const priceSectionRef = useRef<HTMLDivElement | null>(null);
    const overlaySectionRef = useRef<HTMLDivElement | null>(null);
    const onLoadMoreDataRef = useRef(onLoadMoreData);
    const isLoadingMoreRef = useRef(isLoadingMore);
    // Keep seriesData in ref for crosshair callback to avoid stale closure
    const seriesDataRef = useRef(seriesData);
    // Keep overlay indicators in ref for crosshair callback
    const overlayIndicatorsRef = useRef(overlayIndicators);
    // Keep openConfig and removeIndicator in refs for event handlers
    const openConfigRef = useRef(openConfig);
    const removeIndicatorRef = useRef(removeIndicator);
    // Keep replay state in refs for crosshair callback
    const isReplayEnabledRef = useRef(isReplayEnabled);
    const replayStepRef = useRef(replayStep);

    // Track last data point to optimize setData calls - includes time and values for realtime updates
    const lastDataTimeRef = useRef<Time | null>(null);
    const lastDataPointRef = useRef<
      (BarData | LineData | HistogramData) | null
    >(null);

    useEffect(() => {
      onLoadMoreDataRef.current = onLoadMoreData;
    }, [onLoadMoreData]);

    useEffect(() => {
      isLoadingMoreRef.current = isLoadingMore;
    }, [isLoadingMore]);

    // Keep seriesData ref updated
    useEffect(() => {
      seriesDataRef.current = seriesData;
    }, [seriesData]);

    // Keep overlay indicators ref updated
    useEffect(() => {
      overlayIndicatorsRef.current = overlayIndicators;
    }, [overlayIndicators]);

    // Keep openConfig and removeIndicator refs updated
    useEffect(() => {
      openConfigRef.current = openConfig;
    }, [openConfig]);

    useEffect(() => {
      removeIndicatorRef.current = removeIndicator;
    }, [removeIndicator]);

    // Keep replay state refs updated
    useEffect(() => {
      isReplayEnabledRef.current = isReplayEnabled;
    }, [isReplayEnabled]);

    useEffect(() => {
      replayStepRef.current = replayStep;
    }, [replayStep]);

    // Keep volume refs updated
    useEffect(() => {
      volumeDataRef.current = volumeData;
    }, [volumeData]);

    useEffect(() => {
      showVolumeRef.current = showVolume;
    }, [showVolume]);

    // Memoize series creation to prevent recreation
    const createSeries = useCallback(
      (chart: IChartApi, type: SeriesType): ISeriesApi<SeriesType> =>
        createSeriesForType(chart, type, mode, seriesData as any),
      [mode, seriesData]
    );

    // Optimized legend update function - reuses DOM elements
    const updateLegend = useCallback(
      (data: any | null, _time?: Time, volume?: number) => {
        const priceSection = priceSectionRef.current;
        if (!priceSection) return;

        if (!data) return;

        // Helper to format volume with K/M/B suffixes
        const formatVolume = (vol: number): string => {
          if (vol >= 1_000_000_000)
            return (vol / 1_000_000_000).toFixed(2) + 'B';
          if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(2) + 'M';
          if (vol >= 1_000) return (vol / 1_000).toFixed(2) + 'K';
          return vol.toFixed(0);
        };

        // Determine chart display type
        const isOHLC = chartType === 'Candlestick' || chartType === 'Bar';

        if (isOHLC && 'open' in data) {
          const { open, high, low, close } = data as BarData;
          const isUp = close >= open;

          const priceItems = [
            { label: 'O', value: open.toFixed(2) },
            { label: 'H', value: high.toFixed(2) },
            { label: 'L', value: low.toFixed(2) },
            { label: 'C', value: close.toFixed(2) },
          ];

          if (showVolumeRef.current && volume !== undefined) {
            priceItems.push({ label: 'V', value: formatVolume(volume) });
          }

          // Build HTML string
          const html = priceItems
            .map(
              ({ label, value }) =>
                `<div class="flex items-baseline gap-1">
                 <span class="text-muted-foreground font-semibold">${label}</span>
                 <span class="font-mono ${label === 'C' ? (isUp ? 'text-success' : 'text-destructive') : 'text-foreground'}">${value}</span>
               </div>`
            )
            .join('');

          if (priceSection.innerHTML !== html) {
            priceSection.innerHTML = html;
          }
        } else if ('value' in data) {
          const value = (data as LineData).value;
          const html = `<div class="flex items-baseline gap-1">
            <span class="text-muted-foreground font-semibold">Value</span>
            <span class="font-mono text-foreground">${value.toFixed(2)}</span>
          </div>`;
          if (priceSection.innerHTML !== html) {
            priceSection.innerHTML = html;
          }
        }
      },
      [chartType]
    );

    // Keep updateLegend in ref for crosshair callback
    const updateLegendRef = useRef(updateLegend);
    useEffect(() => {
      updateLegendRef.current = updateLegend;
    }, [updateLegend]);

    // Update overlay indicators legend
    const updateOverlayLegend = useCallback((param: MouseEventParams<Time>) => {
      const overlaySection = overlaySectionRef.current;
      if (!overlaySection) return;

      const indicators = overlayIndicatorsRef.current;
      if (!indicators || indicators.length === 0) {
        overlaySection.style.display = 'none';
        return;
      }

      overlaySection.style.display = 'flex';

      // Build HTML for each overlay indicator with settings icon
      const overlayItems: string[] = [];

      indicators.forEach(indicator => {
        const { instance, definition, output } = indicator;
        if (!output) return;

        const displayLabel =
          instance.label ||
          `${definition.shortName}(${instance.config.period || ''})`;

        // Get values based on output type
        let valueHtml = '';

        if (output.type === 'line' && output.data.length > 0) {
          // Single line indicator
          const color =
            (instance.config.color as string) ||
            definition.outputs[0]?.defaultColor ||
            '#FBBF24';

          // Try to get value at crosshair time, fallback to last value
          const seriesArr = overlaySeriesRefs.current.get(instance.instanceId);
          let value: number | undefined;
          if (seriesArr && seriesArr[0] && param.seriesData) {
            const seriesData = param.seriesData.get(seriesArr[0]) as
              | LineData
              | undefined;
            value = seriesData?.value;
          }
          if (value === undefined) {
            value = output.data[output.data.length - 1]?.value;
          }
          if (value !== undefined) {
            valueHtml = `<span style="color: ${color}" class="font-medium">${value.toFixed(2)}</span>`;
          }
        } else if (output.type === 'band') {
          // Band indicator
          const upperColor =
            (instance.config.upperColor as string) ||
            definition.outputs.find(o => o.key === 'upper')?.defaultColor ||
            '#FBBF24';
          const middleColor =
            (instance.config.middleColor as string) ||
            definition.outputs.find(o => o.key === 'middle')?.defaultColor ||
            '#60A5FA';
          const lowerColor =
            (instance.config.lowerColor as string) ||
            definition.outputs.find(o => o.key === 'lower')?.defaultColor ||
            '#EF4444';

          const seriesArr = overlaySeriesRefs.current.get(instance.instanceId);
          let upperVal: number | undefined;
          let middleVal: number | undefined;
          let lowerVal: number | undefined;

          if (seriesArr && seriesArr.length >= 3 && param.seriesData) {
            const upperData = param.seriesData.get(seriesArr[0]) as
              | LineData
              | undefined;
            const middleData = param.seriesData.get(seriesArr[1]) as
              | LineData
              | undefined;
            const lowerData = param.seriesData.get(seriesArr[2]) as
              | LineData
              | undefined;
            upperVal = upperData?.value;
            middleVal = middleData?.value;
            lowerVal = lowerData?.value;
          }

          // Fallback to last values
          if (upperVal === undefined && output.upper.length > 0) {
            upperVal = output.upper[output.upper.length - 1]?.value;
          }
          if (middleVal === undefined && output.middle.length > 0) {
            middleVal = output.middle[output.middle.length - 1]?.value;
          }
          if (lowerVal === undefined && output.lower.length > 0) {
            lowerVal = output.lower[output.lower.length - 1]?.value;
          }

          if (
            upperVal !== undefined &&
            middleVal !== undefined &&
            lowerVal !== undefined
          ) {
            valueHtml = `<span style="color: ${upperColor}" class="font-medium">${upperVal.toFixed(2)}</span> <span style="color: ${middleColor}" class="font-medium">${middleVal.toFixed(2)}</span> <span style="color: ${lowerColor}" class="font-medium">${lowerVal.toFixed(2)}</span>`;
          }
        } else if (output.type === 'multi-line') {
          // Multi-line indicator
          const parts: string[] = [];
          const seriesArr = overlaySeriesRefs.current.get(instance.instanceId);

          definition.outputs.forEach((outputDef, idx) => {
            const colorKey = outputDef.key + 'Color';
            const color =
              (instance.config[colorKey] as string) ||
              (instance.config[outputDef.key] as string) ||
              outputDef.defaultColor ||
              '#888';

            let value: number | undefined;
            if (seriesArr && seriesArr[idx] && param.seriesData) {
              const seriesData = param.seriesData.get(seriesArr[idx]) as
                | LineData
                | undefined;
              value = seriesData?.value;
            }
            if (value === undefined) {
              const data = output.series[outputDef.key];
              if (data && data.length > 0) {
                const lastPoint = data[data.length - 1];
                if ('value' in lastPoint) {
                  value = lastPoint.value;
                }
              }
            }
            if (value !== undefined) {
              parts.push(
                `<span style="color: ${color}" class="font-medium">${value.toFixed(2)}</span>`
              );
            }
          });
          valueHtml = parts.join(' ');
        }

        // Build the indicator item - compact inline style with settings and remove icons on right
        const settingsIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
        const removeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

        overlayItems.push(`
            <div class="inline-flex items-center gap-1.5 group/ind px-1.5 py-0.5 rounded hover:bg-muted/50 transition-colors pointer-events-auto">
              <span class="font-medium text-foreground">${displayLabel}</span>
              ${valueHtml}
              <div class="flex items-center opacity-0 group-hover/ind:opacity-100 transition-opacity ml-1">
                <button 
                  class="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer" 
                  data-config-id="${instance.instanceId}"
                  title="Configure ${displayLabel}"
                >${settingsIconSvg}</button>
                <button 
                  class="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer" 
                  data-remove-id="${instance.instanceId}"
                  title="Remove ${displayLabel}"
                >${removeIconSvg}</button>
              </div>
            </div>
          `);
      });

      const html = overlayItems.join('');
      if (overlaySection.innerHTML !== html) {
        overlaySection.innerHTML = html;

        // Add click handlers for settings buttons
        overlaySection.querySelectorAll('[data-config-id]').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const instanceId = (btn as HTMLElement).dataset.configId;
            if (instanceId) {
              openConfigRef.current(instanceId);
            }
          });
        });

        // Add click handlers for remove buttons
        overlaySection.querySelectorAll('[data-remove-id]').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const instanceId = (btn as HTMLElement).dataset.removeId;
            if (instanceId) {
              removeIndicatorRef.current(instanceId);
            }
          });
        });
      }
    }, []);

    // Keep updateOverlayLegend in ref for crosshair callback
    const updateOverlayLegendRef = useRef(updateOverlayLegend);
    useEffect(() => {
      updateOverlayLegendRef.current = updateOverlayLegend;
    }, [updateOverlayLegend]);

    // Store mode in ref to avoid stale closure in initialization
    const modeRef = useRef(mode);
    useEffect(() => {
      modeRef.current = mode;
    }, [mode]);

    // Initialize chart only once - no dependencies to prevent recreation
    useEffect(() => {
      const containerEl = mainChartContainerRef.current;
      if (!containerEl) return;

      // Don't re-create if chart already exists
      if (mainChartRef.current) return;

      // Capture ref for cleanup
      const currentOverlaySeriesRefs = overlaySeriesRefs.current;

      containerEl.innerHTML = '';

      const chart = createChart(
        containerEl,
        getChartOptionsForMode(modeRef.current)
      );

      mainChartRef.current = chart;
      setTimeScale(chart.timeScale());

      // Set initial size - use container dimensions or fallback to reasonable defaults
      const rect = containerEl.getBoundingClientRect();
      const width =
        rect.width > 0 ? rect.width : containerEl.clientWidth || 800;
      const height =
        rect.height > 0 ? rect.height : containerEl.clientHeight || 400;
      chart.applyOptions({ width, height });

      // Create legend with reusable DOM structure
      const legendContainer = document.createElement('div');
      legendContainer.className =
        'absolute px-3 py-2 border rounded-md top-2 left-2 bg-background/80 backdrop-blur-md border-border/50 shadow-sm transition-all duration-200 select-none pointer-events-none z-20';

      // OHLC section - reuse element
      const priceSection = document.createElement('div');
      priceSection.className =
        'flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium';
      legendContainer.appendChild(priceSection);
      priceSectionRef.current = priceSection;

      // Overlay indicators section - inside the legend but as a separate row
      const overlaySection = document.createElement('div');
      overlaySection.className =
        'flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs border-t border-border/50 pt-1.5 empty:hidden';
      overlaySection.style.display = 'none';
      legendContainer.appendChild(overlaySection);
      overlaySectionRef.current = overlaySection;

      containerEl.appendChild(legendContainer);
      legendContainerRef.current = legendContainer;

      // Subscribe to crosshair - debounced via RAF
      let rafId: number | null = null;
      chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
        if (rafId !== null) return; // Skip if already scheduled

        rafId = requestAnimationFrame(() => {
          const data = param.seriesData.get(seriesRef.current!);
          // Get volume data if available
          const volumeData = volumeSeriesRef.current
            ? (param.seriesData.get(volumeSeriesRef.current) as
                | HistogramData<Time>
                | undefined)
            : undefined;
          const volume = volumeData?.value;

          if (data) {
            updateLegendRef.current(data, param.time, volume);
          } else if (seriesDataRef.current.length > 0) {
            const lastCandle =
              seriesDataRef.current[seriesDataRef.current.length - 1];
            // Get last volume from volumeDataRef
            const lastVolume =
              volumeDataRef.current && volumeDataRef.current.length > 0
                ? volumeDataRef.current[volumeDataRef.current.length - 1]?.value
                : undefined;
            updateLegendRef.current(lastCandle, lastCandle.time, lastVolume);
          }

          // Update overlay indicators legend
          updateOverlayLegendRef.current(param);

          rafId = null;
        });
      });

      // Create initial series and set data if available
      // This ensures data is displayed even if it arrived before chart initialization
      if (seriesDataRef.current.length > 0) {
        const series = createSeriesForType(
          chart,
          prevChartTypeRef.current,
          modeRef.current,
          seriesDataRef.current as any
        );
        seriesRef.current = series;
        series.setData(seriesDataRef.current as any);
        prevSeriesDataLengthRef.current = seriesDataRef.current.length;

        const lastPoint =
          seriesDataRef.current[seriesDataRef.current.length - 1];
        lastDataTimeRef.current = lastPoint.time;
        lastDataPointRef.current = { ...lastPoint };
      }

      // Create volume series overlay if data is available (TradingView style)
      if (
        showVolumeRef.current &&
        volumeDataRef.current &&
        volumeDataRef.current.length > 0
      ) {
        const volumeSeries = chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
          base: 0,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        chart.priceScale('volume').applyOptions({
          scaleMargins: { top: 0.85, bottom: 0 },
          borderVisible: false,
          visible: false,
        });
        volumeSeriesRef.current = volumeSeries;
        volumeSeries.setData(volumeDataRef.current);
      }

      // Cleanup function
      return () => {
        // Clean up volume series
        if (volumeSeriesRef.current) {
          try {
            chart.removeSeries(volumeSeriesRef.current);
          } catch {
            // Series already removed
          }
          volumeSeriesRef.current = null;
        }

        // Clean up overlay series
        currentOverlaySeriesRefs.forEach(seriesArr => {
          seriesArr.forEach(s => {
            try {
              chart.removeSeries(s);
            } catch {
              // Series already removed
            }
          });
        });
        currentOverlaySeriesRefs.clear();

        chart.remove();
        mainChartRef.current = null;
        legendContainerRef.current = null;
        priceSectionRef.current = null;
        overlaySectionRef.current = null;
        seriesRef.current = null;
      };
    }, [setTimeScale]);

    // Handle resize - memoized callback
    const handleResize = useCallback((rect: DOMRectReadOnly) => {
      if (mainChartRef.current) {
        mainChartRef.current.applyOptions({
          width: rect.width,
          height: rect.height,
        });
      }
    }, []);

    // Use shared resize hook
    useResizeObserver(mainChartContainerRef, handleResize);

    // Handle chart type changes - optimized to avoid unnecessary series recreation
    useEffect(() => {
      if (!mainChartRef.current) return;

      const chartTypeChanged = prevChartTypeRef.current !== chartType;

      if (chartTypeChanged) {
        if (seriesRef.current) {
          mainChartRef.current.removeSeries(seriesRef.current);
          seriesRef.current = null;
        }
        prevChartTypeRef.current = chartType;
      }

      if (!seriesRef.current) {
        seriesRef.current = createSeries(mainChartRef.current, chartType);
      }

      // Optimize data updates for realtime - use update() when only the last candle changes
      const dataLength = seriesData.length;
      const prevLength = prevSeriesDataLengthRef.current;

      if (dataLength > 0) {
        const lastPoint = seriesData[dataLength - 1];
        const lastTime = lastPoint.time;
        const prevPoint = lastDataPointRef.current;

        // Check if this is a realtime update to the latest candle
        const isSameLength = prevLength > 0 && dataLength === prevLength;
        const isSameTime = lastTime === lastDataTimeRef.current;

        // For realtime updates: same length, same time, but values may have changed
        if (isSameLength && isSameTime) {
          // Check if values actually changed (for OHLC candles or line data)
          const hasValuesChanged =
            !prevPoint || !areDataPointsEqual(prevPoint, lastPoint);

          if (hasValuesChanged) {
            // Use update() for efficient realtime candle updates
            try {
              seriesRef.current.update(lastPoint as any);
            } catch {
              // Fallback to setData if update fails
              seriesRef.current.setData(seriesData as any);
            }
          }
          // If values haven't changed, skip the update entirely
        } else {
          // Full data update needed (new candles added, historical data loaded, etc.)
          seriesRef.current.setData(seriesData as any);
        }

        lastDataTimeRef.current = lastTime;
        // Store a shallow copy of the last point for comparison
        lastDataPointRef.current = { ...lastPoint };
      }

      prevSeriesDataLengthRef.current = dataLength;
    }, [chartType, createSeries, seriesData]);

    // Handle theme changes - use cached options
    useEffect(() => {
      if (mainChartRef.current) {
        mainChartRef.current.applyOptions(getChartOptionsForMode(mode));
      }
    }, [mode]);

    // Handle volume overlay series - create/remove/update based on showVolume and volumeData
    useEffect(() => {
      if (!mainChartRef.current) return;

      if (showVolume && volumeData && volumeData.length > 0) {
        // Create volume series if it doesn't exist (TradingView style)
        if (!volumeSeriesRef.current) {
          const volumeSeries = mainChartRef.current.addSeries(HistogramSeries, {
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
            base: 0,
            lastValueVisible: false,
            priceLineVisible: false,
          });
          mainChartRef.current.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 },
            borderVisible: false,
            visible: false,
          });
          volumeSeriesRef.current = volumeSeries;
        }
        volumeSeriesRef.current.setData(volumeData);
      } else {
        // Remove volume series if showVolume is disabled
        if (volumeSeriesRef.current && mainChartRef.current) {
          try {
            mainChartRef.current.removeSeries(volumeSeriesRef.current);
          } catch {
            // Series already removed
          }
          volumeSeriesRef.current = null;
        }
      }
    }, [showVolume, volumeData]);

    // Handle visible range scroll - load more data when needed (throttled)
    useEffect(() => {
      if (!mainChartRef.current || !seriesRef.current) return;

      let throttleTimeout: ReturnType<typeof setTimeout> | null = null;
      const THROTTLE_MS = 100;

      const handleVisibleLogicalRangeChange = () => {
        if (!hasMoreData || !seriesRef.current || isLoadingMoreRef.current)
          return;
        if (throttleTimeout) return; // Already scheduled

        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;

          const logicalRange = mainChartRef.current
            ?.timeScale()
            .getVisibleLogicalRange();
          if (!logicalRange) return;

          const barsInfo = seriesRef.current?.barsInLogicalRange(logicalRange);
          if (barsInfo && barsInfo.barsBefore < 10) {
            onLoadMoreDataRef.current();
          }
        }, THROTTLE_MS);
      };

      const timeScale = mainChartRef.current.timeScale();
      timeScale.subscribeVisibleLogicalRangeChange(
        handleVisibleLogicalRangeChange
      );

      return () => {
        if (throttleTimeout) {
          clearTimeout(throttleTimeout);
        }
        if (mainChartRef.current) {
          mainChartRef.current
            .timeScale()
            .unsubscribeVisibleLogicalRangeChange(
              handleVisibleLogicalRangeChange
            );
        }
      };
    }, [hasMoreData]);

    // Handle overlay indicators rendering - optimized to minimize series recreation
    useEffect(() => {
      if (!mainChartRef.current) return;

      // Get current active instance IDs
      const activeInstanceIds = new Set(
        overlayIndicators.map(ind => ind.instance.instanceId)
      );

      // Remove series for indicators that are no longer active
      overlaySeriesRefs.current.forEach((seriesArr, instanceId) => {
        if (!activeInstanceIds.has(instanceId)) {
          seriesArr.forEach(series => {
            try {
              mainChartRef.current?.removeSeries(series);
            } catch {
              // Series may already be removed
            }
          });
          overlaySeriesRefs.current.delete(instanceId);
        }
      });

      // Add/update series for active overlay indicators
      overlayIndicators.forEach(indicator => {
        const { instance, output, definition } = indicator;
        if (!output) return;

        const instanceId = instance.instanceId;
        let seriesArr = overlaySeriesRefs.current.get(instanceId);

        // Determine the series needed based on output type
        if (output.type === 'line' && output.data.length > 0) {
          // Single line indicator (SMA, EMA, WMA, VWMA)
          const color =
            (instance.config.color as string) ||
            definition.outputs[0]?.defaultColor ||
            '#FBBF24';

          if (!seriesArr || seriesArr.length === 0) {
            const series = mainChartRef.current!.addSeries(LineSeries, {
              color: color,
              lineWidth: 2,
              lineStyle: 0, // Solid
              crosshairMarkerVisible: false,
              lastValueVisible: false,
            });
            seriesArr = [series];
            overlaySeriesRefs.current.set(instanceId, seriesArr);
          } else {
            // Update existing series color
            seriesArr[0].applyOptions({ color: color });
          }
          seriesArr[0].setData(output.data);
        } else if (output.type === 'band') {
          // Band indicator (Bollinger Bands, Keltner Channel)
          // Read user-configured colors from instance config
          const upperColor =
            (instance.config.upperColor as string) ||
            definition.outputs.find(o => o.key === 'upper')?.defaultColor ||
            '#FBBF24';
          const middleColor =
            (instance.config.middleColor as string) ||
            definition.outputs.find(o => o.key === 'middle')?.defaultColor ||
            '#60A5FA';
          const lowerColor =
            (instance.config.lowerColor as string) ||
            definition.outputs.find(o => o.key === 'lower')?.defaultColor ||
            '#EF4444';

          if (!seriesArr || seriesArr.length < 3) {
            // Clean up existing series
            seriesArr?.forEach(s => {
              try {
                mainChartRef.current?.removeSeries(s);
              } catch {
                // Series already removed
              }
            });

            // Create upper, middle, lower bands
            const upperSeries = mainChartRef.current!.addSeries(LineSeries, {
              color: upperColor,
              lineWidth: 1,
              lineStyle: 2, // Dashed
              crosshairMarkerVisible: false,
              lastValueVisible: false,
            });
            const middleSeries = mainChartRef.current!.addSeries(LineSeries, {
              color: middleColor,
              lineWidth: 1,
              lineStyle: 1, // Dotted
              crosshairMarkerVisible: false,
              lastValueVisible: false,
            });
            const lowerSeries = mainChartRef.current!.addSeries(LineSeries, {
              color: lowerColor,
              lineWidth: 1,
              lineStyle: 2, // Dashed
              crosshairMarkerVisible: false,
              lastValueVisible: false,
            });

            seriesArr = [upperSeries, middleSeries, lowerSeries];
            overlaySeriesRefs.current.set(instanceId, seriesArr);
          } else {
            // Update existing series colors
            seriesArr[0].applyOptions({ color: upperColor });
            seriesArr[1].applyOptions({ color: middleColor });
            seriesArr[2].applyOptions({ color: lowerColor });
          }

          if (output.upper.length > 0) {
            seriesArr[0].setData(output.upper);
            seriesArr[1].setData(output.middle);
            seriesArr[2].setData(output.lower);
          }
        } else if (output.type === 'multi-line') {
          // Multi-line overlay (Ichimoku)
          const seriesKeys = Object.keys(output.series);
          if (!seriesArr || seriesArr.length !== seriesKeys.length) {
            // Clean up existing series
            seriesArr?.forEach(s => {
              try {
                mainChartRef.current?.removeSeries(s);
              } catch {
                // Series already removed
              }
            });

            // Create series for each output
            seriesArr = definition.outputs.map(outputDef => {
              // Check if user has configured a color for this output
              const colorKey = outputDef.key + 'Color'; // e.g., 'tenkanColor', 'kijunColor'
              const color =
                (instance.config[colorKey] as string) ||
                (instance.config[outputDef.key] as string) ||
                outputDef.defaultColor;

              return mainChartRef.current!.addSeries(LineSeries, {
                color: color,
                lineWidth: (outputDef.lineWidth ?? 1) as 1 | 2 | 3 | 4,
                lineStyle: outputDef.lineStyle ?? 0,
                crosshairMarkerVisible: false,
                lastValueVisible: false,
              });
            });
            overlaySeriesRefs.current.set(instanceId, seriesArr);
          } else {
            // Update existing series colors
            definition.outputs.forEach((outputDef, idx) => {
              const colorKey = outputDef.key + 'Color';
              const color =
                (instance.config[colorKey] as string) ||
                (instance.config[outputDef.key] as string) ||
                outputDef.defaultColor;
              seriesArr![idx].applyOptions({ color: color });
            });
          }

          // Set data for each series
          seriesKeys.forEach((key, idx) => {
            if (seriesArr && seriesArr[idx]) {
              const data = output.series[key];
              if (data && data.length > 0) {
                seriesArr[idx].setData(data as LineData<Time>[]);
              }
            }
          });
        }
      });

      // Update overlay legend with current values (no crosshair param)
      updateOverlayLegendRef.current({} as MouseEventParams<Time>);
    }, [overlayIndicators, mode]);

    return (
      <div ref={mainChartContainerRef} className="relative w-full h-full group">
        {isLoadingMore && !autoRefresh && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-background/80 backdrop-blur px-4 py-2 rounded-full border border-border shadow-lg flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Loading history...</span>
          </div>
        )}
      </div>
    );
  }
);

PriceChartPanel.displayName = 'PriceChartPanel';

export default PriceChartPanel;
