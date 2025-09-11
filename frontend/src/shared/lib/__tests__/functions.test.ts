import { describe, it, expect } from 'vitest';
import {
  calculateMA,
  calculateRSI,
  calculateBollingerBands,
  calculateATR,
  formatDate,
} from '../functions';
import type { CandlestickData, Time } from 'lightweight-charts';
import type { Candle } from '@/types/common-types';

const mkCandle = (close: number, extra?: Partial<Candle>): Candle => ({
  open: close,
  high: close,
  low: close,
  close,
  volume: 0,
  timestamp: new Date().toISOString(),
  date: new Date().toISOString(),
  ...extra,
});

describe('functions indicators', () => {
  it('formatDate safely handles invalid inputs', () => {
    const tsNow = Math.floor(Date.now() / 1000);
    const out = formatDate('');
    expect(typeof out).toBe('number');
    expect(Math.abs(out - tsNow)).toBeLessThan(5);
  });

  it('calculateMA computes moving average for period 3', () => {
    const data: CandlestickData<Time>[] = [1, 2, 3, 6].map((v, i) => ({
      time: i as unknown as Time,
      open: v,
      high: v,
      low: v,
      close: v,
    }));
    const ma = calculateMA(data, 3);
    expect(ma.length).toBe(2);
    expect(ma[0].value).toBeCloseTo((1 + 2 + 3) / 3, 6);
    expect(ma[1].value).toBeCloseTo((2 + 3 + 6) / 3, 6);
  });

  it('calculateRSI returns empty when insufficient data', () => {
    const candles: Candle[] = [mkCandle(1), mkCandle(2), mkCandle(3)];
    const rsi = calculateRSI(candles, 14);
    expect(rsi).toEqual([]);
  });

  it('calculateBollingerBands returns empty when insufficient data', () => {
    const candles: Candle[] = [mkCandle(1), mkCandle(2), mkCandle(3)];
    const bands = calculateBollingerBands(candles, 5, 2);
    expect(bands).toEqual([]);
  });

  it('calculateBollingerBands computes values with small period', () => {
    const candles: Candle[] = [1, 2, 3, 4].map(v => mkCandle(v));
    const bands = calculateBollingerBands(candles, 2, 2);
    expect(bands.length).toBe(3);
    bands.forEach(b => {
      expect(typeof b.upper).toBe('number');
      expect(typeof b.middle).toBe('number');
      expect(typeof b.lower).toBe('number');
    });
  });

  it('calculateATR returns sequence with expected length', () => {
    const candles: Candle[] = [
      {
        open: 10,
        high: 12,
        low: 9,
        close: 11,
        volume: 0,
        timestamp: '2024-01-01T00:00:00Z',
        date: '2024-01-01T00:00:00Z',
      },
      {
        open: 11,
        high: 13,
        low: 10,
        close: 12,
        volume: 0,
        timestamp: '2024-01-01T00:01:00Z',
        date: '2024-01-01T00:01:00Z',
      },
      {
        open: 12,
        high: 15,
        low: 11,
        close: 14,
        volume: 0,
        timestamp: '2024-01-01T00:02:00Z',
        date: '2024-01-01T00:02:00Z',
      },
      {
        open: 14,
        high: 16,
        low: 13,
        close: 15,
        volume: 0,
        timestamp: '2024-01-01T00:03:00Z',
        date: '2024-01-01T00:03:00Z',
      },
    ];
    const atr = calculateATR(candles, 2);
    expect(atr.length).toBe(3);
    atr.forEach(p => expect(typeof p.value).toBe('number'));
  });
});
