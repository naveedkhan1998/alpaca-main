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

import type { Candle, Instrument } from '@/types/common-types';
import { useTheme } from '@/components/ThemeProvider';
import {
  useGetPaginatedCandlesQuery,
  useLazyGetPaginatedCandlesQuery,
} from '@/api/instrumentService';
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

interface LocationState {
  obj: Instrument;
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

  // Pagination state
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const initialLimit = 500;
  const loadMoreLimit = 500;

  // Initial data fetch
  const {
    data: initialData,
    refetch,
    isLoading,
    isError,
  } = useGetPaginatedCandlesQuery({
    id: obj?.id,
    tf: timeframe,
    limit: initialLimit,
    offset: 0,
  });

  // Lazy query for loading more data
  const [fetchMoreData] = useLazyGetPaginatedCandlesQuery();

  // Initialize data when initial fetch completes
  useEffect(() => {
    if (initialData?.results) {
      setAllCandles(initialData.results);
      setCurrentOffset(initialData.results.length);
      // Check if there's more data using the 'next' field from Django pagination
      setHasMoreData(!!initialData.next);
    }
  }, [initialData]);

  // Reset pagination when timeframe or instrument changes - simplified approach
  useEffect(() => {
    // Reset pagination state when key dependencies change
    setAllCandles([]);
    setCurrentOffset(0);
    setHasMoreData(true);
    setIsLoadingMore(false);
  }, [timeframe, obj?.id]);

