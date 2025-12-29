/**
 * useIndicators Hook
 *
 * Manages indicator instances and their calculated outputs.
 * Supports multiple instances of the same indicator type with different configurations.
 * Includes ahead-buffering for efficient replay mode with cache eviction.
 */

import { useCallback, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { nanoid } from '@reduxjs/toolkit';
import type { Time, LineData, HistogramData } from 'lightweight-charts';
import type { Candle } from '@/types/common-types';
import { formatDate } from '@/lib/functions';
import {
  addIndicatorInstance,
  removeIndicatorInstance,
  updateIndicatorInstanceConfig,
  toggleIndicatorVisibility,
  selectIndicatorInstances,
} from '../graphSlice';
import {
  type IndicatorId,
  type IndicatorInstance,
  type IndicatorConfig,
  type OHLCVData,
  type CalculatedIndicator,
  type IndicatorOutput,
  getIndicator,
  getDefaultConfig,
  calculateIndicator,
} from '../lib/indicators';

// Buffer configuration
const REPLAY_BUFFER_AHEAD = 50; // Pre-calculate 50 steps ahead
const REPLAY_BUFFER_THRESHOLD = 10; // Recalculate when within 10 steps of buffer end

interface UseIndicatorsParams {
  candles: Candle[];
  /** Current replay display index (1-based). If undefined, indicators show all data. */
  replayDisplayIndex?: number;
  /** Whether replay mode is enabled */
  isReplayEnabled?: boolean;
}

interface UseIndicatorsReturn {
  /** All active indicator instances */
  instances: IndicatorInstance[];

  /** Calculated indicator data ready for rendering */
  calculatedIndicators: CalculatedIndicator[];

  /** Overlay indicators (to be rendered on main chart) */
  overlayIndicators: CalculatedIndicator[];

  /** Panel indicators (to be rendered in separate panels) */
  panelIndicators: CalculatedIndicator[];

  /** Add a new indicator instance */
  addIndicator: (indicatorId: IndicatorId, config?: Partial<IndicatorConfig>) => string;

  /** Remove an indicator instance */
  removeIndicator: (instanceId: string) => void;

  /** Update indicator configuration */
  updateConfig: (instanceId: string, config: Partial<IndicatorConfig>) => void;

  /** Toggle indicator visibility */
  toggleVisibility: (instanceId: string) => void;

  /** Check if an indicator type is active (has at least one instance) */
  hasIndicator: (indicatorId: IndicatorId) => boolean;

  /** Get all instances of a specific indicator type */
  getInstancesOfType: (indicatorId: IndicatorId) => IndicatorInstance[];
}

// Cache for OHLCV conversion
interface OHLCVCache {
  candleCount: number;
  firstDate: string | null;
  lastDate: string | null;
  // Track latest candle values for realtime updates
  latestCandleFingerprint: string | null;
  data: OHLCVData[];
}

// Helper to create a fingerprint of a candle's values for comparison
const getCandleFingerprint = (candle: Candle | undefined): string | null => {
  if (!candle) return null;
  return `${candle.open}-${candle.high}-${candle.low}-${candle.close}-${candle.volume ?? 0}`;
};

/**
 * Convert candles to OHLCV format for indicator calculations - with caching
 */
function candlesToOHLCV(candles: Candle[], cacheRef: React.MutableRefObject<OHLCVCache | null>): OHLCVData[] {
  const candleCount = candles.length;
  const firstDate = candleCount > 0 ? candles[0].date : null;
  const lastDate = candleCount > 0 ? candles[candleCount - 1].date : null;
  // Track latest candle values (candles[0] is most recent in descending order)
  const latestCandleFingerprint = getCandleFingerprint(candles[0]);
  
  // Check if cache is valid - also check if latest candle values changed (for realtime)
  if (
    cacheRef.current &&
    cacheRef.current.candleCount === candleCount &&
    cacheRef.current.firstDate === firstDate &&
    cacheRef.current.lastDate === lastDate &&
    cacheRef.current.latestCandleFingerprint === latestCandleFingerprint
  ) {
    return cacheRef.current.data;
  }

  // Compute new OHLCV data
  const data = new Array<OHLCVData>(candleCount);
  for (let i = candleCount - 1, j = 0; i >= 0; i--, j++) {
    const candle = candles[i];
    data[j] = {
      time: formatDate(candle.date) as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume ?? 0,
    };
  }

  // Update cache
  cacheRef.current = { candleCount, firstDate, lastDate, latestCandleFingerprint, data };
  return data;
}

// Cache for calculated indicators
interface IndicatorCache {
  instanceId: string;
  configHash: string;
  dataLength: number;
  result: CalculatedIndicator;
}

// Buffer cache for replay mode - stores pre-calculated results for a range
interface ReplayBufferCache {
  startIndex: number; // Start of buffered range (in series order)
  endIndex: number;   // End of buffered range
  dataLength: number; // Total candle count used for calculation
  configHash: string; // Combined hash of all indicator configs
  // Full calculated results for the entire buffer range
  results: CalculatedIndicator[];
}

function hashConfig(config: IndicatorConfig): string {
  return JSON.stringify(config);
}

// Hash all visible indicator configs for buffer invalidation
function hashAllConfigs(instances: IndicatorInstance[]): string {
  return instances
    .filter(i => i.visible)
    .map(i => `${i.instanceId}:${hashConfig(i.config)}`)
    .sort()
    .join('|');
}

/**
 * Filter indicator output data by maximum time.
 * This handles indicators that filter out NaN values, causing output length
 * to differ from input length. We filter by time to ensure indicator points
 * don't extend beyond the displayed candles.
 */
function filterIndicatorOutputByTime(
  output: IndicatorOutput | null,
  maxTime: Time | undefined
): IndicatorOutput | null {
  if (!output || maxTime === undefined) return output;

  // Helper to compare times (handles both number timestamps and string dates)
  const isTimeInRange = (time: Time): boolean => {
    if (typeof time === 'number' && typeof maxTime === 'number') {
      return time <= maxTime;
    }
    if (typeof time === 'string' && typeof maxTime === 'string') {
      return time <= maxTime;
    }
    // For BusinessDay objects or mixed types, convert to comparable format
    return String(time) <= String(maxTime);
  };

  switch (output.type) {
    case 'line': {
      const filteredData = output.data.filter(d => isTimeInRange(d.time));
      return {
        ...output,
        data: filteredData,
      };
    }
    case 'histogram': {
      const filteredData = output.data.filter(d => isTimeInRange(d.time));
      return {
        ...output,
        data: filteredData,
      };
    }
    case 'band': {
      return {
        ...output,
        upper: output.upper.filter(d => isTimeInRange(d.time)),
        middle: output.middle.filter(d => isTimeInRange(d.time)),
        lower: output.lower.filter(d => isTimeInRange(d.time)),
      };
    }
    case 'multi-line': {
      const filteredSeries: Record<string, LineData<Time>[] | HistogramData<Time>[]> = {};
      for (const [key, data] of Object.entries(output.series)) {
        filteredSeries[key] = (data as (LineData<Time>[] | HistogramData<Time>[])).filter(d => isTimeInRange(d.time));
      }
      return {
        ...output,
        series: filteredSeries,
      };
    }
    default:
      return output;
  }
}

export function useIndicators({
  candles,
  replayDisplayIndex,
  isReplayEnabled = false,
}: UseIndicatorsParams): UseIndicatorsReturn {
  const dispatch = useAppDispatch();
  const instances = useAppSelector(selectIndicatorInstances);
  
  // Caches
  const ohlcvCacheRef = useRef<OHLCVCache | null>(null);
  const indicatorCacheRef = useRef<Map<string, IndicatorCache>>(new Map());
  const replayBufferCacheRef = useRef<ReplayBufferCache | null>(null);

  // Convert candle data to OHLCV format for calculations - cached
  const ohlcvData = useMemo(
    () => candlesToOHLCV(candles, ohlcvCacheRef),
    [candles]
  );

  // Calculate the buffer range for replay mode
  const bufferRange = useMemo(() => {
    if (!isReplayEnabled || !replayDisplayIndex) {
      return null;
    }
    
    const displayIdx = replayDisplayIndex;
    const totalLength = ohlcvData.length;
    
    // Buffer end = current position + REPLAY_BUFFER_AHEAD (clamped to data length)
    const bufferEnd = Math.min(displayIdx + REPLAY_BUFFER_AHEAD, totalLength);
    
    // Buffer start = 0 (we always need full history for indicator warmup)
    // The lookback data is implicit in the full OHLCV calculation
    const bufferStart = 0;
    
    return { start: bufferStart, end: bufferEnd };
  }, [isReplayEnabled, replayDisplayIndex, ohlcvData.length]);

  // Check if we need to recalculate the buffer
  const needsBufferRecalc = useMemo(() => {
    if (!isReplayEnabled || !replayDisplayIndex || !bufferRange) {
      return false;
    }
    
    const cache = replayBufferCacheRef.current;
    if (!cache) return true;
    
    const configHash = hashAllConfigs(instances);
    
    // Recalculate if:
    // 1. Config changed
    // 2. Data length changed
    // 3. Display index is beyond buffer end - threshold
    // 4. Display index went backwards (seek) beyond buffer start
    if (cache.configHash !== configHash) return true;
    if (cache.dataLength !== ohlcvData.length) return true;
    if (replayDisplayIndex > cache.endIndex - REPLAY_BUFFER_THRESHOLD) return true;
    if (replayDisplayIndex < cache.startIndex) return true;
    
    return false;
  }, [isReplayEnabled, replayDisplayIndex, bufferRange, instances, ohlcvData.length]);

  // Calculate all indicator outputs - with replay buffer support
  const calculatedIndicators = useMemo<CalculatedIndicator[]>(() => {
    if (ohlcvData.length === 0) return [];

    const visibleInstances = instances.filter(i => i.visible);
    
    // Non-replay mode: use original per-indicator caching
    // Also handle case where replayDisplayIndex is undefined/0
    if (!isReplayEnabled || !replayDisplayIndex || replayDisplayIndex <= 0) {
      const results: CalculatedIndicator[] = [];
      const newCache = new Map<string, IndicatorCache>();
      
      for (const instance of visibleInstances) {
        const definition = getIndicator(instance.indicatorId);
        if (!definition) continue;

        const cacheKey = instance.instanceId;
        const configHash = hashConfig(instance.config);
        const cached = indicatorCacheRef.current.get(cacheKey);
        
        if (
          cached &&
          cached.configHash === configHash &&
          cached.dataLength === ohlcvData.length
        ) {
          results.push(cached.result);
          newCache.set(cacheKey, cached);
          continue;
        }

        if (ohlcvData.length < definition.minDataPoints) {
          const result: CalculatedIndicator = {
            instance,
            definition,
            output: null,
            error: `Insufficient data: requires ${definition.minDataPoints} points`,
          };
          results.push(result);
          newCache.set(cacheKey, { instanceId: cacheKey, configHash, dataLength: ohlcvData.length, result });
          continue;
        }

        try {
          const output = calculateIndicator(
            instance.indicatorId,
            ohlcvData,
            instance.config
          );
          const result: CalculatedIndicator = {
            instance,
            definition,
            output,
          };
          results.push(result);
          newCache.set(cacheKey, { instanceId: cacheKey, configHash, dataLength: ohlcvData.length, result });
        } catch (error) {
          const result: CalculatedIndicator = {
            instance,
            definition,
            output: null,
            error: `Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
          results.push(result);
          newCache.set(cacheKey, { instanceId: cacheKey, configHash, dataLength: ohlcvData.length, result });
        }
      }
      
      indicatorCacheRef.current = newCache;
      // Clear replay buffer when not in replay mode
      replayBufferCacheRef.current = null;
      
      return results;
    }

    // Replay mode: use buffered calculation
    const configHash = hashAllConfigs(instances);
    const currentDisplayIndex = replayDisplayIndex;
    
    // Get the max time for filtering - this is the time of the last displayed candle
    // replayDisplayIndex is 1-based, so we access ohlcvData[replayDisplayIndex - 1]
    const maxTime = currentDisplayIndex > 0 && currentDisplayIndex <= ohlcvData.length
      ? ohlcvData[currentDisplayIndex - 1].time
      : undefined;
    
    // Check if we can use cached buffer
    if (!needsBufferRecalc && replayBufferCacheRef.current) {
      // Filter the cached results by time to match displayed candles
      const filteredResults = replayBufferCacheRef.current.results.map(calc => ({
        ...calc,
        output: filterIndicatorOutputByTime(calc.output, maxTime),
      }));
      return filteredResults;
    }

    // Calculate fresh buffer
    const results: CalculatedIndicator[] = [];
    const bufferEnd = bufferRange?.end ?? ohlcvData.length;
    
    // Slice OHLCV data to buffer end for calculation
    const bufferedOhlcv = ohlcvData.slice(0, bufferEnd);
    
    for (const instance of visibleInstances) {
      const definition = getIndicator(instance.indicatorId);
      if (!definition) continue;

      if (bufferedOhlcv.length < definition.minDataPoints) {
        const result: CalculatedIndicator = {
          instance,
          definition,
          output: null,
          error: `Insufficient data: requires ${definition.minDataPoints} points`,
        };
        results.push(result);
        continue;
      }

      try {
        const output = calculateIndicator(
          instance.indicatorId,
          bufferedOhlcv,
          instance.config
        );
        const result: CalculatedIndicator = {
          instance,
          definition,
          output,
        };
        results.push(result);
      } catch (error) {
        const result: CalculatedIndicator = {
          instance,
          definition,
          output: null,
          error: `Calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
        results.push(result);
      }
    }

    // Update buffer cache
    replayBufferCacheRef.current = {
      startIndex: 0,
      endIndex: bufferEnd,
      dataLength: ohlcvData.length,
      configHash,
      results,
    };

    // Get max time for filtering (defined earlier, but we need to recalculate if not in cache path)
    const filterMaxTime = currentDisplayIndex > 0 && currentDisplayIndex <= ohlcvData.length
      ? ohlcvData[currentDisplayIndex - 1].time
      : undefined;

    // Return filtered results for current display position
    const filteredResults = results.map(calc => ({
      ...calc,
      output: filterIndicatorOutputByTime(calc.output, filterMaxTime),
    }));
    return filteredResults;
  }, [instances, ohlcvData, isReplayEnabled, replayDisplayIndex, needsBufferRecalc, bufferRange]);

  // Separate overlay and panel indicators - stable references
  const overlayIndicators = useMemo(
    () =>
      calculatedIndicators.filter(
        calc => calc.definition.category === 'overlay'
      ),
    [calculatedIndicators]
  );

  const panelIndicators = useMemo(
    () =>
      calculatedIndicators.filter(
        calc => calc.definition.category === 'panel'
      ),
    [calculatedIndicators]
  );

  // Add a new indicator instance
  const addIndicator = useCallback(
    (indicatorId: IndicatorId, config?: Partial<IndicatorConfig>): string => {
      const instanceId = nanoid();
      const defaultConfig = getDefaultConfig(indicatorId);
      const mergedConfig = { ...defaultConfig, ...config };

      dispatch(
        addIndicatorInstance({
          instanceId,
          indicatorId,
          config: mergedConfig as IndicatorConfig,
          visible: true,
        })
      );

      return instanceId;
    },
    [dispatch]
  );

  // Remove an indicator instance
  const removeIndicator = useCallback(
    (instanceId: string) => {
      dispatch(removeIndicatorInstance(instanceId));
    },
    [dispatch]
  );

  // Update indicator configuration
  const updateConfig = useCallback(
    (instanceId: string, config: Partial<IndicatorConfig>) => {
      dispatch(updateIndicatorInstanceConfig({ instanceId, config }));
    },
    [dispatch]
  );

  // Toggle indicator visibility
  const toggleVisibility = useCallback(
    (instanceId: string) => {
      dispatch(toggleIndicatorVisibility(instanceId));
    },
    [dispatch]
  );

  // Check if an indicator type has active instances
  const hasIndicator = useCallback(
    (indicatorId: IndicatorId): boolean => {
      return instances.some(inst => inst.indicatorId === indicatorId);
    },
    [instances]
  );

  // Get all instances of a specific type
  const getInstancesOfType = useCallback(
    (indicatorId: IndicatorId): IndicatorInstance[] => {
      return instances.filter(inst => inst.indicatorId === indicatorId);
    },
    [instances]
  );

  return {
    instances,
    calculatedIndicators,
    overlayIndicators,
    panelIndicators,
    addIndicator,
    removeIndicator,
    updateConfig,
    toggleVisibility,
    hasIndicator,
    getInstancesOfType,
  };
}
