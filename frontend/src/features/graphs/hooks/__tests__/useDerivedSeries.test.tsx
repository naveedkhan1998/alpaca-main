import { describe, it, expect } from 'vitest';
// React import not needed with JSX transform
import { render } from '@testing-library/react';
import { useDerivedSeries } from '../useDerivedSeries';

const sampleCandles = [
  {
    date: new Date('2024-01-01T00:00:00Z').toISOString(),
    timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
    open: 10,
    high: 12,
    low: 9,
    close: 11,
    volume: 1000,
  },
  {
    date: new Date('2024-01-01T00:01:00Z').toISOString(),
    timestamp: new Date('2024-01-01T00:01:00Z').toISOString(),
    open: 11,
    high: 13,
    low: 10,
    close: 12,
    volume: 1500,
  },
  {
    date: new Date('2024-01-01T00:02:00Z').toISOString(),
    timestamp: new Date('2024-01-01T00:02:00Z').toISOString(),
    open: 12,
    high: 15,
    low: 11,
    close: 14,
    volume: 1600,
  },
];

import type { Candle } from '@/types/common-types';

type HookHarnessProps = {
  candles: Candle[];
  seriesType: 'ohlc' | 'price' | 'volume';
  isDarkMode: boolean;
  activeIndicators: string[];
};

function HookHarness(props: HookHarnessProps) {
  const res = useDerivedSeries(props);
  return <pre data-testid="out">{JSON.stringify(res)}</pre>;
}

describe('useDerivedSeries', () => {
  it('maps OHLC and price series and volume correctly', () => {
    const { getByTestId, rerender } = render(
      <HookHarness
        candles={sampleCandles}
        seriesType="ohlc"
        isDarkMode={false}
        activeIndicators={[]}
      />
    );
    const out1 = JSON.parse(getByTestId('out').textContent || '{}');
    expect(out1.seriesData.length).toBe(3);
    expect(out1.seriesData[0]).toHaveProperty('open');
    expect(out1.volumeData.length).toBe(3);

    rerender(
      <HookHarness
        candles={sampleCandles}
        seriesType="price"
        isDarkMode={true}
        activeIndicators={[]}
      />
    );
    const out2 = JSON.parse(getByTestId('out').textContent || '{}');
    expect(out2.seriesData[0]).toHaveProperty('value');
  });

  it('only returns indicators when enabled', () => {
    const { getByTestId, rerender } = render(
      <HookHarness
        candles={sampleCandles}
        seriesType="price"
        isDarkMode={false}
        activeIndicators={[]}
      />
    );
    const out1 = JSON.parse(getByTestId('out').textContent || '{}');
    expect(out1.rsiData.length).toBe(0);

    rerender(
      <HookHarness
        candles={sampleCandles}
        seriesType="price"
        isDarkMode={false}
        activeIndicators={['RSI', 'EMA']}
      />
    );
    const out2 = JSON.parse(getByTestId('out').textContent || '{}');
    expect(Array.isArray(out2.rsiData)).toBe(true);
    expect(Array.isArray(out2.emaData)).toBe(true);
  });

  it('computes volume colors based on movement and theme', () => {
    const candles = [
      {
        date: new Date('2024-01-01T00:00:00Z').toISOString(),
        timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
        open: 10,
        high: 11,
        low: 9,
        close: 10,
        volume: 100,
      },
      {
        date: new Date('2024-01-01T00:01:00Z').toISOString(),
        timestamp: new Date('2024-01-01T00:01:00Z').toISOString(),
        open: 10,
        high: 12,
        low: 9,
        close: 12,
        volume: 150,
      },
      {
        date: new Date('2024-01-01T00:02:00Z').toISOString(),
        timestamp: new Date('2024-01-01T00:02:00Z').toISOString(),
        open: 12,
        high: 13,
        low: 10,
        close: 11,
        volume: 200,
      },
    ];

    const { getByTestId, rerender } = render(
      <HookHarness
        candles={candles}
        seriesType="price"
        isDarkMode={false}
        activeIndicators={[]}
      />
    );
    const outLight = JSON.parse(getByTestId('out').textContent || '{}');
    // After reverse(), first item corresponds to last candle (11 vs prev 12) => red in light theme
    expect(outLight.volumeData[0].color).toContain('rgba(244, 63, 94');

    rerender(
      <HookHarness
        candles={candles}
        seriesType="price"
        isDarkMode={true}
        activeIndicators={[]}
      />
    );
    const outDark = JSON.parse(getByTestId('out').textContent || '{}');
    // Dark theme red
    expect(outDark.volumeData[0].color).toContain('rgba(239, 68, 68');
  });
});
