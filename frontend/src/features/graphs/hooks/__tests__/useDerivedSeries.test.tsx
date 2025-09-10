import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { useDerivedSeries } from '../useDerivedSeries';

const sampleCandles = [
  {
    date: new Date('2024-01-01T00:00:00Z').toISOString(),
    open: 10,
    high: 12,
    low: 9,
    close: 11,
    volume: 1000,
  },
  {
    date: new Date('2024-01-01T00:01:00Z').toISOString(),
    open: 11,
    high: 13,
    low: 10,
    close: 12,
    volume: 1500,
  },
  {
    date: new Date('2024-01-01T00:02:00Z').toISOString(),
    open: 12,
    high: 15,
    low: 11,
    close: 14,
    volume: 1600,
  },
];

function HookHarness(props: any) {
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
});
