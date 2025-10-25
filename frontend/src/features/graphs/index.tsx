import { useRef, useCallback, useEffect, useMemo } from 'react';
import type { ITimeScaleApi, Time } from 'lightweight-charts';
import { useLocation } from 'react-router-dom';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
//
import { HiChartBar, HiCog } from 'react-icons/hi';
import type { Asset } from '@/types/common-types';
import { useTheme } from '@/components/ThemeProvider';
//import { Button } from '@/components/ui/button';
import ChartControls from './components/ChartControls';
import MainChart from './components/MainChart';
import VolumeChart from './components/VolumeChart';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import NotFoundScreen from './components/NotFoundScreen';
import GraphHeader from './components/GraphHeader';
import IndicatorChart from './components/IndicatorChart';
import ReplayControls from './components/ReplayControls';
import { useIsMobile } from '@/hooks/useMobile';
import { formatDate } from '@/lib/functions';
import { Sheet, SheetContent } from '@/components/ui/sheet';
//import { Dialog, DialogContent } from '@/components/ui/dialog';
//import { Drawer, DrawerContent } from '@/components/ui/drawer';
import PanelHeader from './components/PanelHeader';
//import PaperTradingPanel from './components/controls/PaperTradingPanel';
import { useCandles } from './hooks/useCandles';
import { useDerivedSeries } from './hooks/useDerivedSeries';
import { useChartSync } from './hooks/useChartSync';
import { useFullscreen } from './hooks/useFullscreen';
import { useGraphShortcuts } from './hooks/useGraphShortcuts';
import { useReplayController } from './hooks/useReplayController';
import ChartToolbar from './components/ChartToolbar';
import {
  setShowVolume,
  setAutoRefresh,
  selectTimeframe,
  selectShowVolume,
  selectAutoRefresh,
  selectShowControls,
  setShowControls,
  selectSeriesType,
  selectActiveIndicators,
  selectIndicatorConfigs,
  removeIndicator,
  setReplayStep,
  setReplayTotalSteps,
  setReplayPlaying,
} from './graphSlice';

interface LocationState {
  obj: Asset;
}

const formatReplayTimeLabel = (timeValue?: Time) => {
  if (typeof timeValue === 'number') {
    const date = new Date(timeValue * 1000);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    };
    return date.toLocaleString(undefined, options);
  }
  if (typeof timeValue === 'string') {
    const timestamp = formatDate(timeValue);
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }
  if (timeValue && typeof timeValue === 'object' && 'year' in timeValue) {
    const { year, month, day } = timeValue as {
      year: number;
      month: number;
      day: number;
    };
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);
    return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString();
  }
  return undefined;
};

