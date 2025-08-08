/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  setShowVolume,
  selectTimeframe,
  selectShowVolume,
  selectAutoRefresh,
  selectShowControls,
  setIsFullscreen,
  setShowControls,
  selectSeriesType,
  selectActiveIndicators,
  removeIndicator,
} from './graphSlice';
import React, {
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

import { Time } from 'lightweight-charts';

import { Button } from '@/components/ui/button';

import { HiChartBar, HiCog } from 'react-icons/hi';

import type { Asset, Candle } from '@/types/common-types';
import { useTheme } from '@/components/ThemeProvider';
import {
  formatDate,
  calculateRSI,
  calculateBollingerBands,
  calculateATR,
  calculateMA,
} from '@/lib/functions';
import ChartControls from './components/ChartControls';
import MainChart from './components/MainChart';
import VolumeChart from './components/VolumeChart';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import NotFoundScreen from './components/NotFoundScreen';
import GraphHeader from './components/GraphHeader';
import { X } from 'lucide-react';
import IndicatorChart from './components/IndicatorChart';
import { useIsMobile } from '@/hooks/useMobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useLazyGetAssetCandlesQuery } from '@/api/assetService';

interface LocationState {
  obj: Asset;
}

const GraphsPage: React.FC = () => {
  const location = useLocation();
  const isMobile = useIsMobile();

  const { obj } = (location.state as LocationState) || {};
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // State variables
  const dispatch = useAppDispatch();
  const timeframe = useAppSelector(selectTimeframe);
  const showVolume = useAppSelector(selectShowVolume);
  const autoRefresh = useAppSelector(selectAutoRefresh);
  const seriesType = useAppSelector(selectSeriesType);
  const showControls = useAppSelector(selectShowControls);
  const activeIndicators = useAppSelector(selectActiveIndicators);

  // Data state (simplified)
  const [candles, setCandles] = useState<Candle[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [errorInitial, setErrorInitial] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const initialLimit = 500;
  const loadMoreLimit = 500;

  // API trigger (single entry point)
  const [getCandles, { isFetching }] = useLazyGetAssetCandlesQuery();

  // Refs
  const mainChartRef = useRef<any>(null);
  const volumeChartRef = useRef<any>(null);
  const indicatorChartRef = useRef<any>(null);
  const chartSectionRef = useRef<HTMLDivElement>(null);

  // Fullscreen local state to style container
  const [isFullscreenView, setIsFullscreenView] = useState(false);

  // Helpers
  const sortDescByDate = useCallback((arr: Candle[]) => {
    return [...arr].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, []);

  const loadInitial = useCallback(async () => {
    if (!obj?.id) return;
    setLoadingInitial(true);
    setErrorInitial(null);
    try {
      const res = await getCandles({
        id: obj.id,
        tf: timeframe,
        limit: initialLimit,
        offset: 0,
      }).unwrap();
      const results: Candle[] = res?.results ?? [];
      setCandles(sortDescByDate(results));
      setOffset(results.length);
      setHasMore(!!res?.next);
    } catch (e: any) {
      console.error('Initial fetch failed', e);
      setErrorInitial('Failed to load data');
    } finally {
      setLoadingInitial(false);
    }
  }, [getCandles, obj?.id, timeframe, initialLimit, sortDescByDate]);

  const loadMoreHistoricalData = useCallback(async () => {
    if (!obj?.id || isLoadingMore || !hasMore || offset === 0) return;
    setIsLoadingMore(true);
    try {
      const res = await getCandles({
        id: obj.id,
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
    } catch (e) {
      console.error('Load more failed', e);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    getCandles,
    obj?.id,
    timeframe,
    loadMoreLimit,
    offset,
    hasMore,
    isLoadingMore,
    sortDescByDate,
  ]);

  const fetchLatest = useCallback(async () => {
    if (!obj?.id) return;
    try {
      const res = await getCandles({
        id: obj.id,
        tf: timeframe,
        limit: initialLimit,
        offset: 0,
      }).unwrap();
      const results: Candle[] = res?.results ?? [];
      if (results.length === 0) return;
      const sortedLatest = sortDescByDate(results);
      setCandles(prev => {
        if (prev.length === 0) return sortedLatest;

        // Merge by timestamp (date): replace existing candles with fresh ones when timestamps match,
        // and include any strictly newer candles.
        const map = new Map(prev.map(c => [c.date, c] as const));
        for (const c of sortedLatest) {
          map.set(c.date, c);
        }
        const merged = sortDescByDate(Array.from(map.values()));
        setOffset(merged.length);
        setHasMore(!!res?.next);
        return merged;
      });
    } catch (e) {
      console.warn('Fetch latest failed', e);
    }
  }, [getCandles, obj?.id, timeframe, initialLimit, sortDescByDate]);

  // Initial load + reset on dependency change
  useEffect(() => {
    setCandles([]);
    setOffset(0);
    setHasMore(true);
    setIsLoadingMore(false);
    loadInitial();
  }, [loadInitial]);

  // Auto-refresh for latest candles
  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      fetchLatest();
    }, 2000);
    return () => window.clearInterval(id);
  }, [autoRefresh, fetchLatest]);

  // Manual refetch (header action)
  const handleRefetch = useCallback(() => {
    fetchLatest();
  }, [fetchLatest]);

  // Chart time scale refs setters
  const setMainChartTimeScale = useCallback((timeScale: any) => {
    mainChartRef.current = timeScale;
  }, []);
  const setVolumeChartTimeScale = useCallback((timeScale: any) => {
    volumeChartRef.current = timeScale;
  }, []);
  const setIndicatorChartTimeScale = useCallback((timeScale: any) => {
    indicatorChartRef.current = timeScale;
  }, []);

  // Derived data for charts
  const data = useMemo(() => {
    return { results: candles, count: candles.length };
  }, [candles]);

  const seriesData = useMemo(() => {
    if (!data) return [] as any[];
    if (seriesType === 'ohlc') {
      return data.results
        .map(({ date, open, high, low, close }: Candle) => ({
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
        .map(({ date, close }: Candle) => ({
          time: formatDate(date) as Time,
          value: close,
        }))
        .reverse();
    }
    return [] as any[];
  }, [data, seriesType]);

  const volumeData = useMemo(() => {
    if (!data) return [] as any[];
    return data.results
      .map(
        (
          { date, close, volume = 0 }: Candle,
          index: number,
          array: Candle[]
        ) => {
          const previousClose = index > 0 ? array[index - 1].close : close;
          // Softer, theme-aware colors optimized for light mode
          const green = isDarkMode
            ? 'rgba(34, 197, 94, 0.8)'
            : 'rgba(16, 185, 129, 0.8)';
          const red = isDarkMode
            ? 'rgba(239, 68, 68, 0.8)'
            : 'rgba(244, 63, 94, 0.85)';
          const color = close >= previousClose ? green : red;
          return { time: formatDate(date) as Time, value: volume, color };
        }
      )
      .reverse();
  }, [data, isDarkMode]);

  const hasValidVolume = useMemo(() => {
    if (!data) return false;
    return data.results.some(({ volume = 0 }: Candle) => volume > 0);
  }, [data]);

  const shouldShowVolume = showVolume && hasValidVolume;

  const rsiData = useMemo(() => {
    if (!data || !activeIndicators.includes('RSI')) return [] as any[];
    return calculateRSI(
      data.results.map(d => ({ ...d, time: formatDate(d.date) }))
    )
      .filter(item => item.time !== undefined)
      .map(item => ({ ...item, time: item.time as Time }))
      .reverse();
  }, [data, activeIndicators]);

  const atrData = useMemo(() => {
    if (!data || !activeIndicators.includes('ATR')) return [] as any[];
    return calculateATR(
      data.results.map(d => ({ ...d, time: formatDate(d.date) }))
    )
      .map(item => ({ ...item, time: item.time as Time }))
      .reverse();
  }, [data, activeIndicators]);

  const emaData = useMemo(() => {
    if (!data || !activeIndicators.includes('EMA')) return [] as any[];
    return calculateMA(
      data.results.map(d => ({ ...d, time: formatDate(d.date) as Time })),
      14
    ).reverse();
  }, [data, activeIndicators]);

  const bollingerBandsData = useMemo(() => {
    if (!data || !activeIndicators.includes('BollingerBands'))
      return [] as any[];
    const bands = calculateBollingerBands(
      data.results.map(d => ({ ...d, time: formatDate(d.date) })).reverse()
    );
    return bands.filter(band => band.time !== undefined) as {
      time: Time;
      upper: number;
      middle: number;
      lower: number;
    }[];
  }, [data, activeIndicators]);

  // Sync time scales across charts
  const syncCharts = useCallback(() => {
    if (!mainChartRef.current) return;

    const getChartsToSync = () => {
      const charts: any[] = [];
      if (shouldShowVolume && volumeChartRef.current)
        charts.push(volumeChartRef.current);
      if (
        (activeIndicators.includes('RSI') ||
          activeIndicators.includes('ATR')) &&
        indicatorChartRef.current
      )
        charts.push(indicatorChartRef.current);
      return charts;
    };

    const handleVisibleTimeRangeChange = () => {
      const mainVisibleRange = mainChartRef.current?.getVisibleRange();
      if (!mainVisibleRange) return;
      getChartsToSync().forEach(timeScale => {
        if (!timeScale) return;
        try {
          timeScale.setVisibleRange(mainVisibleRange);
        } catch (error) {
          console.error('Error setting visible range:', error);
        }
      });
    };

    const subscribeToMainChart = () => {
      mainChartRef.current?.subscribeVisibleTimeRangeChange(
        handleVisibleTimeRangeChange
      );
    };

    handleVisibleTimeRangeChange();
    const timeoutId = setTimeout(subscribeToMainChart, 100);

    return () => {
      clearTimeout(timeoutId);
      mainChartRef.current?.unsubscribeVisibleTimeRangeChange(
        handleVisibleTimeRangeChange
      );
    };
  }, [shouldShowVolume, activeIndicators]);

  useEffect(() => {
    const cleanup = syncCharts();
    return () => {
      if (cleanup) cleanup();
    };
  }, [syncCharts, seriesData, shouldShowVolume]);

  // CSV download: use canonical candles
  const handleDownload = useCallback(() => {
    const headers = 'Date,Open,High,Low,Close,Volume';
    const csvData = candles.map(
      ({ date, open, high, low, close, volume = 0 }) => {
        const dt = new Date(date);
        return `${dt.toLocaleString()},${open},${high},${low},${close},${volume}`;
      }
    );
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${csvData.join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${obj?.name}_${timeframe}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [candles, obj?.name, timeframe]);

  // Fullscreen toggle and styles
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      chartSectionRef.current
        ?.requestFullscreen()
        .then(() => {
          dispatch(setIsFullscreen(true));
          setIsFullscreenView(true);
        })
        .catch(err =>
          console.error(
            `Error attempting to enable fullscreen mode: ${err.message}`
          )
        );
    } else {
      document.exitFullscreen().then(() => {
        dispatch(setIsFullscreen(false));
        setIsFullscreenView(false);
      });
    }
  }, [dispatch]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      dispatch(setIsFullscreen(active));
      setIsFullscreenView(active);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [dispatch]);

  // Keyboard shortcuts: F (fullscreen), V (volume), C (controls)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target.isContentEditable)
        return;
      const key = e.key.toLowerCase();
      if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === 'v') {
        e.preventDefault();
        dispatch(setShowVolume(!showVolume));
      } else if (key === 'c') {
        e.preventDefault();
        dispatch(setShowControls(!showControls));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, showControls, showVolume, toggleFullscreen]);

  if (!obj) return <NotFoundScreen />;
  if (loadingInitial && candles.length === 0) return <LoadingScreen />;
  if (errorInitial) return <ErrorScreen />;

  return (
    <div className="flex flex-col h-[100dvh] text-foreground bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <GraphHeader
        obj={obj}
        handleDownload={handleDownload}
        toggleFullscreen={toggleFullscreen}
        refetch={handleRefetch}
      />

      {/* Main Content */}
      <div
        ref={chartSectionRef}
        className={
          `flex flex-1 overflow-hidden ` +
          (isFullscreenView ? 'bg-background' : 'bg-trading-gradient')
        }
      >
        {isMobile ? (
          <div className="flex-1 p-2">
            <Sheet
              open={showControls}
              onOpenChange={open => dispatch(setShowControls(open))}
            >
              <SheetContent
                side="left"
                className="p-0 bg-card text-card-foreground"
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between p-4 border-b border-border/30">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-chart-1/20 to-chart-1/10">
                        <HiCog className="w-4 h-4 text-chart-1" />
                      </div>
                      <div>
                        <span className="font-bold text-card-foreground">
                          Controls
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-5 overflow-y-auto">
                    <ChartControls />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <ResizablePanelGroup direction="vertical">
              {/* Main Chart */}
              <ResizablePanel defaultSize={shouldShowVolume ? 75 : 100}>
                <MainChart
                  seriesData={seriesData}
                  mode={isDarkMode}
                  obj={obj}
                  setTimeScale={setMainChartTimeScale}
                  emaData={emaData}
                  bollingerBandsData={bollingerBandsData}
                  onLoadMoreData={loadMoreHistoricalData}
                  isLoadingMore={isLoadingMore || isFetching}
                  hasMoreData={hasMore}
                />
                {(isLoadingMore || isFetching) && (
                  <div className="flex items-center justify-center py-2 text-xs text-muted-foreground animate-pulse">
                    Loading more…
                  </div>
                )}
              </ResizablePanel>

              {/* Volume Chart */}
              {shouldShowVolume && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={15}>
                    <div className="flex items-center justify-between p-2 border-b border-border/30">
                      <div className="flex items-center space-x-2">
                        <HiChartBar className="w-4 h-4 text-chart-1" />
                        <span className="font-bold text-card-foreground">
                          Volume
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dispatch(setShowVolume(false))}
                        className="w-8 h-8 p-0 rounded-lg"
                        aria-label="Hide volume"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <VolumeChart
                      volumeData={volumeData}
                      mode={isDarkMode}
                      setTimeScale={setVolumeChartTimeScale}
                    />
                  </ResizablePanel>
                </>
              )}

              {/* Indicator Chart */}
              {(activeIndicators.includes('RSI') ||
                activeIndicators.includes('ATR')) && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={15}>
                    <div className="flex items-center justify-between p-2 border-b border-border/30">
                      <div className="flex items-center space-x-2">
                        <HiChartBar className="w-4 h-4 text-chart-1" />
                        <span className="font-bold text-card-foreground">
                          Indicators
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          dispatch(removeIndicator('RSI'));
                          dispatch(removeIndicator('ATR'));
                        }}
                        className="w-8 h-8 p-0 rounded-lg"
                        aria-label="Hide indicators"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <IndicatorChart
                      rsiData={rsiData}
                      atrData={atrData}
                      mode={isDarkMode}
                      setTimeScale={setIndicatorChartTimeScale}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        ) : (
          <ResizablePanelGroup
            direction="horizontal"
            className="relative flex-1"
          >
            {/* Controls Sidebar */}
            {showControls && (
              <>
                <ResizablePanel
                  defaultSize={24}
                  minSize={20}
                  maxSize={35}
                  className="min-w-0"
                >
                  <div className="h-full p-4 ">
                    <div className="flex flex-col h-full border shadow-sm bg-card text-card-foreground border-border/30 rounded-xl">
                      <div className="flex items-center justify-between p-4 border-b border-border/30 ">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-chart-1/20 to-chart-1/10">
                            <HiCog className="w-4 h-4 text-chart-1" />
                          </div>
                          <span className="font-bold">Controls</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-8 h-8 p-0 rounded-lg"
                          onClick={() => dispatch(setShowControls(false))}
                          aria-label="Hide controls"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex-1 p-4 overflow-y-auto">
                        <ChartControls />
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Charts Area */}
            <ResizablePanel defaultSize={showControls ? 76 : 100}>
              <div className="h-full p-4">
                <ResizablePanelGroup direction="vertical">
                  {/* Main Chart */}
                  <ResizablePanel defaultSize={shouldShowVolume ? 75 : 100}>
                    <MainChart
                      seriesData={seriesData}
                      mode={isDarkMode}
                      obj={obj}
                      setTimeScale={setMainChartTimeScale}
                      emaData={emaData}
                      bollingerBandsData={bollingerBandsData}
                      onLoadMoreData={loadMoreHistoricalData}
                      isLoadingMore={isLoadingMore || isFetching}
                      hasMoreData={hasMore}
                    />
                    {(isLoadingMore || isFetching) && (
                      <div className="flex items-center justify-center py-2 text-xs text-muted-foreground animate-pulse">
                        Loading more…
                      </div>
                    )}
                  </ResizablePanel>

                  {/* Volume Chart */}
                  {shouldShowVolume && (
                    <>
                      <ResizableHandle withHandle />
                      <ResizablePanel defaultSize={25} minSize={15}>
                        <div className="flex items-center justify-between p-4 border-b border-border/30 ">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-chart-1/20 to-chart-1/10">
                              <HiChartBar className="w-4 h-4 text-chart-1" />
                            </div>
                            <div>
                              <span className="font-bold text-card-foreground">
                                Volume
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dispatch(setShowVolume(false))}
                            className="w-8 h-8 p-0 rounded-lg"
                            aria-label="Hide volume"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <VolumeChart
                          volumeData={volumeData}
                          mode={isDarkMode}
                          setTimeScale={setVolumeChartTimeScale}
                        />
                      </ResizablePanel>
                    </>
                  )}

                  {/* Indicator Chart */}
                  {(activeIndicators.includes('RSI') ||
                    activeIndicators.includes('ATR')) && (
                    <>
                      <ResizableHandle withHandle />
                      <ResizablePanel defaultSize={25} minSize={15}>
                        <div className="flex items-center justify-between p-4 border-b border-border/30 ">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-chart-1/20 to-chart-1/10">
                              <HiChartBar className="w-4 h-4 text-chart-1" />
                            </div>
                            <div>
                              <span className="font-bold text-card-foreground">
                                Indicators
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              dispatch(removeIndicator('RSI'));
                              dispatch(removeIndicator('ATR'));
                            }}
                            className="w-8 h-8 p-0 rounded-lg"
                            aria-label="Hide indicators"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <IndicatorChart
                          rsiData={rsiData}
                          atrData={atrData}
                          mode={isDarkMode}
                          setTimeScale={setIndicatorChartTimeScale}
                        />
                      </ResizablePanel>
                    </>
                  )}
                </ResizablePanelGroup>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
};

export default GraphsPage;
