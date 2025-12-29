import { useMemo } from 'react';
import type {
  Time,
  LineData,
  BarData,
  HistogramData,
} from 'lightweight-charts';
import type { Candle } from '@/types/common-types';
import type { IndicatorConfig } from '../graphSlice';
import {
  formatDate,
  calculateRSI,
  calculateBollingerBands,
  calculateATR,
  calculateMA,
} from '@/lib/functions';

interface UseDerivedSeriesParams {
  candles: Candle[];
  seriesType: 'ohlc' | 'price' | 'volume';
  isDarkMode: boolean;
  activeIndicators: string[];
  indicatorConfigs: IndicatorConfig;
}

// Cache for formatted timestamps to avoid redundant calculations
const timestampCache = new Map<string, number>();

/**
 * Cached formatDate to avoid redundant timestamp conversions.
 * Uses a Map cache since the same timestamps repeat across renders.
 */
function cachedFormatDate(dateStr: string): number {
  let cached = timestampCache.get(dateStr);
  if (cached === undefined) {
    cached = formatDate(dateStr);
    timestampCache.set(dateStr, cached);
    // Limit cache size to prevent memory leaks
    if (timestampCache.size > 50000) {
      // Clear oldest entries (first 10000)
      const keys = Array.from(timestampCache.keys()).slice(0, 10000);
      keys.forEach(k => timestampCache.delete(k));
    }
  }
  return cached;
}

/**
 * Pre-processed candle with cached timestamp for efficient reuse.
 */
interface ProcessedCandle extends Candle {
  time: Time;
}

export function useDerivedSeries({
  candles,
  seriesType,
  isDarkMode,
  activeIndicators,
  indicatorConfigs,
}: UseDerivedSeriesParams) {
  // Pre-process candles with cached timestamps (computed once)
  const processedCandles = useMemo<ProcessedCandle[]>(() => {
    return candles.map(candle => ({
      ...candle,
      time: cachedFormatDate(candle.date) as Time,
    }));
  }, [candles]);

  // Reversed array for chart display (oldest first)
  const reversedCandles = useMemo(
    () => [...processedCandles].reverse(),
    [processedCandles]
  );

  const data = useMemo(
    () => ({ results: candles, count: candles.length }),
    [candles]
  );

  // Series data using pre-processed timestamps
  const seriesData = useMemo(() => {
    if (reversedCandles.length === 0) return [] as unknown[];
    if (seriesType === 'ohlc') {
      return reversedCandles.map(({ time, open, high, low, close }) => ({
        time,
        open,
        high,
        low,
        close,
      }));
    }
    if (seriesType === 'price') {
      return reversedCandles.map(({ time, close }) => ({
        time,
        value: close,
      }));
    }
    return [] as unknown[];
  }, [reversedCandles, seriesType]) as BarData<Time>[] | LineData<Time>[];

  // Volume data using pre-processed timestamps
  const volumeData = useMemo<HistogramData<Time>[]>(() => {
    if (reversedCandles.length === 0) return [];
    const green = isDarkMode
      ? 'rgba(34, 197, 94, 0.8)'
      : 'rgba(16, 185, 129, 0.8)';
    const red = isDarkMode
      ? 'rgba(239, 68, 68, 0.8)'
      : 'rgba(244, 63, 94, 0.85)';

    return reversedCandles.map(({ time, close, volume = 0 }, index, array) => {
      const previousClose = index > 0 ? array[index - 1].close : close;
      const color = close >= previousClose ? green : red;
      return { time, value: volume, color };
    });
  }, [reversedCandles, isDarkMode]);

  const hasValidVolume = useMemo(() => {
    return reversedCandles.some(({ volume = 0 }) => volume > 0);
  }, [reversedCandles]);

  // RSI using pre-processed data
  const rsiData = useMemo<LineData<Time>[]>(() => {
    if (reversedCandles.length === 0 || !activeIndicators.includes('RSI'))
      return [];
    const config = indicatorConfigs.RSI;
    return calculateRSI(reversedCandles, config.period)
      .filter(item => item.time !== undefined)
      .map(item => ({ ...item, time: item.time as Time }));
  }, [reversedCandles, activeIndicators, indicatorConfigs.RSI]);

  // ATR using pre-processed data
  const atrData = useMemo<LineData<Time>[]>(() => {
    if (reversedCandles.length === 0 || !activeIndicators.includes('ATR'))
      return [];
    const config = indicatorConfigs.ATR;
    return calculateATR(reversedCandles, config.period).map(item => ({
      ...item,
      time: item.time as Time,
    }));
  }, [reversedCandles, activeIndicators, indicatorConfigs.ATR]);

  // EMA using pre-processed data
  const emaData = useMemo<LineData<Time>[]>(() => {
    if (reversedCandles.length === 0 || !activeIndicators.includes('EMA'))
      return [];
    const config = indicatorConfigs.EMA;
    return calculateMA(reversedCandles, config.period);
  }, [reversedCandles, activeIndicators, indicatorConfigs.EMA]);

  // Bollinger Bands using pre-processed data
  type BollingerPoint = {
    time: Time;
    upper: number;
    middle: number;
    lower: number;
  };
  const bollingerBandsData = useMemo<BollingerPoint[]>(() => {
    if (
      reversedCandles.length === 0 ||
      !activeIndicators.includes('BollingerBands')
    )
      return [];
    const config = indicatorConfigs.BollingerBands;
    const bands = calculateBollingerBands(
      reversedCandles,
      config.period,
      config.stdDev
    );
    return bands
      .filter(band => band.time !== undefined)
      .map(band => ({
        time: band.time as Time,
        upper: band.upper,
        middle: band.middle,
        lower: band.lower,
      }));
  }, [reversedCandles, activeIndicators, indicatorConfigs.BollingerBands]);

  return {
    data,
    seriesData,
    volumeData,
    hasValidVolume,
    rsiData,
    atrData,
    emaData,
    bollingerBandsData,
  } as const;
}
