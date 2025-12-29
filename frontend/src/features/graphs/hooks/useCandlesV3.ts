/**
 * useCandles hook with cursor-based pagination for v3 API.
 *
 * This hook provides efficient candle data loading using the optimized
 * v3 endpoint with:
 * - Cursor-based pagination (no COUNT(*) overhead)
 * - Compact array format (~60% smaller payload)
 * - GZip compression
 * - Automatic real-time updates
 * - Seamless infinite scroll support
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyGetAssetCandlesV3Query } from '@/api/assetService';
import type { Candle, CompactCandlesResponse } from '@/types/common-types';

interface UseCandlesV3Params {
  assetId?: string | number;
  timeframe: number; // 1, 5, 15, 30, 60, 240, 1440
  autoRefresh: boolean;
  initialLimit?: number;
  loadMoreLimit?: number;
}

/**
 * Column indices for compact array format.
 * Must match backend CANDLE_FIELDS order.
 */
const COL = {
  TIMESTAMP: 0,
  OPEN: 1,
  HIGH: 2,
  LOW: 3,
  CLOSE: 4,
  VOLUME: 5,
  TRADE_COUNT: 6,
  VWAP: 7,
} as const;

/**
 * Convert compact array format to legacy Candle object.
 * 
 * Compact format: [timestamp, open, high, low, close, volume, trade_count, vwap]
 * This is ~60% smaller than object format over the wire.
 */
function compactToCandle(row: (string | number | null)[]): Candle {
  return {
    timestamp: row[COL.TIMESTAMP] as string,
    date: row[COL.TIMESTAMP] as string, // Legacy compatibility
    open: parseFloat(row[COL.OPEN] as string),
    high: parseFloat(row[COL.HIGH] as string),
    low: parseFloat(row[COL.LOW] as string),
    close: parseFloat(row[COL.CLOSE] as string),
    volume: parseFloat(row[COL.VOLUME] as string),
    trade_count: row[COL.TRADE_COUNT] as number | undefined,
    vwap: row[COL.VWAP] ? parseFloat(row[COL.VWAP] as string) : undefined,
  };
}

/**
 * Parse compact response and convert all candles.
 */
function parseCompactResponse(res: CompactCandlesResponse): Candle[] {
  return res.results.map(compactToCandle);
}

export function useCandlesV3({
  assetId,
  timeframe,
  autoRefresh,
  initialLimit = 1000,
  loadMoreLimit = 1000,
}: UseCandlesV3Params) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errorInitial, setErrorInitial] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [getCandles, { isFetching }] = useLazyGetAssetCandlesV3Query();
  const isLoadingMoreRef = useRef(false);

  /**
   * Sort candles descending by timestamp (newest first).
   */
  const sortDescByDate = useCallback((arr: Candle[]) => {
    return [...arr].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, []);

  /**
   * Load initial batch of candles.
   * Always fetches fresh data to ensure we have the latest state.
   */
  const loadInitial = useCallback(async () => {
    if (!assetId) return;
    setLoadingInitial(true);
    setErrorInitial(null);

    try {
      const res = await getCandles({
        id: Number(assetId),
        timeframe,
        limit: initialLimit,
      }).unwrap();

      const results = parseCompactResponse(res);
      setCandles(sortDescByDate(results));
      setNextCursor(res.next_cursor);
      setHasMore(res.has_next);
    } catch {
      setErrorInitial('Failed to load candle data');
    } finally {
      setLoadingInitial(false);
    }
  }, [assetId, timeframe, initialLimit, getCandles, sortDescByDate]);

  /**
   * Load more historical candles using cursor pagination.
   * Uses cache since historical data doesn't change.
   */
  const loadMoreHistoricalData = useCallback(async () => {
    if (!assetId || isLoadingMoreRef.current || !hasMore || !nextCursor) return;

    setIsLoadingMore(true);
    isLoadingMoreRef.current = true;

    try {
      const res = await getCandles({
        id: Number(assetId),
        timeframe,
        limit: loadMoreLimit,
        cursor: nextCursor,
      }).unwrap();

      const results = parseCompactResponse(res);

      if (results.length > 0) {
        setCandles(prev => {
          // Dedupe by timestamp
          const existing = new Set(prev.map(c => c.timestamp));
          const newOnes = results.filter(c => !existing.has(c.timestamp));
          return sortDescByDate([...prev, ...newOnes]);
        });
        setNextCursor(res.next_cursor);
        setHasMore(res.has_next);
      } else {
        setHasMore(false);
      }
    } catch {
      // Silent failure for pagination - user can retry
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [
    assetId,
    timeframe,
    loadMoreLimit,
    nextCursor,
    hasMore,
    getCandles,
    sortDescByDate,
  ]);

  /**
   * Fetch latest candle for real-time updates.
   */
  const fetchLatest = useCallback(async () => {
    if (!assetId) return;

    try {
      const res = await getCandles({
        id: Number(assetId),
        timeframe,
        limit: 5, // Fetch a few recent candles to ensure we catch updates
      }).unwrap();

      const latestCandles = parseCompactResponse(res);
      if (latestCandles.length === 0) return;

      setCandles(prev => {
        if (prev.length === 0) return sortDescByDate(latestCandles);

        // Merge: update existing or prepend new
        const map = new Map(prev.map(c => [c.timestamp, c] as const));
        for (const c of latestCandles) {
          map.set(c.timestamp, c);
        }
        return sortDescByDate(Array.from(map.values()));
      });
    } catch {
      // Silent failure for periodic refresh
    }
  }, [assetId, timeframe, getCandles, sortDescByDate]);

  // Reset and reload when asset or timeframe changes
  useEffect(() => {
    setCandles([]);
    setNextCursor(null);
    setHasMore(true);
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
    loadInitial();
  }, [loadInitial]);

  // Auto-refresh at 2s intervals when enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => fetchLatest(), 2000);
    return () => window.clearInterval(id);
  }, [autoRefresh, fetchLatest]);

  // Provide data in legacy format for chart components
  const data = useMemo(
    () => ({ results: candles, count: candles.length }),
    [candles]
  );

  return {
    data,
    candles,
    isFetching,
    loadingInitial,
    errorInitial,
    isLoadingMore,
    hasMore,
    handleRefetch: fetchLatest,
    loadMoreHistoricalData,
  } as const;
}
