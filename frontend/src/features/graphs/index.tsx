import React, {
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ITimeScaleApi, Time } from 'lightweight-charts';
import { useLocation, useParams } from 'react-router-dom';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import type { Asset } from '@/types/common-types';
import { useTheme } from '@/components/ThemeProvider';
import MainChart from './components/MainChart';
import IndicatorPanel from './components/IndicatorPanel';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { getIsGuest } from 'src/features/auth/authSlice';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import NotFoundScreen from './components/NotFoundScreen';
import GraphHeader from './components/GraphHeader';
import ReplayControls from './components/ReplayControls';
import { useIsMobile } from '@/hooks/useMobile';
import { formatDate } from '@/lib/functions';
import { useCandlesV3 } from './hooks/useCandlesV3';
import { useDerivedSeries } from './hooks/useDerivedSeries';
import { useChartSync } from './hooks/useChartSync';
import { useFullscreen } from './hooks/useFullscreen';
import { useGraphShortcuts } from './hooks/useGraphShortcuts';
import { useReplayController } from './hooks/useReplayController';
import { useIndicators } from './hooks/useIndicators';
import ChartToolbar from './components/ChartToolbar';
import { IndicatorProvider } from './context';
import { useGetAssetByIdQuery } from '@/api/assetService';
import {
  setAutoRefresh,
  selectTimeframe,
  selectShowVolume,
  selectAutoRefresh,
  selectShowControls,
  selectSeriesType,
  removeIndicatorInstance,
  toggleIndicatorVisibility,
  setReplayStep,
  setReplayTotalSteps,
  setReplayPlaying,
  setReplayAnimationProgress,
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
  const params = useParams();
  const isMobile = useIsMobile();

  const { obj } = (location.state as LocationState) || {};
  const assetIdParam = params.id ? Number(params.id) : undefined;
  const normalizedAssetId = Number.isFinite(assetIdParam)
    ? assetIdParam
    : undefined;
  const shouldFetchAsset = !obj && typeof normalizedAssetId === 'number';
  const {
    data: assetFromApi,
    isLoading: isAssetLoading,
    isError: isAssetError,
    error: assetError,
  } = useGetAssetByIdQuery(normalizedAssetId as number, {
    skip: !shouldFetchAsset,
  });
  const asset = obj ?? assetFromApi;
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // State
  const dispatch = useAppDispatch();
  const timeframe = useAppSelector(selectTimeframe);
  const showVolume = useAppSelector(selectShowVolume);
  const autoRefresh = useAppSelector(selectAutoRefresh);
  const seriesType = useAppSelector(selectSeriesType);
  const showControls = useAppSelector(selectShowControls);
  const isGuest = useAppSelector(getIsGuest);

  const {
    enabled: isReplayEnabled,
    playing: isReplayPlaying,
    speed: replaySpeed,
    currentStep: replayStep,
    totalSteps: replayTotalSteps,
    animate: isReplayAnimate,
    animationProgress,
    handleReplayToggle,
    handleReplayPlayPause,
    handleReplayRestart,
    handleReplaySeek,
    handleReplaySpeedChange,
    handleReplayAnimateToggle,
  } = useReplayController();

  // Refs
  const mainChartRef = useRef<ITimeScaleApi<Time> | null>(null);
  const [mainTimeScale, setMainTimeScaleState] =
    useState<ITimeScaleApi<Time> | null>(null);
  const indicatorChartsRef = useRef<Map<string, ITimeScaleApi<Time>>>(
    new Map()
  );
  const chartSectionRef = useRef<HTMLDivElement>(null);

  // Data & derived series
  const {
    candles,
    isFetching,
    loadingInitial,
    errorInitial,
    errorStatus: candleErrorStatus,
    isLoadingMore,
    hasMore,
    handleRefetch,
    loadMoreHistoricalData,
  } = useCandlesV3({
    assetId: asset?.id ?? normalizedAssetId,
    timeframe,
    autoRefresh: autoRefresh && !isGuest,
  });

  const { seriesData, volumeData, hasValidVolume } = useDerivedSeries({
    candles,
    seriesType,
    isDarkMode,
  });

  const prevSeriesLengthRef = useRef(seriesData.length);
  const prevReplayEnabledRef = useRef(isReplayEnabled);

  const totalSeriesCount = seriesData.length;

  const effectiveReplayIndex = useMemo(() => {
    if (!isReplayEnabled) return totalSeriesCount;
    if (totalSeriesCount === 0) return 0;
    // When replay is first enabled, replayStep might still be at totalSeriesCount
    // Force it to 1 in this case to prevent showing all data on first render
    const step = replayStep >= totalSeriesCount ? 1 : replayStep;
    return Math.min(Math.max(step, 1), totalSeriesCount);
  }, [isReplayEnabled, replayStep, totalSeriesCount]);

  // Calculate display index for indicators - only update on completed candles
  // During animation, we use the previous completed candle index
  const indicatorDisplayIndex = useMemo(() => {
    if (!isReplayEnabled) return undefined;
    // During animation (animationProgress > 0 but < 1), show indicators for the previous completed candle
    // This prevents indicators from updating mid-candle during animated replay
    if (isReplayAnimate && animationProgress > 0 && animationProgress < 1) {
      return Math.max(1, effectiveReplayIndex - 1);
    }
    return effectiveReplayIndex;
  }, [
    isReplayEnabled,
    isReplayAnimate,
    animationProgress,
    effectiveReplayIndex,
  ]);

  // New indicator system - with replay support
  const { panelIndicators, overlayIndicators } = useIndicators({
    candles,
    replayDisplayIndex: indicatorDisplayIndex,
    isReplayEnabled,
  });

  const displayedSeriesData = useMemo(
    () =>
      isReplayEnabled ? seriesData.slice(0, effectiveReplayIndex) : seriesData,
    [isReplayEnabled, seriesData, effectiveReplayIndex]
  );

  // Animate the current candle formation when animate mode is enabled
  const animatedSeriesData = useMemo(() => {
    if (!isReplayEnabled || !isReplayAnimate || animationProgress >= 1) {
      return displayedSeriesData;
    }

    if (displayedSeriesData.length === 0) {
      return displayedSeriesData;
    }

    // Get the last candle to animate
    const lastCandle = displayedSeriesData[displayedSeriesData.length - 1];

    // Check if it's an OHLC candle (has open, high, low, close)
    if (!('open' in lastCandle)) {
      return displayedSeriesData;
    }

    const { open, high, low, close, time } = lastCandle as {
      open: number;
      high: number;
      low: number;
      close: number;
      time: Time;
    };

    // Determine if it's a bullish (green) or bearish (red) candle
    const isBullish = close >= open;
    const progress = animationProgress;

    // Animation phases:
    // Phase 1 (0-0.3): Start at open, move toward first extreme
    // Phase 2 (0.3-0.7): Move toward second extreme
    // Phase 3 (0.7-1.0): Move toward close

    let animatedHigh = open;
    let animatedLow = open;
    let animatedClose = open;

    if (isBullish) {
      // Bullish candle: typically goes down first (wick), then up to high, then settles at close
      if (progress < 0.3) {
        // Phase 1: Move down to low
        const phaseProgress = progress / 0.3;
        animatedLow = open + (low - open) * phaseProgress;
        animatedHigh = open;
        animatedClose = open + (low - open) * phaseProgress * 0.5;
      } else if (progress < 0.7) {
        // Phase 2: Move up to high
        const phaseProgress = (progress - 0.3) / 0.4;
        animatedLow = low;
        animatedHigh = open + (high - open) * phaseProgress;
        animatedClose = low + (high - low) * phaseProgress;
      } else {
        // Phase 3: Settle to close
        const phaseProgress = (progress - 0.7) / 0.3;
        animatedLow = low;
        animatedHigh = high;
        animatedClose = high + (close - high) * phaseProgress;
      }
    } else {
      // Bearish candle: typically goes up first (wick), then down to low, then settles at close
      if (progress < 0.3) {
        // Phase 1: Move up to high
        const phaseProgress = progress / 0.3;
        animatedHigh = open + (high - open) * phaseProgress;
        animatedLow = open;
        animatedClose = open + (high - open) * phaseProgress * 0.5;
      } else if (progress < 0.7) {
        // Phase 2: Move down to low
        const phaseProgress = (progress - 0.3) / 0.4;
        animatedHigh = high;
        animatedLow = open + (low - open) * phaseProgress;
        animatedClose = high + (low - high) * phaseProgress;
      } else {
        // Phase 3: Settle to close
        const phaseProgress = (progress - 0.7) / 0.3;
        animatedHigh = high;
        animatedLow = low;
        animatedClose = low + (close - low) * phaseProgress;
      }
    }

    const animatedCandle = {
      time,
      open,
      high: animatedHigh,
      low: animatedLow,
      close: animatedClose,
    };

    return [...displayedSeriesData.slice(0, -1), animatedCandle];
  }, [
    displayedSeriesData,
    isReplayEnabled,
    isReplayAnimate,
    animationProgress,
  ]);

  const displayedVolumeData = useMemo(
    () =>
      isReplayEnabled ? volumeData.slice(0, effectiveReplayIndex) : volumeData,
    [isReplayEnabled, volumeData, effectiveReplayIndex]
  );

  const currentReplayLabel = useMemo(() => {
    if (!isReplayEnabled || animatedSeriesData.length === 0) return undefined;
    const lastPoint = animatedSeriesData[animatedSeriesData.length - 1] as {
      time?: Time;
    };
    return formatReplayTimeLabel(lastPoint?.time);
  }, [animatedSeriesData, isReplayEnabled]);

  const shouldShowVolume = showVolume && hasValidVolume;
  const shouldRenderReplayControls = isReplayEnabled && totalSeriesCount > 0;

  // Desktop inline replay controls - shown below toolbar when replay is active
  const desktopReplayControls =
    shouldRenderReplayControls && !isMobile ? (
      <ReplayControls
        variant="inline"
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
        animate={isReplayAnimate}
        onAnimateToggle={handleReplayAnimateToggle}
        currentLabel={currentReplayLabel}
        isLoadingMore={isLoadingMore || isFetching}
        hasMoreHistorical={hasMore}
        onLoadMoreHistorical={hasMore ? loadMoreHistoricalData : undefined}
      />
    ) : null;

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
      animate: isReplayAnimate,
      onAnimateToggle: handleReplayAnimateToggle,
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
      handleReplayAnimateToggle,
      hasMore,
      isFetching,
      isLoadingMore,
      isReplayEnabled,
      isReplayPlaying,
      isReplayAnimate,
      loadMoreHistoricalData,
      replaySpeed,
      totalSeriesCount,
    ]
  );

  // Mobile replay controls - inline at bottom of chart area (not a modal)
  const mobileReplayControls =
    shouldRenderReplayControls && isMobile ? (
      <ReplayControls
        variant="mobile"
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
        animate={isReplayAnimate}
        onAnimateToggle={handleReplayAnimateToggle}
        currentLabel={currentReplayLabel}
        isLoadingMore={isLoadingMore || isFetching}
        hasMoreHistorical={hasMore}
        onLoadMoreHistorical={hasMore ? loadMoreHistoricalData : undefined}
      />
    ) : null;

  // TimeScale refs setters
  const setMainChartTimeScale = useCallback(
    (timeScale: ITimeScaleApi<Time>) => {
      mainChartRef.current = timeScale;
      setMainTimeScaleState(timeScale);
    },
    []
  );

  // Sync charts & fullscreen
  const { syncCharts, triggerSync } = useChartSync({
    mainChartRef,
    indicatorTimeScaleRefs: indicatorChartsRef,
  });

  const setIndicatorTimeScale = useCallback(
    (instanceId: string) => (timeScale: ITimeScaleApi<Time>) => {
      indicatorChartsRef.current.set(instanceId, timeScale);
      // Trigger sync after new indicator panel is registered
      setTimeout(triggerSync, 50);
    },
    [triggerSync]
  );

  const { toggleFullscreen } = useFullscreen(chartSectionRef);

  // Keyboard shortcuts
  useGraphShortcuts({ showVolume, showControls, toggleFullscreen });

  // Indicator handlers
  const handleRemoveIndicator = useCallback(
    (instanceId: string) => {
      dispatch(removeIndicatorInstance(instanceId));
      indicatorChartsRef.current.delete(instanceId);
    },
    [dispatch]
  );

  const handleToggleVisibility = useCallback(
    (instanceId: string) => {
      dispatch(toggleIndicatorVisibility(instanceId));
    },
    [dispatch]
  );

  // Replay effects
  useEffect(() => {
    if (replayTotalSteps !== totalSeriesCount) {
      dispatch(setReplayTotalSteps(totalSeriesCount));
    }
  }, [dispatch, replayTotalSteps, totalSeriesCount]);

  useEffect(() => {
    if (prevReplayEnabledRef.current !== isReplayEnabled) {
      if (isReplayEnabled) {
        if (replayStep >= totalSeriesCount) {
          dispatch(setReplayStep(totalSeriesCount > 1 ? 1 : totalSeriesCount));
        }
        dispatch(setReplayPlaying(false));
      } else {
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

    // If animation is enabled, animate the current candle formation
    if (isReplayAnimate) {
      // Animation runs at 60fps-ish, completing one candle animation in the interval time
      const baseIntervalMs = Math.max(120, Math.round(800 / replaySpeed));
      const animationFrameMs = 16; // ~60fps
      const totalFrames = Math.max(
        1,
        Math.floor(baseIntervalMs / animationFrameMs)
      );
      let currentFrame = Math.floor(animationProgress * totalFrames);

      const animationTimer = window.setInterval(() => {
        currentFrame++;
        const newProgress = Math.min(1, currentFrame / totalFrames);

        if (newProgress >= 1) {
          // Animation complete, move to next candle
          window.clearInterval(animationTimer);
          const next = replayStep + 1;
          if (next >= totalSeriesCount) {
            dispatch(setReplayStep(totalSeriesCount));
            dispatch(setReplayPlaying(false));
            dispatch(setReplayAnimationProgress(1));
          } else {
            dispatch(setReplayStep(next));
            dispatch(setReplayAnimationProgress(0)); // Reset for next candle
          }
        } else {
          dispatch(setReplayAnimationProgress(newProgress));
        }
      }, animationFrameMs);

      return () => window.clearInterval(animationTimer);
    }

    // Non-animated mode - original behavior
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
    isReplayAnimate,
    animationProgress,
    replaySpeed,
    replayStep,
    totalSeriesCount,
  ]);

  useEffect(() => {
    if (isGuest && autoRefresh) {
      dispatch(setAutoRefresh(false));
    }
  }, [autoRefresh, dispatch, isGuest]);

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

  useEffect(() => {
    const cleanup = syncCharts();
    return () => {
      if (cleanup) cleanup();
    };
  }, [syncCharts]);

  // CSV download
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
    link.setAttribute(
      'download',
      `${asset?.name ?? 'asset'}_${timeframe}_data.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [asset?.name, candles, timeframe]);

  const assetErrorStatus =
    assetError && typeof assetError === 'object' && 'status' in assetError
      ? (assetError as { status?: number }).status
      : undefined;
  const isRateLimited = assetErrorStatus === 429 || candleErrorStatus === 429;
  const errorTitle = isRateLimited ? 'Rate limit reached' : undefined;
  const errorDescription = isRateLimited
    ? 'Guest access is limited. Please wait a moment or log in for higher limits.'
    : undefined;

  if (isAssetError && assetErrorStatus === 404) return <NotFoundScreen />;
  if ((loadingInitial && mainChartRef.current === null) || isAssetLoading)
    return <LoadingScreen />;
  if (isAssetError)
    return <ErrorScreen title={errorTitle} description={errorDescription} />;
  if (!asset) return <NotFoundScreen />;
  if (errorInitial)
    return <ErrorScreen title={errorTitle} description={errorDescription} />;

  // Calculate panel sizes
  const hasPanelIndicators = panelIndicators.length > 0;
  const mainChartSize = hasPanelIndicators ? 70 : 100;
  const indicatorSize = hasPanelIndicators
    ? Math.floor((100 - mainChartSize) / panelIndicators.length)
    : 0;

  return (
    <IndicatorProvider>
      <div className="flex flex-col h-[100dvh] bg-background">
        {/* Header */}
        <GraphHeader
          obj={asset}
          handleDownload={handleDownload}
          toggleFullscreen={toggleFullscreen}
          refetch={handleRefetch}
          replayControls={headerReplayControls}
        />

        {/* Main Content */}
        <div
          ref={chartSectionRef}
          className="flex flex-col h-full overflow-hidden bg-background"
        >
          {/* Chart Toolbar */}
          <ChartToolbar />

          {/* Desktop Replay Controls - Inline bar below toolbar */}
          {desktopReplayControls}

          <div className="flex-1 min-h-0">
            <ResizablePanelGroup direction="vertical">
              {/* Main Chart with Volume Overlay */}
              <ResizablePanel defaultSize={mainChartSize} minSize={30}>
                <div className="relative h-full">
                  <MainChart
                    seriesData={animatedSeriesData}
                    volumeData={displayedVolumeData}
                    showVolume={shouldShowVolume}
                    mode={isDarkMode}
                    setTimeScale={setMainChartTimeScale}
                    overlayIndicators={overlayIndicators}
                    onLoadMoreData={loadMoreHistoricalData}
                    isLoadingMore={isLoadingMore || isFetching}
                    hasMoreData={hasMore}
                    isReplayEnabled={isReplayEnabled}
                    replayStep={effectiveReplayIndex}
                  />
                </div>
                {(isLoadingMore || isFetching) && (
                  <div className="flex items-center justify-center py-2 text-xs text-muted-foreground animate-pulse">
                    Loading more…
                  </div>
                )}
              </ResizablePanel>

              {/* Dynamic Indicator Panels */}
              {panelIndicators.map(indicator => (
                <React.Fragment key={indicator.instance.instanceId}>
                  <ResizableHandle className="p-0" withHandle />
                  <ResizablePanel defaultSize={indicatorSize} minSize={10}>
                    <IndicatorPanel
                      indicator={indicator}
                      isDarkMode={isDarkMode}
                      setTimeScale={setIndicatorTimeScale(
                        indicator.instance.instanceId
                      )}
                      mainTimeScale={mainTimeScale}
                      onRemove={handleRemoveIndicator}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  </ResizablePanel>
                </React.Fragment>
              ))}
            </ResizablePanelGroup>
          </div>

          {/* Mobile Replay Controls - Fixed at bottom */}
          {mobileReplayControls}
        </div>
      </div>
    </IndicatorProvider>
  );
};

export default GraphsPage;
