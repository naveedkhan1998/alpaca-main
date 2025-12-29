/**
 * Indicator Calculation Utilities
 *
 * Shared helper functions for technical indicator calculations.
 * All functions expect data in chronological order (oldest first).
 */

import type { OHLCVData } from './types';

/**
 * Get source price from OHLCV data based on source parameter
 */
export function getSourcePrice(
  candle: OHLCVData,
  source: string = 'close'
): number {
  switch (source) {
    case 'open':
      return candle.open;
    case 'high':
      return candle.high;
    case 'low':
      return candle.low;
    case 'close':
      return candle.close;
    case 'hl2':
      return (candle.high + candle.low) / 2;
    case 'hlc3':
      return (candle.high + candle.low + candle.close) / 3;
    case 'ohlc4':
      return (candle.open + candle.high + candle.low + candle.close) / 4;
    default:
      return candle.close;
  }
}

/**
 * Calculate Simple Moving Average for an array of values
 */
export function sma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * Calculate Exponential Moving Average for an array of values
 */
export function ema(values: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    if (i === period - 1) {
      // First EMA is SMA
      const slice = values.slice(0, period);
      const sum = slice.reduce((acc, val) => acc + val, 0);
      result.push(sum / period);
    } else {
      const prevEma = result[i - 1];
      result.push((values[i] - prevEma) * multiplier + prevEma);
    }
  }
  return result;
}

/**
 * Calculate Weighted Moving Average for an array of values
 */
export function wma(values: number[], period: number): number[] {
  const result: number[] = [];
  const weights = Array.from({ length: period }, (_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    const weightedSum = slice.reduce(
      (acc, val, idx) => acc + val * weights[idx],
      0
    );
    result.push(weightedSum / weightSum);
  }
  return result;
}

/**
 * Calculate True Range for OHLCV data
 */
export function trueRange(data: OHLCVData[]): number[] {
  return data.map((candle, i) => {
    if (i === 0) {
      return candle.high - candle.low;
    }
    const prevClose = data[i - 1].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - prevClose),
      Math.abs(candle.low - prevClose)
    );
  });
}

/**
 * Calculate Standard Deviation for an array of values
 */
export function stdDev(values: number[], period: number): number[] {
  const result: number[] = [];
  const smaValues = sma(values, period);

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1 || isNaN(smaValues[i])) {
      result.push(NaN);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    const mean = smaValues[i];
    const squaredDiffs = slice.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    result.push(Math.sqrt(variance));
  }
  return result;
}

/**
 * Calculate highest value in a sliding window
 */
export function highest(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    result.push(Math.max(...slice));
  }
  return result;
}

/**
 * Calculate lowest value in a sliding window
 */
export function lowest(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    const slice = values.slice(i - period + 1, i + 1);
    result.push(Math.min(...slice));
  }
  return result;
}
