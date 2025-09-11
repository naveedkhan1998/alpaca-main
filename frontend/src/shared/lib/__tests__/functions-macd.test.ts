import { describe, it, expect } from 'vitest';
import { calculateMACD } from '../functions';
import type { Candle } from '@/types/common-types';

const mkCandle = (close: number, ts: string): Candle => ({
  open: close,
  high: close,
  low: close,
  close,
  volume: 0,
  timestamp: ts,
  date: ts,
});

describe('calculateMACD', () => {
  it('returns zeros for constant price series', () => {
    const ts0 = '2024-01-01T00:00:00Z';
    const data: Candle[] = Array.from({ length: 30 }, (_, i) =>
      mkCandle(100, new Date(Date.parse(ts0) + i * 60_000).toISOString())
    );
    const macd = calculateMACD(data);
    expect(macd.length).toBe(data.length);
    macd.forEach(point => {
      expect(point.macd).toBeCloseTo(0, 10);
      expect(point.signal).toBeCloseTo(0, 10);
      expect(point.histogram).toBeCloseTo(0, 10);
    });
  });

  it('produces numeric values for varying series', () => {
    const ts0 = '2024-01-01T00:00:00Z';
    const data: Candle[] = Array.from({ length: 40 }, (_, i) =>
      mkCandle(
        100 + Math.sin(i / 5) * 10,
        new Date(Date.parse(ts0) + i * 60_000).toISOString()
      )
    );
    const macd = calculateMACD(data, 12, 26, 9);
    // Should match input length and contain numbers
    expect(macd.length).toBe(data.length);
    const last = macd[macd.length - 1];
    expect(typeof last.macd).toBe('number');
    expect(typeof last.signal).toBe('number');
    expect(typeof last.histogram).toBe('number');
  });
});
