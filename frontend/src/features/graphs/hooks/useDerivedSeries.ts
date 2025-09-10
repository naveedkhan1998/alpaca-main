import { useMemo } from 'react';
import { Time } from 'lightweight-charts';
import type { Candle } from '@/types/common-types';
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
}

export function useDerivedSeries({
  candles,
  seriesType,
  isDarkMode,
  activeIndicators,
}: UseDerivedSeriesParams) {
  const data = useMemo(() => ({ results: candles, count: candles.length }), [candles]);

  const seriesData = useMemo(() => {
    if (!data) return [] as any[];
    if (seriesType === 'ohlc') {
      return data.results
        .map(({ date, open, high, low, close }) => ({
          time: formatDate(date) as Time,
          open,
          high,
          low,
          close,
        }))
        .reverse();
    }
    if (seriesType === 'price') {
      return data.results
        .map(({ date, close }) => ({ time: formatDate(date) as Time, value: close }))
        .reverse();
    }
    return [] as any[];
  }, [data, seriesType]);

  const volumeData = useMemo(() => {
    if (!data) return [] as any[];
    return data.results
      .map(({ date, close, volume = 0 }, index, array) => {
        const previousClose = index > 0 ? array[index - 1].close : close;
        const green = isDarkMode ? 'rgba(34, 197, 94, 0.8)' : 'rgba(16, 185, 129, 0.8)';
        const red = isDarkMode ? 'rgba(239, 68, 68, 0.8)' : 'rgba(244, 63, 94, 0.85)';
        const color = close >= previousClose ? green : red;
        return { time: formatDate(date) as Time, value: volume, color };
      })
      .reverse();
  }, [data, isDarkMode]);

  const hasValidVolume = useMemo(() => {
    if (!data) return false;
    return data.results.some(({ volume = 0 }) => volume > 0);
  }, [data]);

  const rsiData = useMemo(() => {
    if (!data || !activeIndicators.includes('RSI')) return [] as any[];
    return calculateRSI(data.results.map(d => ({ ...d, time: formatDate(d.date) })))
      .filter(item => item.time !== undefined)
      .map(item => ({ ...item, time: item.time as Time }))
      .reverse();
  }, [data, activeIndicators]);

  const atrData = useMemo(() => {
    if (!data || !activeIndicators.includes('ATR')) return [] as any[];
    return calculateATR(data.results.map(d => ({ ...d, time: formatDate(d.date) })))
      .map(item => ({ ...item, time: item.time as Time }))
      .reverse();
  }, [data, activeIndicators]);

  const emaData = useMemo(() => {
    if (!data || !activeIndicators.includes('EMA')) return [] as any[];
    return calculateMA(
      data.results.map(d => ({ ...d, time: formatDate(d.date) as Time })),
      14
    ).reverse();
  }, [data, activeIndicators]);

  const bollingerBandsData = useMemo(() => {
    if (!data || !activeIndicators.includes('BollingerBands')) return [] as any[];
    const bands = calculateBollingerBands(
      data.results.map(d => ({ ...d, time: formatDate(d.date) })).reverse()
    );
    return bands.filter(band => band.time !== undefined) as {
      time: Time;
      upper: number;
      middle: number;
      lower: number;
    }[];
  }, [data, activeIndicators]);

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

