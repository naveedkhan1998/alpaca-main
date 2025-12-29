/**
 * IndicatorPanel Component
 *
 * A dynamic indicator panel that can render any panel-type indicator.
 * Supports multiple output series (lines, histograms) and reference lines.
 */

import React, { useEffect, useRef, useCallback, memo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ITimeScaleApi,
  Time,
  LineData,
  HistogramData,
  LineSeries,
  HistogramSeries,
  MouseEventParams,
} from 'lightweight-charts';
import { getBaseChartOptions } from '../lib/chartOptions';
import { useResizeObserver } from '../hooks/useResizeObserver';
import type {
  CalculatedIndicator,
  LineIndicatorOutput,
  MultiLineIndicatorOutput,
} from '../lib/indicators';
import type { LineWidth } from 'lightweight-charts';
import { Button } from '@/components/ui/button';
import { HiX, HiCog, HiEye, HiEyeOff } from 'react-icons/hi';
import { useIndicatorUI } from '../context';

interface IndicatorPanelProps {
  /** The calculated indicator to render */
  indicator: CalculatedIndicator;
  /** Whether dark mode is enabled */
  isDarkMode: boolean;
  /** Callback to set the time scale for sync */
  setTimeScale?: (timeScale: ITimeScaleApi<Time>) => void;
  /** Main chart's time scale for syncing */
  mainTimeScale?: ITimeScaleApi<Time> | null;
  /** Callback to remove this indicator */
  onRemove?: (instanceId: string) => void;
  /** Callback to toggle visibility */
  onToggleVisibility?: (instanceId: string) => void;
}

