import { useMemo } from 'react';
import type {
  Time,
  LineData,
  BarData,
  HistogramData,
} from 'lightweight-charts';
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
  const data = useMemo(
    () => ({ results: candles, count: candles.length }),
    [candles]
  );

  const seriesData = useMemo(() => {
    if (!data) return [] as unknown[];
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
        .map(({ date, close }) => ({
          time: formatDate(date) as Time,
          value: close,
        }))
        .reverse();
    }
    return [] as unknown[];
  }, [data, seriesType]) as BarData<Time>[] | LineData<Time>[];

  const volumeData = useMemo<HistogramData<Time>[]>(() => {
    if (!data) return [] as HistogramData<Time>[];
    return data.results
      .map(({ date, close, volume = 0 }, index, array) => {
        const previousClose = index > 0 ? array[index - 1].close : close;
        const green = isDarkMode
          ? 'rgba(34, 197, 94, 0.8)'
          : 'rgba(16, 185, 129, 0.8)';
        const red = isDarkMode
          ? 'rgba(239, 68, 68, 0.8)'
          : 'rgba(244, 63, 94, 0.85)';
        const color = close >= previousClose ? green : red;
        return { time: formatDate(date) as Time, value: volume, color };
      })
      .reverse();
  }, [data, isDarkMode]);

  const hasValidVolume = useMemo(() => {
    if (!data) return false;
    return data.results.some(({ volume = 0 }) => volume > 0);
  }, [data]);

  const rsiData = useMemo<LineData<Time>[]>(() => {
    if (!data || !activeIndicators.includes('RSI'))
      return [] as LineData<Time>[];
    return calculateRSI(
      data.results.map(d => ({ ...d, time: formatDate(d.date) }))
    )
      .filter(item => item.time !== undefined)
      .map(item => ({ ...item, time: item.time as Time }))
      .reverse();
  }, [data, activeIndicators]);

  const atrData = useMemo<LineData<Time>[]>(() => {
    if (!data || !activeIndicators.includes('ATR'))
      return [] as LineData<Time>[];
    return calculateATR(
      data.results.map(d => ({ ...d, time: formatDate(d.date) }))
    )
      .map(item => ({ ...item, time: item.time as Time }))
      .reverse();
  }, [data, activeIndicators]);

  const emaData = useMemo<LineData<Time>[]>(() => {
    if (!data || !activeIndicators.includes('EMA'))
      return [] as LineData<Time>[];
    return calculateMA(
      data.results.map(d => ({ ...d, time: formatDate(d.date) as Time })),
      14
    ).reverse();
  }, [data, activeIndicators]);

  type BollingerPoint = {
    time: Time;
    upper: number;
    middle: number;
    lower: number;
  };
  const bollingerBandsData = useMemo<BollingerPoint[]>(() => {
    if (!data || !activeIndicators.includes('BollingerBands'))
      return [] as BollingerPoint[];
    const bands = calculateBollingerBands(
      data.results.map(d => ({ ...d, time: formatDate(d.date) })).reverse()
    );
    return bands
      .filter(band => band.time !== undefined)
      .map(band => ({
        time: band.time as Time,
        upper: band.upper,
        middle: band.middle,
        lower: band.lower,
      }));
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
