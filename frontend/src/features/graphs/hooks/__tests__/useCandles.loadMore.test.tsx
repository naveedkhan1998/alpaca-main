import { describe, it, expect, vi } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { useCandles } from '../useCandles';

const firstBatch = [
  {
    date: new Date('2024-01-01T00:00:00Z').toISOString(),
    timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
    open: 1,
    high: 2,
    low: 0.5,
    close: 1.5,
    volume: 100,
  },
  {
    date: new Date('2024-01-01T00:01:00Z').toISOString(),
    timestamp: new Date('2024-01-01T00:01:00Z').toISOString(),
    open: 1.5,
    high: 2.5,
    low: 1,
    close: 2,
    volume: 120,
  },
];

const secondBatch = [
  // Duplicate of firstBatch[0] to test de-duplication by date
  {
    date: new Date('2024-01-01T00:00:00Z').toISOString(),
    timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
    open: 1,
    high: 2,
    low: 0.5,
    close: 1.5,
    volume: 100,
  },
  {
    date: new Date('2024-01-01T00:02:00Z').toISOString(),
    timestamp: new Date('2024-01-01T00:02:00Z').toISOString(),
    open: 2,
    high: 3,
    low: 1.5,
    close: 2.5,
    volume: 130,
  },
];

vi.mock('@/api/assetService', () => {
  const trigger = vi.fn().mockImplementation((args: { offset?: number } | undefined) => ({
    unwrap: async () => {
      if (!args || args.offset === 0) {
        return { results: firstBatch, next: true };
      }
      if (args.offset === 2) {
        return { results: secondBatch, next: false };
      }
      return { results: [], next: false };
    },
  }));
  return {
    useLazyGetAssetCandlesQuery: () => [trigger, { isFetching: false }],
  };
});

type HarnessProps = {
  assetId?: string | number;
  timeframe: number;
  autoRefresh: boolean;
  initialLimit?: number;
  loadMoreLimit?: number;
};

type CandlesResult = ReturnType<typeof useCandles>;

let lastResult: CandlesResult;
function Harness(props: HarnessProps) {
  const res = useCandles(props);
  lastResult = res;
  return <pre data-testid="out">{JSON.stringify(res)}</pre>;
}

describe('useCandles loadMoreHistoricalData', () => {
  it('deduplicates by date and updates hasMore', async () => {
    const { getByTestId, rerender } = render(
      <Harness assetId={1} timeframe={1} autoRefresh={false} initialLimit={2} />
    );

    // Initial load
    await waitFor(() => {
      const out = JSON.parse(getByTestId('out').textContent || '{}');
      expect(out.candles.length).toBe(2);
      expect(out.hasMore).toBe(true);
    });

    // Trigger load more via prop change that exposes method
    await act(async () => {
      await lastResult.loadMoreHistoricalData();
    });

    await waitFor(() => {
      const out = JSON.parse(getByTestId('out').textContent || '{}');
      // Second batch adds only 1 new item due to dedupe
      expect(out.candles.length).toBe(3);
      expect(out.hasMore).toBe(false);
    });

    // Rerender just to ensure component remains stable
    rerender(
      <Harness assetId={1} timeframe={1} autoRefresh={false} initialLimit={2} />
    );
  });
});