// Cache chart options by mode
const getIndicatorChartOptions = (() => {
  const cache = new Map<boolean, ReturnType<typeof getBaseChartOptions>>();
  return (isDarkMode: boolean) => {
    if (!cache.has(isDarkMode)) {
      const baseOptions = getBaseChartOptions(isDarkMode);
      cache.set(isDarkMode, {
        ...baseOptions,
        layout: { ...baseOptions.layout, fontSize: 11 },
        timeScale: { ...baseOptions.timeScale, visible: true },
        rightPriceScale: {
          ...baseOptions.rightPriceScale,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        grid: {
          vertLines: { ...(baseOptions.grid?.vertLines ?? {}), visible: false },
          horzLines: baseOptions.grid?.horzLines,
        },
      });
    }
    return cache.get(isDarkMode)!;
  };
})();

const IndicatorPanel: React.FC<IndicatorPanelProps> = memo(
  ({
    indicator,
    isDarkMode,
    setTimeScale,
    mainTimeScale,
    onRemove,
    onToggleVisibility,
  }) => {
    const { openConfig } = useIndicatorUI();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRefs = useRef<Map<string, ISeriesApi<'Line' | 'Histogram'>>>(
      new Map()
    );
    const legendRef = useRef<HTMLDivElement | null>(null);
    const isInitializedRef = useRef(false);
    const prevOutputTypeRef = useRef<string | null>(null);
    // Track last data length and values for realtime updates
    const prevDataLengthRef = useRef<number>(0);
    const lastTimeRef = useRef<Time | null>(null);
    const lastValuesRef = useRef<Map<string, number>>(new Map());
    // Track if we've done initial sync
    const initialSyncDoneRef = useRef(false);
    // State to trigger re-render when chart is ready
    const [chartReady, setChartReady] = React.useState(false);

    const { instance, definition, output, error } = indicator;

    // Get display label
    const displayLabel =
      instance.label ||
      `${definition.shortName}(${instance.config.period || ''})`;

    // Initialize chart - deferred until container has dimensions
    useEffect(() => {
      const containerEl = containerRef.current;
      if (!containerEl || chartRef.current) return;

      // Function to create the chart once we have valid dimensions
      const initChart = () => {
        if (chartRef.current) return; // Already initialized

        const rect = containerEl.getBoundingClientRect();
        // Only initialize if we have valid dimensions
        if (rect.width < 10 || rect.height < 10) return false;

        const chart = createChart(
          containerEl,
          getIndicatorChartOptions(isDarkMode)
        );
        chart.applyOptions({ width: rect.width, height: rect.height });

        chartRef.current = chart;
        isInitializedRef.current = true;
        setChartReady(true);

        if (setTimeScale) {
          setTimeScale(chart.timeScale());
        }

        // Create legend container
        const legend = document.createElement('div');
        legend.className =
          'absolute z-10 flex items-center gap-2 px-2 py-1 text-xs border rounded-lg top-2 left-2 bg-card/95 border-border/50';
        containerEl.appendChild(legend);
        legendRef.current = legend;

        // Subscribe to crosshair for legend updates - debounced
        let rafId: number | null = null;
        chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
          if (!legendRef.current || rafId !== null) return;

          rafId = requestAnimationFrame(() => {
            updateLegendContent(param);
            rafId = null;
          });
        });

        return true;
      };

      // Try to initialize immediately
      if (initChart()) return;

      // If container doesn't have valid dimensions, use ResizeObserver to wait
      const resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0];
        if (
          entry &&
          entry.contentRect.width > 10 &&
          entry.contentRect.height > 10
        ) {
          if (initChart()) {
            resizeObserver.disconnect();
          }
        }
      });
      resizeObserver.observe(containerEl);

      return () => {
        resizeObserver.disconnect();
        if (chartRef.current) {
          chartRef.current.remove();
          chartRef.current = null;
          seriesRefs.current.clear();
          isInitializedRef.current = false;
        }
        if (legendRef.current && containerEl) {
          containerEl.removeChild(legendRef.current);
          legendRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update legend with current values
    const updateLegendContent = useCallback(
      (param: MouseEventParams<Time>) => {
        if (!legendRef.current) return;

        const parts: string[] = [
          `<span class="font-semibold">${displayLabel}</span>`,
        ];

        seriesRefs.current.forEach((series, key) => {
          const data = param.seriesData.get(series);
          if (data && 'value' in data) {
            const outputDef = definition.outputs.find(o => o.key === key);
            const label = outputDef?.label || key;
            const color =
              (instance.config[`${key}Color`] as string) ||
              outputDef?.defaultColor ||
              '#888';
            parts.push(
              `<span style="color: ${color}">${label}: ${Number(data.value).toFixed(2)}</span>`
            );
          }
        });

        const html = parts.join(
          ' <span class="text-muted-foreground">|</span> '
        );
        if (legendRef.current.innerHTML !== html) {
          legendRef.current.innerHTML = html;
        }
      },
      [definition.outputs, displayLabel, instance.config]
    );

    // Resize observer - stable callback
    const handleResize = useCallback((rect: DOMRectReadOnly) => {
      if (chartRef.current) {
        chartRef.current.applyOptions({
          width: rect.width,
          height: rect.height,
        });
      }
    }, []);

    useResizeObserver(containerRef, handleResize);

    // Update chart styling when dark mode changes
    useEffect(() => {
      if (chartRef.current) {
        chartRef.current.applyOptions(getIndicatorChartOptions(isDarkMode));
      }
    }, [isDarkMode]);

    // Subscribe to main chart's time scale changes for continuous sync
    useEffect(() => {
      if (!chartReady || !mainTimeScale || !chartRef.current) return;

      const handleMainTimeScaleChange = () => {
        if (!chartRef.current) return;
        const visibleRange = mainTimeScale.getVisibleRange();
        if (visibleRange) {
          try {
            chartRef.current.timeScale().setVisibleRange(visibleRange);
          } catch {
            // Ignore sync errors
          }
        }
      };

      // Subscribe to visible time range changes
      mainTimeScale.subscribeVisibleTimeRangeChange(handleMainTimeScaleChange);

      // Initial sync
      handleMainTimeScaleChange();

      return () => {
        mainTimeScale.unsubscribeVisibleTimeRangeChange(
          handleMainTimeScaleChange
        );
      };
    }, [chartReady, mainTimeScale]);

    // Update series data when output changes - optimized for realtime updates
    useEffect(() => {
      if (
        !chartReady ||
        !chartRef.current ||
        !output ||
        !isInitializedRef.current
      )
        return;

      const chart = chartRef.current;
      const outputType = output.type;

      // Only clear series if output type changed
      if (
        prevOutputTypeRef.current !== null &&
        prevOutputTypeRef.current !== outputType
      ) {
        seriesRefs.current.forEach(series => {
          try {
            chart.removeSeries(series);
          } catch {
            // Series might already be removed
          }
        });
        seriesRefs.current.clear();
        lastValuesRef.current.clear();
        prevDataLengthRef.current = 0;
        lastTimeRef.current = null;
      }
      prevOutputTypeRef.current = outputType;

      // Helper to check if we can do an incremental update
      const canDoIncrementalUpdate = (
        data: { time: Time; value: number }[]
      ): boolean => {
        if (data.length === 0) return false;
        const lastPoint = data[data.length - 1];
        return (
          prevDataLengthRef.current > 0 &&
          data.length === prevDataLengthRef.current &&
          lastPoint.time === lastTimeRef.current
        );
      };

      // Helper to update series efficiently
      const updateSeriesData = (
        series: ISeriesApi<'Line' | 'Histogram'>,
        data: { time: Time; value: number }[],
        seriesKey: string
      ) => {
        if (data.length === 0) return;

        const lastPoint = data[data.length - 1];

        if (canDoIncrementalUpdate(data)) {
          // Check if the value actually changed
          const prevValue = lastValuesRef.current.get(seriesKey);
          if (lastPoint.value !== prevValue) {
            try {
              series.update(lastPoint as LineData<Time>);
            } catch {
              series.setData(data as LineData<Time>[]);
            }
            lastValuesRef.current.set(seriesKey, lastPoint.value);
          }
          // If value hasn't changed, skip the update
        } else {
          // Full data set needed
          series.setData(data as LineData<Time>[]);
          lastValuesRef.current.set(seriesKey, lastPoint.value);
        }
      };

      // Create series based on output type
      if (output.type === 'line') {
        const lineOutput = output as LineIndicatorOutput;
        const outputDef = definition.outputs[0];
        const seriesKey = outputDef?.key || 'value';

        let series = seriesRefs.current.get(seriesKey) as
          | ISeriesApi<'Line'>
          | undefined;
        const color =
          (instance.config.color as string) ||
          outputDef?.defaultColor ||
          '#F59E0B';

        if (!series) {
          series = chart.addSeries(LineSeries, {
            color,
            lineWidth: ((outputDef?.lineWidth as number) || 2) as LineWidth,
            lineStyle: (outputDef?.lineStyle as number) || 0,
            crosshairMarkerVisible: true,
            lastValueVisible: true,
          });
          seriesRefs.current.set(seriesKey, series);
        } else {
          // Update series color if it changed
          series.applyOptions({ color });
        }

        updateSeriesData(series, lineOutput.data, seriesKey);

        // Update tracking refs
        if (lineOutput.data.length > 0) {
          lastTimeRef.current =
            lineOutput.data[lineOutput.data.length - 1].time;
          prevDataLengthRef.current = lineOutput.data.length;
        }
      } else if (output.type === 'multi-line') {
        const multiOutput = output as MultiLineIndicatorOutput;
        let maxDataLength = 0;
        let lastTime: Time | null = null;

        Object.entries(multiOutput.series).forEach(([key, data]) => {
          const outputDef = definition.outputs.find(o => o.key === key);
          if (!outputDef) return;

          let series = seriesRefs.current.get(key);

          if (outputDef.type === 'histogram') {
            const color =
              (instance.config[`${key}Color`] as string) ||
              outputDef.defaultColor;

            if (!series) {
              series = chart.addSeries(HistogramSeries, {
                color,
                priceFormat: { type: 'price' },
              });
              seriesRefs.current.set(key, series);
            } else {
              // Update histogram color if it changed
              series.applyOptions({ color });
            }

            // Handle histogram realtime updates
            const histData = data as HistogramData<Time>[];
            if (histData.length > 0) {
              const lastPoint = histData[histData.length - 1];
              const isSameLength =
                prevDataLengthRef.current > 0 &&
                histData.length === prevDataLengthRef.current;
              const isSameTime = lastPoint.time === lastTimeRef.current;

              if (isSameLength && isSameTime) {
                const prevValue = lastValuesRef.current.get(key);
                if (lastPoint.value !== prevValue) {
                  try {
                    series.update(lastPoint);
                  } catch {
                    series.setData(histData);
                  }
                  lastValuesRef.current.set(key, lastPoint.value);
                }
              } else {
                series.setData(histData);
                lastValuesRef.current.set(key, lastPoint.value);
              }

              if (histData.length > maxDataLength) {
                maxDataLength = histData.length;
                lastTime = lastPoint.time;
              }
            }
          } else {
            const color =
              (instance.config[`${key}Color`] as string) ||
              outputDef.defaultColor;

            if (!series) {
              series = chart.addSeries(LineSeries, {
                color,
                lineWidth: ((outputDef.lineWidth as number) || 2) as LineWidth,
                lineStyle: (outputDef.lineStyle as number) || 0,
                crosshairMarkerVisible: true,
                lastValueVisible: key === definition.outputs[0]?.key,
              });
              seriesRefs.current.set(key, series);
            } else {
              // Update line color if it changed
              series.applyOptions({ color });
            }

            const lineData = data as LineData<Time>[];
            updateSeriesData(series as ISeriesApi<'Line'>, lineData, key);

            if (lineData.length > maxDataLength) {
              maxDataLength = lineData.length;
              lastTime = lineData[lineData.length - 1].time;
            }
          }
        });

        // Update tracking refs for multi-line
        if (maxDataLength > 0 && lastTime !== null) {
          prevDataLengthRef.current = maxDataLength;
          lastTimeRef.current = lastTime;
        }
      }

      // Update legend with last values
      if (legendRef.current) {
        const parts: string[] = [
          `<span class="font-semibold">${displayLabel}</span>`,
        ];

        seriesRefs.current.forEach((_series, key) => {
          const outputDef = definition.outputs.find(o => o.key === key);
          const label = outputDef?.label || key;
          const color =
            (instance.config[`${key}Color`] as string) ||
            outputDef?.defaultColor ||
            '#888';

          // Get last value
          if (output.type === 'line') {
            const lastPoint = (output as LineIndicatorOutput).data.at(-1);
            if (lastPoint) {
              parts.push(
                `<span style="color: ${color}">${label}: ${lastPoint.value.toFixed(2)}</span>`
              );
            }
          } else if (output.type === 'multi-line') {
            const seriesData = (output as MultiLineIndicatorOutput).series[key];
            const lastPoint = seriesData?.at(-1);
            if (lastPoint && 'value' in lastPoint) {
              parts.push(
                `<span style="color: ${color}">${label}: ${Number(lastPoint.value).toFixed(2)}</span>`
              );
            }
          }
        });

        const html = parts.join(
          ' <span class="text-muted-foreground">|</span> '
        );
        if (legendRef.current.innerHTML !== html) {
          legendRef.current.innerHTML = html;
        }
      }

      // Draw reference lines if defined - only once per output type change
      if (definition.referenceLines && definition.referenceLines.length > 0) {
        definition.referenceLines.forEach((refLine, idx) => {
          const refKey = `_ref_${idx}`;
          if (seriesRefs.current.has(refKey)) return; // Already created

          if (
            output.type === 'line' &&
            (output as LineIndicatorOutput).data.length > 0
          ) {
            const lineOutput = output as LineIndicatorOutput;
            const refData: LineData<Time>[] = [
              { time: lineOutput.data[0].time, value: refLine.value },
              {
                time: lineOutput.data[lineOutput.data.length - 1].time,
                value: refLine.value,
              },
            ];

            const refSeries = chart.addSeries(LineSeries, {
              color: refLine.color || '#6B7280',
              lineWidth: 1,
              lineStyle:
                refLine.style === 'dashed'
                  ? 2
                  : refLine.style === 'dotted'
                    ? 1
                    : 0,
              crosshairMarkerVisible: false,
              lastValueVisible: false,
              priceLineVisible: false,
            });
            refSeries.setData(refData);
            seriesRefs.current.set(refKey, refSeries);
          }
        });
      }

      // Sync with main chart's time scale after data is set
      if (!initialSyncDoneRef.current && mainTimeScale && chartRef.current) {
        const visibleRange = mainTimeScale.getVisibleRange();
        if (visibleRange) {
          try {
            chartRef.current.timeScale().setVisibleRange(visibleRange);
            initialSyncDoneRef.current = true;
          } catch {
            // Ignore sync errors during initial setup
          }
        }
      }
    }, [
      chartReady,
      output,
      definition,
      instance.config,
      displayLabel,
      mainTimeScale,
    ]);

    // Error state
    if (error) {
      return (
        <div className="relative flex items-center justify-center w-full h-full border rounded-lg bg-card">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full overflow-hidden group">
        {/* Control buttons - visible on hover */}
        <div className="absolute z-20 flex items-center gap-1 transition-opacity opacity-0 top-2 right-2 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 bg-card/80 hover:bg-card"
            onClick={() => openConfig(instance.instanceId)}
          >
            <HiCog className="w-3.5 h-3.5" />
          </Button>
          {onToggleVisibility && (
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 bg-card/80 hover:bg-card"
              onClick={() => onToggleVisibility(instance.instanceId)}
            >
              {instance.visible ? (
                <HiEye className="w-3.5 h-3.5" />
              ) : (
                <HiEyeOff className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 bg-card/80 hover:bg-card hover:text-destructive"
              onClick={() => onRemove(instance.instanceId)}
            >
              <HiX className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Chart container - absolute positioning ensures it fills the panel */}
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    );
  }
);

IndicatorPanel.displayName = 'IndicatorPanel';

export default IndicatorPanel;