const GraphsPage: React.FC = () => {
  const location = useLocation();
  const isMobile = useIsMobile();

  const { obj } = (location.state as LocationState) || {};
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // State
  const dispatch = useAppDispatch();
  const timeframe = useAppSelector(selectTimeframe);
  const showVolume = useAppSelector(selectShowVolume);
  const autoRefresh = useAppSelector(selectAutoRefresh);
  const seriesType = useAppSelector(selectSeriesType);
  const showControls = useAppSelector(selectShowControls);
  const activeIndicators = useAppSelector(selectActiveIndicators);
  const indicatorConfigs = useAppSelector(selectIndicatorConfigs);
  const {
    enabled: isReplayEnabled,
    playing: isReplayPlaying,
    speed: replaySpeed,
    currentStep: replayStep,
    totalSteps: replayTotalSteps,
    handleReplayToggle,
    handleReplayPlayPause,
    handleReplayRestart,
    handleReplaySeek,
    handleReplaySpeedChange,
  } = useReplayController();

  // Refs
  const mainChartRef = useRef<ITimeScaleApi<Time> | null>(null);
  const volumeChartRef = useRef<ITimeScaleApi<Time> | null>(null);
  const rsiChartRef = useRef<ITimeScaleApi<Time> | null>(null);
  const atrChartRef = useRef<ITimeScaleApi<Time> | null>(null);
  const chartSectionRef = useRef<HTMLDivElement>(null);

  // Data & derived series
  const {
    candles,
    isFetching,
    loadingInitial,
    errorInitial,
    isLoadingMore,
    hasMore,
    handleRefetch,
    loadMoreHistoricalData,
  } = useCandles({ assetId: obj?.id, timeframe, autoRefresh });

  const {
    seriesData,
    volumeData,
    hasValidVolume,
    rsiData,
    atrData,
    emaData,
    bollingerBandsData,
  } = useDerivedSeries({
    candles,
    seriesType,
    isDarkMode,
    activeIndicators,
    indicatorConfigs,
  });
  const prevSeriesLengthRef = useRef(seriesData.length);
  const prevReplayEnabledRef = useRef(isReplayEnabled);

  const totalSeriesCount = seriesData.length;

  const effectiveReplayIndex = useMemo(() => {
    if (!isReplayEnabled) return totalSeriesCount;
    if (totalSeriesCount === 0) return 0;
    return Math.min(Math.max(replayStep, 1), totalSeriesCount);
  }, [isReplayEnabled, replayStep, totalSeriesCount]);

  const displayedSeriesData = useMemo(
    () =>
      isReplayEnabled ? seriesData.slice(0, effectiveReplayIndex) : seriesData,
    [isReplayEnabled, seriesData, effectiveReplayIndex]
  );

  const displayedVolumeData = useMemo(
    () =>
      isReplayEnabled ? volumeData.slice(0, effectiveReplayIndex) : volumeData,
    [isReplayEnabled, volumeData, effectiveReplayIndex]
  );

  const displayedRsiData = useMemo(
    () => (isReplayEnabled ? rsiData.slice(0, effectiveReplayIndex) : rsiData),
    [isReplayEnabled, rsiData, effectiveReplayIndex]
  );

  const displayedAtrData = useMemo(
    () => (isReplayEnabled ? atrData.slice(0, effectiveReplayIndex) : atrData),
    [isReplayEnabled, atrData, effectiveReplayIndex]
  );

  const displayedEmaData = useMemo(
    () => (isReplayEnabled ? emaData.slice(0, effectiveReplayIndex) : emaData),
    [isReplayEnabled, emaData, effectiveReplayIndex]
  );

  const displayedBollingerBandsData = useMemo(
    () =>
      isReplayEnabled
        ? bollingerBandsData.slice(0, effectiveReplayIndex)
        : bollingerBandsData,
    [isReplayEnabled, bollingerBandsData, effectiveReplayIndex]
  );

  const currentReplayLabel = useMemo(() => {
    if (!isReplayEnabled || displayedSeriesData.length === 0) return undefined;
    const lastPoint = displayedSeriesData[displayedSeriesData.length - 1] as {
      time?: Time;
    };
    return formatReplayTimeLabel(lastPoint?.time);
  }, [displayedSeriesData, isReplayEnabled]);

  const shouldShowVolume = showVolume && hasValidVolume;
  const shouldRenderReplayControls = isReplayEnabled && totalSeriesCount > 0;
  const headerReplayControls = useMemo(
    () => ({
      enabled: isReplayEnabled,
      playing: isReplayPlaying,
      currentStep: effectiveReplayIndex,
      totalSteps: totalSeriesCount,
      onToggle: handleReplayToggle,
      onPlayPause: handleReplayPlayPause,
      onRestart: handleReplayRestart,
      onSeek: handleReplaySeek,
      speed: replaySpeed,
      onSpeedChange: handleReplaySpeedChange,
      currentLabel: currentReplayLabel,
      isLoadingMore: isLoadingMore || isFetching,
      hasMoreHistorical: hasMore,
      onLoadMoreHistorical: hasMore ? loadMoreHistoricalData : undefined,
    }),
    [
      currentReplayLabel,
      effectiveReplayIndex,
      handleReplayPlayPause,
      handleReplayRestart,
      handleReplaySeek,
      handleReplaySpeedChange,
      handleReplayToggle,
      hasMore,
      isFetching,
      isLoadingMore,
      isReplayEnabled,
      isReplayPlaying,
      loadMoreHistoricalData,
      replaySpeed,
      totalSeriesCount,
    ]
  );
  const mobileReplayControls =
    shouldRenderReplayControls && isMobile ? (
      <Sheet open={isReplayEnabled} onOpenChange={handleReplayToggle}>
        <SheetContent
          side="bottom"
          className="h-auto max-h-[80vh] rounded-t-2xl border-t border-border/60 bg-card backdrop-blur-xl p-0 mx-0"
        >
          <ReplayControls
            variant="overlay"
            enabled={isReplayEnabled}
            playing={isReplayPlaying}
            currentStep={effectiveReplayIndex}
            totalSteps={totalSeriesCount}
            onToggle={handleReplayToggle}
            onPlayPause={handleReplayPlayPause}
            onRestart={handleReplayRestart}
            onSeek={handleReplaySeek}
            speed={replaySpeed}
            onSpeedChange={handleReplaySpeedChange}
            currentLabel={currentReplayLabel}
            isLoadingMore={isLoadingMore || isFetching}
            hasMoreHistorical={hasMore}
            onLoadMoreHistorical={hasMore ? loadMoreHistoricalData : undefined}
          />
        </SheetContent>
      </Sheet>
    ) : null;

  // TimeScale refs setters
  const setMainChartTimeScale = (timeScale: ITimeScaleApi<Time>) => {
    mainChartRef.current = timeScale;
  };
  const setVolumeChartTimeScale = (timeScale: ITimeScaleApi<Time>) => {
    volumeChartRef.current = timeScale;
  };
  const setRSIChartTimeScale = (timeScale: ITimeScaleApi<Time>) => {
    rsiChartRef.current = timeScale;
  };
  const setATRChartTimeScale = (timeScale: ITimeScaleApi<Time>) => {
    atrChartRef.current = timeScale;
  };

  // Sync charts & fullscreen
  const { syncCharts } = useChartSync({
    mainChartRef,
    volumeChartRef,
    rsiChartRef,
    atrChartRef,
    shouldShowVolume,
    activeIndicators,
  });

  const { isFullscreenView, toggleFullscreen } = useFullscreen(chartSectionRef);

  // Keyboard shortcuts
  useGraphShortcuts({ showVolume, showControls, toggleFullscreen });

  useEffect(() => {
    if (replayTotalSteps !== totalSeriesCount) {
      dispatch(setReplayTotalSteps(totalSeriesCount));
    }
  }, [dispatch, replayTotalSteps, totalSeriesCount]);

  useEffect(() => {
    if (prevReplayEnabledRef.current !== isReplayEnabled) {
      if (isReplayEnabled) {
        // When enabling replay, start from beginning if we were at the end, otherwise continue
        if (replayStep >= totalSeriesCount) {
          dispatch(setReplayStep(totalSeriesCount > 1 ? 1 : totalSeriesCount));
        }
        dispatch(setReplayPlaying(false));
      } else {
        // When disabling replay, show all data
        dispatch(setReplayStep(totalSeriesCount));
        dispatch(setReplayPlaying(false));
      }
    }
    prevReplayEnabledRef.current = isReplayEnabled;
  }, [dispatch, isReplayEnabled, totalSeriesCount, replayStep]);

  useEffect(() => {
    const previousLength = prevSeriesLengthRef.current;
    if (previousLength === totalSeriesCount) return;

    if (isReplayEnabled) {
      const delta = totalSeriesCount - previousLength;
      if (totalSeriesCount === 0) {
        dispatch(setReplayStep(0));
      } else if (delta > 0) {
        dispatch(setReplayStep(Math.min(replayStep + delta, totalSeriesCount)));
      } else {
        dispatch(setReplayStep(Math.min(replayStep, totalSeriesCount)));
      }
    } else {
      dispatch(setReplayStep(totalSeriesCount));
    }

    prevSeriesLengthRef.current = totalSeriesCount;
  }, [dispatch, totalSeriesCount, isReplayEnabled, replayStep]);

  useEffect(() => {
    if (!isReplayEnabled || !isReplayPlaying) return;
    if (totalSeriesCount <= 1) {
      dispatch(setReplayPlaying(false));
      return;
    }
    if (replayStep >= totalSeriesCount) {
      dispatch(setReplayPlaying(false));
      return;
    }

    const intervalMs = Math.max(120, Math.round(800 / replaySpeed));
    const timer = window.setInterval(() => {
      const next = replayStep + 1;
      if (next >= totalSeriesCount) {
        window.clearInterval(timer);
        dispatch(setReplayStep(totalSeriesCount));
        dispatch(setReplayPlaying(false));
      } else {
        dispatch(setReplayStep(next));
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    dispatch,
    isReplayEnabled,
    isReplayPlaying,
    replaySpeed,
    replayStep,
    totalSeriesCount,
  ]);

  useEffect(() => {
    if (isReplayPlaying && autoRefresh) {
      dispatch(setAutoRefresh(false));
    }
  }, [autoRefresh, dispatch, isReplayPlaying]);

  useEffect(() => {
    if (!isReplayEnabled || !hasMore) return;
    if (isLoadingMore || isFetching) return;
    if (totalSeriesCount === 0) return;
    if (effectiveReplayIndex <= 2) {
      loadMoreHistoricalData();
    }
  }, [
    effectiveReplayIndex,
    hasMore,
    isFetching,
    isLoadingMore,
    isReplayEnabled,
    loadMoreHistoricalData,
    totalSeriesCount,
  ]);

  useEffect(() => {
    if (totalSeriesCount <= 1 && isReplayPlaying) {
      dispatch(setReplayPlaying(false));
    }
  }, [dispatch, totalSeriesCount, isReplayPlaying]);

  // Keep charts in sync on mount/update
  useEffect(() => {
    const cleanup = syncCharts();
    return () => {
      if (cleanup) cleanup();
    };
  }, [syncCharts]);

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

  if (!obj) return <NotFoundScreen />;
  if (loadingInitial && mainChartRef.current === null) return <LoadingScreen />;
  if (errorInitial) return <ErrorScreen />;

  return (
    <div className="flex flex-col h-[100dvh] text-foreground bg-gradient-to-br from-background via-muted/5 to-background">
      {/* Header */}
      <GraphHeader
        obj={obj}
        handleDownload={handleDownload}
        toggleFullscreen={toggleFullscreen}
        refetch={handleRefetch}
        replayControls={headerReplayControls}
      />

      {/* Main Content */}
      <div
        ref={chartSectionRef}
        className={
          `flex flex-1 overflow-hidden ` +
          (isFullscreenView
            ? 'bg-background'
            : 'bg-gradient-to-br from-muted/10 via-background to-muted/5')
        }
      >
        {isMobile ? (
          <div className="flex-1 ">
            <Sheet
              open={showControls}
              onOpenChange={open => dispatch(setShowControls(open))}
            >
              <SheetContent
                side="left"
                className="p-0 bg-gradient-to-b from-card via-card to-muted/20 text-card-foreground"
              >
                <div className="flex flex-col h-full">
                  <PanelHeader
                    title="Chart Controls"
                    icon={<HiCog className="w-4 h-4 text-primary" />}
                    dense
                  />
                  <div className="flex-1 p-4 overflow-y-auto scrollbar-hidden">
                    <ChartControls />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <ResizablePanelGroup direction="vertical">
              {/* Main Chart */}
              <ResizablePanel defaultSize={shouldShowVolume ? 75 : 100}>
                <div className="relative h-full">
                  <MainChart
                    seriesData={displayedSeriesData}
                    mode={isDarkMode}
                    obj={obj}
                    setTimeScale={setMainChartTimeScale}
                    emaData={displayedEmaData}
                    bollingerBandsData={displayedBollingerBandsData}
                    onLoadMoreData={loadMoreHistoricalData}
                    isLoadingMore={isLoadingMore || isFetching}
                    hasMoreData={hasMore}
                  />
                  {/* Chart Toolbar overlay */}
                  <div className="pointer-events-auto">
                    <ChartToolbar compact />
                  </div>
                  {mobileReplayControls}
                </div>
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
                    <PanelHeader
                      title="Volume"
                      icon={<HiChartBar className="w-4 h-4 text-chart-1" />}
                      onClose={() => dispatch(setShowVolume(false))}
                      dense
                    />
                    <VolumeChart
                      volumeData={displayedVolumeData}
                      mode={isDarkMode}
                      setTimeScale={setVolumeChartTimeScale}
                    />
                  </ResizablePanel>
                </>
              )}

              {/* RSI Chart */}
              {activeIndicators.includes('RSI') && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={20} minSize={15}>
                    <PanelHeader
                      title="RSI"
                      icon={<HiChartBar className="w-4 h-4 text-amber-500" />}
                      onClose={() => dispatch(removeIndicator('RSI'))}
                      dense
                    />
                    <IndicatorChart
                      rsiData={displayedRsiData}
                      atrData={[]}
                      mode={isDarkMode}
                      setTimeScale={setRSIChartTimeScale}
                    />
                  </ResizablePanel>
                </>
              )}

              {/* ATR Chart */}
              {activeIndicators.includes('ATR') && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={20} minSize={15}>
                    <PanelHeader
                      title="ATR"
                      icon={<HiChartBar className="w-4 h-4 text-blue-500" />}
                      onClose={() => dispatch(removeIndicator('ATR'))}
                      dense
                    />
                    <IndicatorChart
                      rsiData={[]}
                      atrData={displayedAtrData}
                      mode={isDarkMode}
                      setTimeScale={setATRChartTimeScale}
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
                  defaultSize={25}
                  minSize={20}
                  maxSize={35}
                  className="min-w-0 border-r bg-gradient-to-b from-card/80 via-card/60 to-muted/20 border-border/40"
                >
                  <div className="flex flex-col h-full">
                    <PanelHeader
                      title="Chart Controls"
                      icon={<HiCog className="w-4 h-4 text-primary" />}
                      onClose={() => dispatch(setShowControls(false))}
                    />
                    <div className="flex-1 p-4 overflow-y-auto scrollbar-hidden">
                      <ChartControls />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Charts Area */}
            <ResizablePanel defaultSize={showControls ? 75 : 100}>
              <div className="h-full bg-gradient-to-br from-transparent via-muted/5 to-transparent">
                <ResizablePanelGroup direction="vertical">
                  {/* Main Chart */}
                  <ResizablePanel defaultSize={shouldShowVolume ? 75 : 100}>
                    <div className="relative h-full">
                      <MainChart
                        seriesData={displayedSeriesData}
                        mode={isDarkMode}
                        obj={obj}
                        setTimeScale={setMainChartTimeScale}
                        emaData={displayedEmaData}
                        bollingerBandsData={displayedBollingerBandsData}
                        onLoadMoreData={loadMoreHistoricalData}
                        isLoadingMore={isLoadingMore || isFetching}
                        hasMoreData={hasMore}
                      />
                      <div className="pointer-events-auto">
                        <ChartToolbar compact />
                      </div>
                      {mobileReplayControls}
                    </div>
                    {(isLoadingMore || isFetching) && (
                      <div className="flex items-center justify-center py-2 text-xs text-muted-foreground animate-pulse">
                        Loading more…
                      </div>
                    )}
                  </ResizablePanel>

                  {/* Volume Chart */}
                  {shouldShowVolume && (
                    <>
                      <ResizableHandle className="p-0" withHandle />
                      <ResizablePanel defaultSize={25} minSize={15}>
                        <PanelHeader
                          title="Volume"
                          icon={<HiChartBar className="w-4 h-4 text-chart-1" />}
                          onClose={() => dispatch(setShowVolume(false))}
                        />
                        <VolumeChart
                          volumeData={displayedVolumeData}
                          mode={isDarkMode}
                          setTimeScale={setVolumeChartTimeScale}
                        />
                      </ResizablePanel>
                    </>
                  )}

                  {/* RSI Chart */}
                  {activeIndicators.includes('RSI') && (
                    <>
                      <ResizableHandle className="p-0" withHandle />
                      <ResizablePanel defaultSize={20} minSize={15}>
                        <PanelHeader
                          title="RSI"
                          icon={
                            <HiChartBar className="w-4 h-4 text-amber-500" />
                          }
                          onClose={() => dispatch(removeIndicator('RSI'))}
                        />
                        <IndicatorChart
                          rsiData={displayedRsiData}
                          atrData={[]}
                          mode={isDarkMode}
                          setTimeScale={setRSIChartTimeScale}
                        />
                      </ResizablePanel>
                    </>
                  )}

                  {/* ATR Chart */}
                  {activeIndicators.includes('ATR') && (
                    <>
                      <ResizableHandle className="p-0" withHandle />
                      <ResizablePanel defaultSize={20} minSize={15}>
                        <PanelHeader
                          title="ATR"
                          icon={
                            <HiChartBar className="w-4 h-4 text-blue-500" />
                          }
                          onClose={() => dispatch(removeIndicator('ATR'))}
                        />
                        <IndicatorChart
                          rsiData={[]}
                          atrData={displayedAtrData}
                          mode={isDarkMode}
                          setTimeScale={setATRChartTimeScale}
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