  // Load more data function
  const loadMoreHistoricalData = useCallback(async () => {
    if (!obj?.id || isLoadingMore || !hasMoreData || currentOffset === 0) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const response = await fetchMoreData({
        id: obj.id,
        tf: timeframe,
        limit: loadMoreLimit,
        offset: currentOffset,
      }).unwrap();

      if (response?.results && response.results.length > 0) {
        setAllCandles(prevCandles => {
          const existingDates = new Set(prevCandles.map(c => c.date));
          const newCandles: Candle[] = response.results.filter(
            (candle: Candle) => !existingDates.has(candle.date)
          );

          // Only update the offset by the number of unique new candles
          if (newCandles.length > 0) {
            setCurrentOffset(currentOffset + newCandles.length);
          }

          return [...prevCandles, ...newCandles].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        });

        setHasMoreData(!!response.next);
      } else {
        setHasMoreData(false);
      }
    } catch (error) {
      console.error('Error loading more data:', error);
      setHasMoreData(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    obj?.id,
    timeframe,
    currentOffset,
    isLoadingMore,
    hasMoreData,
    fetchMoreData,
    loadMoreLimit,
  ]);

  // Update refetch to reset pagination
  const handleRefetch = useCallback(() => {
    setAllCandles([]);
    setCurrentOffset(0);
    setHasMoreData(true);
    refetch();
  }, [refetch]);

  // Use the data that's available - either from allCandles or initialData
  const data = useMemo(() => {
    const candles =
      allCandles.length > 0 ? allCandles : initialData?.results || [];
    return {
      results: candles,
      count: candles.length,
    };
  }, [allCandles, initialData]);

  // Refs
  const mainChartRef = useRef<any>(null);
  const volumeChartRef = useRef<any>(null);
  const indicatorChartRef = useRef<any>(null);
  const chartSectionRef = useRef<HTMLDivElement>(null);

  const setMainChartTimeScale = useCallback((timeScale: any) => {
    mainChartRef.current = timeScale;
  }, []);

  const setVolumeChartTimeScale = useCallback((timeScale: any) => {
    volumeChartRef.current = timeScale;
  }, []);

  const setIndicatorChartTimeScale = useCallback((timeScale: any) => {
    indicatorChartRef.current = timeScale;
  }, []);

  const seriesData = useMemo(() => {
    if (!data) return [];
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
    return [];
  }, [data, seriesType]);

  const volumeData = useMemo(() => {
    if (!data) return [];
    return data.results
      .map(
        (
          { date, close, volume = 0 }: Candle,
          index: number,
          array: Candle[]
        ) => {
          const previousClose = index > 0 ? array[index - 1].close : close;
          const color =
            close >= previousClose
              ? isDarkMode
                ? 'rgba(34, 197, 94, 0.8)'
                : 'rgba(22, 163, 74, 0.8)'
              : isDarkMode
                ? 'rgba(239, 68, 68, 0.8)'
                : 'rgba(220, 38, 38, 0.8)';
          return {
            time: formatDate(date) as Time,
            value: volume,
            color,
          };
        }
      )
      .reverse();
  }, [data, isDarkMode]);

  // Check if all volume values are zero
  const hasValidVolume = useMemo(() => {
    if (!data) return false;
    return data.results.some(({ volume = 0 }: Candle) => volume > 0);
  }, [data]);

  // Only show volume if user enabled it AND there's valid volume data
  const shouldShowVolume = showVolume && hasValidVolume;

  const rsiData = useMemo(() => {
    if (!data || !activeIndicators.includes('RSI')) return [];
    return calculateRSI(
      data.results.map(d => ({
        ...d,
        time: formatDate(d.date),
      }))
    )
      .filter(item => item.time !== undefined)
      .map(item => ({ ...item, time: item.time as Time }))
      .reverse();
  }, [data, activeIndicators]);

  const atrData = useMemo(() => {
    if (!data || !activeIndicators.includes('ATR')) return [];
    return calculateATR(
      data.results.map(d => ({
        ...d,
        time: formatDate(d.date),
      }))
    )
      .map(item => ({ ...item, time: item.time as Time }))
      .reverse();
  }, [data, activeIndicators]);

  const emaData = useMemo(() => {
    if (!data || !activeIndicators.includes('EMA')) return [];
    // Assuming EMA is calculated on close prices
    return calculateMA(
      data.results.map(d => ({
        ...d,
        time: formatDate(d.date) as Time,
      })),
      14
    ).reverse(); // Default period 14
  }, [data, activeIndicators]);

  const bollingerBandsData = useMemo(() => {
    if (!data || !activeIndicators.includes('BollingerBands')) return [];
    const bands = calculateBollingerBands(
      data.results
        .map(d => ({
          ...d,
          time: formatDate(d.date),
        }))
        .reverse()
    );
    // Filter out any entries with undefined time values
    return bands.filter(band => band.time !== undefined) as {
      time: Time;
      upper: number;
      middle: number;
      lower: number;
    }[];
  }, [data, activeIndicators]);

  useEffect(() => {
    let intervalId: number | null = null;
    if (autoRefresh) {
      intervalId = window.setInterval(() => {
        refetch();
      }, 1000);
    }
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refetch]);
  const syncCharts = useCallback(() => {
    if (!mainChartRef.current) return;

    const getChartsToSync = () => {
      const charts = [];
      if (shouldShowVolume && volumeChartRef.current) {
        charts.push(volumeChartRef.current);
      }
      if (
        (activeIndicators.includes('RSI') ||
          activeIndicators.includes('ATR')) &&
        indicatorChartRef.current
      ) {
        charts.push(indicatorChartRef.current);
      }
      return charts;
    };

    const handleVisibleTimeRangeChange = () => {
      const mainVisibleRange = mainChartRef.current?.getVisibleRange();
      if (!mainVisibleRange) return;

      getChartsToSync().forEach(timeScale => {
        if (timeScale) {
          try {
            timeScale.setVisibleRange(mainVisibleRange);
          } catch (error) {
            console.error('Error setting visible range:', error);
          }
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

  const handleDownload = () => {
    const headers = 'Date,Time,Open,High,Low,Close,Volume';
    const csvData = seriesData.map((row: any) => {
      const date = new Date(row.time * 1000);
      return `${date.toLocaleString()},${row.open},${row.high},${row.low},${row.close},${row.value}`;
    });
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${csvData.join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${obj?.company_name}_${timeframe}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartSectionRef.current
        ?.requestFullscreen()
        .then(() => dispatch(setIsFullscreen(true)))
        .catch(err =>
          console.error(
            `Error attempting to enable fullscreen mode: ${err.message}`
          )
        );
    } else {
      document.exitFullscreen().then(() => dispatch(setIsFullscreen(false)));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      dispatch(setIsFullscreen(!!document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [dispatch]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return <ErrorScreen />;
  }

  if (!obj) {
    return <NotFoundScreen />;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-br from-background via-background to-muted/10">
      {/* Enhanced Header */}
      <GraphHeader
        data={data}
        obj={obj}
        handleDownload={handleDownload}
        toggleFullscreen={toggleFullscreen}
        refetch={handleRefetch}
      />

      {/* Main Content */}
      <div ref={chartSectionRef} className="flex flex-1 overflow-hidden">
        {isMobile ? (
          <div className="flex-1 p-2">
            <Sheet
              open={showControls}
              onOpenChange={open => dispatch(setShowControls(open))}
            >
              <SheetContent side="left" className="p-0">
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
                  isLoadingMore={isLoadingMore}
                  hasMoreData={hasMoreData}
                />
              </ResizablePanel>

              {/* Enhanced Volume Chart */}
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
            {/* Enhanced Controls Sidebar */}
            {showControls && (
              <>
                <ResizablePanel
                  defaultSize={24}
                  minSize={20}
                  maxSize={35}
                  className="min-w-0"
                >
                  <div className="h-full p-4 ">
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between p-4 border-b border-border/30 ">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dispatch(setShowControls(false))}
                          className="w-8 h-8 p-0 rounded-lg action-button hover:bg-gradient-to-r hover:from-destructive/20 hover:to-destructive/10 hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex-1 p-5 overflow-y-auto">
                        <ChartControls />
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Enhanced Chart Area */}
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
                      isLoadingMore={isLoadingMore}
                      hasMoreData={hasMoreData}
                    />
                  </ResizablePanel>

                  {/* Enhanced Volume Chart */}
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
                            className="w-8 h-8 p-0 rounded-lg action-button hover:bg-gradient-to-r hover:from-destructive/20 hover:to-destructive/10 hover:text-destructive"
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
                            className="w-8 h-8 p-0 rounded-lg action-button hover:bg-gradient-to-r hover:from-destructive/20 hover:to-destructive/10 hover:text-destructive"
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
