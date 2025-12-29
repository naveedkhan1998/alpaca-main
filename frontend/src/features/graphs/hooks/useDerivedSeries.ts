/**
 * useDerivedSeries Hook
 *
 * Transforms candle data into chart-ready series data with optimized caching.
 * Handles deduplication, chronological ordering, and series type conversion.
 *
 * Performance Optimizations:
 * - Ref-based caching to avoid recomputation on each render
 * - Incremental updates for historical data loads (append only)
 * - Fingerprint-based cache invalidation for realtime updates
 * - Single-pass transformation for deduplication + series building
 */

import { useMemo, useRef } from 'react';
import type { Time, LineData, BarData, HistogramData } from 'lightweight-charts';
import type { Candle } from '@/types/common-types';
import { formatDate } from '@/lib/functions';

interface UseDerivedSeriesParams {
  candles: Candle[];
  seriesType: 'ohlc' | 'price' | 'volume';
  isDarkMode: boolean;
}

// Color constants - TradingView-style transparent volume bars
const VOLUME_COLORS = {
  dark: { green: 'rgba(38, 166, 154, 0.3)', red: 'rgba(239, 83, 80, 0.3)' },
  light: { green: 'rgba(38, 166, 154, 0.35)', red: 'rgba(239, 83, 80, 0.35)' },
} as const;

// Cache structure for memoization across renders
interface DerivedCache {
  candlesLength: number;
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  latestFingerprint: string | null;
  seriesType: string;
  isDarkMode: boolean;
  seriesData: (BarData<Time> | LineData<Time>)[];
  volumeData: HistogramData<Time>[];
  hasValidVolume: boolean;
  // Track seen timestamps for incremental updates
  seenTimestamps: Set<number>;
}

// Create a fingerprint of a candle's OHLCV values for comparison
const getCandleFingerprint = (candle: Candle | undefined): string | null => {
  if (!candle) return null;
  return `${candle.open}-${candle.high}-${candle.low}-${candle.close}-${candle.volume ?? 0}`;
};

