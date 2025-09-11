import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyGetAssetCandlesQuery } from '@/api/assetService';
import type { Candle } from '@/types/common-types';

interface UseCandlesParams {
  assetId?: string | number;
  timeframe: number;
  autoRefresh: boolean;
  initialLimit?: number;
  loadMoreLimit?: number;
}

export function useCandles({
  assetId,
  timeframe,
  autoRefresh,
  initialLimit = 500,
  loadMoreLimit = 500,
}: UseCandlesParams) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [errorInitial, setErrorInitial] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [getCandles, { isFetching }] = useLazyGetAssetCandlesQuery();
  const isLoadingMoreRef = useRef(false);

  const sortDescByDate = useCallback((arr: Candle[]) => {
    return [...arr].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, []);

  const loadInitial = useCallback(async () => {
    if (!assetId) return;
    setLoadingInitial(true);
    setErrorInitial(null);
    try {
      const res = await getCandles({
        id: Number(assetId),
        tf: timeframe,
        limit: initialLimit,
        offset: 0,
      }).unwrap();
      const results: Candle[] = res?.results ?? [];
      setCandles(sortDescByDate(results));
      setOffset(results.length);
      setHasMore(!!res?.next);
    } catch {
      setErrorInitial('Failed to load data');
    } finally {
      setLoadingInitial(false);
    }
  }, [assetId, timeframe, initialLimit, getCandles, sortDescByDate]);

  const loadMoreHistoricalData = useCallback(async () => {
    if (!assetId || isLoadingMoreRef.current || !hasMore || offset === 0)
      return;
    setIsLoadingMore(true);
    isLoadingMoreRef.current = true;
    try {
      const res = await getCandles({
        id: Number(assetId),
        tf: timeframe,
        limit: loadMoreLimit,
        offset,
      }).unwrap();
      const results: Candle[] = res?.results ?? [];
      if (results.length > 0) {
        let addedCount = 0;
        setCandles(prev => {
          const existing = new Set(prev.map(c => c.date));
          const newOnes = results.filter(c => !existing.has(c.date));
          addedCount = newOnes.length;
          return sortDescByDate([...prev, ...newOnes]);
        });
        if (addedCount > 0) {
          setOffset(offset + addedCount);
        }
        setHasMore(!!res?.next);
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [
    assetId,
    timeframe,
    loadMoreLimit,
    offset,
    hasMore,
    getCandles,
    sortDescByDate,
  ]);

  const fetchLatest = useCallback(async () => {
    if (!assetId) return;
    try {
      const res = await getCandles({
        id: Number(assetId),
        tf: timeframe,
        limit: initialLimit,
        offset: 0,
      }).unwrap();
      const results: Candle[] = res?.results ?? [];
      if (results.length === 0) return;
      const sortedLatest = sortDescByDate(results);
      setCandles(prev => {
        if (prev.length === 0) return sortedLatest;
        const map = new Map(prev.map(c => [c.date, c] as const));
        for (const c of sortedLatest) map.set(c.date, c);
        const merged = sortDescByDate(Array.from(map.values()));
        setOffset(merged.length);
        setHasMore(!!res?.next);
        return merged;
      });
    } catch {
      // silent: periodic fetches may fail transiently
    }
  }, [assetId, timeframe, initialLimit, getCandles, sortDescByDate]);

  // Reset and load when deps change
  useEffect(() => {
    setCandles([]);
    setOffset(0);
    setHasMore(true);
    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
    loadInitial();
  }, [loadInitial]);

  // Auto refresh latest
  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => fetchLatest(), 2000);
    return () => window.clearInterval(id);
  }, [autoRefresh, fetchLatest]);

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
