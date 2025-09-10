import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useCandles } from '../useCandles';

vi.mock('@/api/assetService', () => {
  const trigger = vi.fn().mockImplementation(() => ({
    unwrap: async () => ({
      results: [
        {
          date: new Date('2024-01-01T00:00:00Z').toISOString(),
          open: 1,
          high: 2,
          low: 0.5,
          close: 1.5,
          volume: 100,
        },
        {
          date: new Date('2024-01-01T00:01:00Z').toISOString(),
          open: 1.5,
          high: 2.5,
          low: 1,
          close: 2,
          volume: 120,
        },
      ],
      next: null,
    }),
  }));
  return {
    useLazyGetAssetCandlesQuery: () => [trigger, { isFetching: false }],
  };
});

function Harness(props: any) {
  const res = useCandles(props);
  return <pre data-testid="out">{JSON.stringify(res)}</pre>;
}

describe('useCandles', () => {
  it('loads initial candles and sets flags', async () => {
    const { getByTestId } = render(
      <Harness assetId={1} timeframe={1} autoRefresh={false} />
    );
    await waitFor(() => {
      const out = JSON.parse(getByTestId('out').textContent || '{}');
      expect(out.candles.length).toBe(2);
      expect(out.loadingInitial).toBe(false);
      expect(out.hasMore).toBe(false);
    });
  });
});