export function useDerivedSeries({
  candles,
  seriesType,
  isDarkMode,
}: UseDerivedSeriesParams) {
  const cacheRef = useRef<DerivedCache | null>(null);

  // Compute cache keys
  const candlesLength = candles.length;
  // Candles are in descending order (newest first)
  const lastTimestamp = candlesLength > 0 ? candles[0].timestamp : null; // Newest
  const firstTimestamp = candlesLength > 0 ? candles[candlesLength - 1].timestamp : null; // Oldest
  const latestFingerprint = getCandleFingerprint(candles[0]);

  // Compute derived data with incremental updates support
  const derivedData = useMemo(() => {
    const cache = cacheRef.current;
    const colors = isDarkMode ? VOLUME_COLORS.dark : VOLUME_COLORS.light;
    
    // Check if this is a pure historical append (only added older candles)
    // This happens when: lastTimestamp (newest) is same, firstTimestamp (oldest) changed
    const isHistoricalAppend =
      cache !== null &&
      cache.lastTimestamp === lastTimestamp &&
      cache.latestFingerprint === latestFingerprint &&
      cache.firstTimestamp !== firstTimestamp &&
      cache.seriesType === seriesType &&
      cache.isDarkMode === isDarkMode;

    if (isHistoricalAppend && cache) {
      // Incremental update: only process new older candles
      // These candles are at the end of the array (older than existing)
      const existingLength = cache.candlesLength;
      const newSeriesData = [...cache.seriesData];
      const newVolumeData = [...cache.volumeData];
      const seenTimes = new Set(cache.seenTimestamps);
      let hasVolume = cache.hasValidVolume;
      
      // Get the prev close from the first (oldest) existing candle for volume color
      let prevClose = cache.seriesData.length > 0 
        ? ('close' in cache.seriesData[0] ? (cache.seriesData[0] as BarData<Time>).close : 0)
        : 0;

      // Process only the new candles (which are older, at end of array)
      // Insert at the beginning of series data since they are chronologically earlier
      const newItems: { series: BarData<Time> | LineData<Time>; volume: HistogramData<Time> }[] = [];
      
      for (let i = candles.length - 1; i >= existingLength; i--) {
        const candle = candles[i];
        const time = formatDate(candle.timestamp) as Time;
        const timeNum = time as number;

        if (seenTimes.has(timeNum)) continue;
        seenTimes.add(timeNum);

        const volume = candle.volume ?? 0;
        if (volume > 0) hasVolume = true;

        // Build series data
        let seriesItem: BarData<Time> | LineData<Time>;
        if (seriesType === 'ohlc') {
          seriesItem = {
            time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          } as BarData<Time>;
        } else {
          seriesItem = {
            time,
            value: candle.close,
          } as LineData<Time>;
        }

        // Build volume data
        const volumeItem: HistogramData<Time> = {
          time,
          value: volume,
          color: candle.close >= prevClose ? colors.green : colors.red,
        };

        newItems.push({ series: seriesItem, volume: volumeItem });
        prevClose = candle.close;
      }

      // Prepend new items (they go at the beginning since they're older)
      const finalSeriesData = [...newItems.map(i => i.series), ...newSeriesData];
      const finalVolumeData = [...newItems.map(i => i.volume), ...newVolumeData];

      // Update cache
      cacheRef.current = {
        candlesLength,
        firstTimestamp,
        lastTimestamp,
        latestFingerprint,
        seriesType,
        isDarkMode,
        seriesData: finalSeriesData,
        volumeData: finalVolumeData,
        hasValidVolume: hasVolume,
        seenTimestamps: seenTimes,
      };

      return {
        seriesData: finalSeriesData,
        volumeData: finalVolumeData,
        hasValidVolume: hasVolume,
      };
    }

    // Check full cache validity (everything matches)
    const isCacheValid =
      cache !== null &&
      cache.candlesLength === candlesLength &&
      cache.firstTimestamp === firstTimestamp &&
      cache.lastTimestamp === lastTimestamp &&
      cache.latestFingerprint === latestFingerprint &&
      cache.seriesType === seriesType &&
      cache.isDarkMode === isDarkMode;

    if (isCacheValid && cache) {
      return {
        seriesData: cache.seriesData,
        volumeData: cache.volumeData,
        hasValidVolume: cache.hasValidVolume,
      };
    }

    // Full rebuild needed
    if (candlesLength === 0) {
      const emptyResult = {
        seriesData: [] as (BarData<Time> | LineData<Time>)[],
        volumeData: [] as HistogramData<Time>[],
        hasValidVolume: false,
      };
      cacheRef.current = {
        candlesLength: 0,
        firstTimestamp: null,
        lastTimestamp: null,
        latestFingerprint: null,
        seriesType,
        isDarkMode,
        ...emptyResult,
        seenTimestamps: new Set(),
      };
      return emptyResult;
    }

    // Deduplicate and build series in single pass
    // Candles arrive in descending order (newest first), we need chronological
    const seenTimes = new Set<number>();

    // Pre-allocate arrays for better performance
    const seriesData: (BarData<Time> | LineData<Time>)[] = [];
    const volumeData: HistogramData<Time>[] = [];
    let hasVolume = false;
    let prevClose = 0;

    // Iterate in reverse (oldest to newest) for chronological order
    for (let i = candles.length - 1; i >= 0; i--) {
      const candle = candles[i];
      const time = formatDate(candle.timestamp) as Time;
      const timeNum = time as number;

      // Skip duplicates
      if (seenTimes.has(timeNum)) continue;
      seenTimes.add(timeNum);

      const volume = candle.volume ?? 0;
      if (volume > 0) hasVolume = true;

      // Build series data
      if (seriesType === 'ohlc') {
        seriesData.push({
          time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        } as BarData<Time>);
      } else if (seriesType === 'price') {
        seriesData.push({
          time,
          value: candle.close,
        } as LineData<Time>);
      }

      // Build volume data
      volumeData.push({
        time,
        value: volume,
        color: candle.close >= prevClose ? colors.green : colors.red,
      });

      prevClose = candle.close;
    }

    const result = { seriesData, volumeData, hasValidVolume: hasVolume };

    // Update cache
    cacheRef.current = {
      candlesLength,
      firstTimestamp,
      lastTimestamp,
      latestFingerprint,
      seriesType,
      isDarkMode,
      ...result,
      seenTimestamps: seenTimes,
    };

    return result;
  }, [candles, candlesLength, firstTimestamp, lastTimestamp, latestFingerprint, seriesType, isDarkMode]);

  return {
    seriesData: derivedData.seriesData,
    volumeData: derivedData.volumeData,
    hasValidVolume: derivedData.hasValidVolume,
  } as const;
}
