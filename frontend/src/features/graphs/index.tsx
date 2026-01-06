import React, {
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react';
import type { ITimeScaleApi, Time } from 'lightweight-charts';
import { useLocation, useParams } from 'react-router-dom';
import type { Asset } from '@/types/common-types';
import { useTheme } from '@/components/ThemeProvider';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { getIsGuest } from 'src/features/auth/authSlice';
import LoadingScreen from './components/screens/LoadingScreen';
import ErrorScreen from './components/screens/ErrorScreen';
import NotFoundScreen from './components/screens/NotFoundScreen';
import GraphHeader from './components/layout/GraphHeader';
import ReplayControls from './components/controls/ReplayControls';
import { useIsMobile } from '@/hooks/useMobile';
import { useCandlesV3 } from './hooks/useCandlesV3';
import { useDerivedSeries } from './hooks/useDerivedSeries';
import { useChartSync } from './hooks/useChartSync';
import { useFullscreen } from './hooks/useFullscreen';
import { useGraphShortcuts } from './hooks/useGraphShortcuts';
import { useReplayController } from './hooks/useReplayController';
import { useReplayEngine } from './hooks/useReplayEngine';
import { useIndicators } from './hooks/useIndicators';
import { useChartDownload } from './hooks/useChartDownload';
import ChartToolbar from './components/controls/ChartToolbar';
import GraphPanelLayout from './components/layout/GraphPanelLayout';
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
} from './graphSlice';

interface LocationState {
  obj: Asset;
}

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

  // Replay Controller (UI Actions)
  const {
    enabled: isReplayEnabled,
    playing: isReplayPlaying,
    speed: replaySpeed,
    currentStep: replayStep,
    totalSteps: replayTotalSteps,
    animate: isReplayAnimate,
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
  const chartSectionRef = useRef<HTMLDivElement | null>(null);

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

  // Replay Engine (Animation Loop & Data Derivation)
  const {
    animatedSeriesData,
    displayedVolumeData,
    indicatorDisplayIndex,
    currentReplayLabel,
    shouldRenderReplayControls,
  } = useReplayEngine({
    seriesData,
    volumeData,
  });

  // Indicator system
  const { panelIndicators, overlayIndicators } = useIndicators({
    candles,
    replayDisplayIndex: indicatorDisplayIndex,
    isReplayEnabled,
  });

  // Chart Download
  const { handleDownload } = useChartDownload({
    asset,
    candles,
    timeframe,
  });

  // Calculate price data for header
  const lastPrice = candles.length > 0 ? candles[0].close : undefined;

  // Find previous day's close
  const previousClose = useMemo(() => {
    if (candles.length < 2) return undefined;

    const latestDate = new Date(candles[0].timestamp).toLocaleDateString();

    // Find the first candle that has a different date string
    const prevDayCandle = candles.find(
      c => new Date(c.timestamp).toLocaleDateString() !== latestDate
    );

    return prevDayCandle ? prevDayCandle.close : candles[1].close; // Fallback to previous candle if no prev day found (e.g. not enough history)
  }, [candles]);

  // Desktop inline replay controls
  const desktopReplayControls =
    shouldRenderReplayControls && !isMobile ? (
      <ReplayControls
        variant="inline"
        enabled={isReplayEnabled}
        playing={isReplayPlaying}
        currentStep={indicatorDisplayIndex ?? replayStep} // Use calculated index for smooth display
        totalSteps={replayTotalSteps}
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

  // Header replay controls config
  const headerReplayControls = useMemo(
    () => ({
      enabled: isReplayEnabled,
      playing: isReplayPlaying,
      currentStep: indicatorDisplayIndex ?? replayStep,
      totalSteps: replayTotalSteps,
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
      indicatorDisplayIndex,
      replayStep,
      replayTotalSteps,
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
    ]
  );

  // Mobile replay controls
  const mobileReplayControls =
    shouldRenderReplayControls && isMobile ? (
      <ReplayControls
        variant="mobile"
        enabled={isReplayEnabled}
        playing={isReplayPlaying}
        currentStep={indicatorDisplayIndex ?? replayStep}
        totalSteps={replayTotalSteps}
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

  // Effects
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
    // We can use indicatorDisplayIndex (which is effectiveReplayIndex) here
    if ((indicatorDisplayIndex ?? 100) <= 2) {
      loadMoreHistoricalData();
    }
  }, [
    indicatorDisplayIndex,
    hasMore,
    isFetching,
    isLoadingMore,
    isReplayEnabled,
    loadMoreHistoricalData,
  ]);

  useEffect(() => {
    const cleanup = syncCharts();
    return () => {
      if (cleanup) cleanup();
    };
  }, [syncCharts]);

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

  return (
    <IndicatorProvider>
      <div className="flex flex-col h-[100dvh] bg-background">
        {/* Header */}
        <GraphHeader
          obj={asset}
          lastPrice={lastPrice}
          previousClose={previousClose}
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

          {/* Desktop Replay Controls */}
          {desktopReplayControls}

          {/* Workspace (Charts & Panels) */}
          <GraphPanelLayout
            seriesData={animatedSeriesData}
            volumeData={displayedVolumeData}
            showVolume={showVolume && hasValidVolume}
            isDarkMode={isDarkMode}
            isLoadingMore={isLoadingMore || isFetching}
            hasMoreData={hasMore}
            isReplayEnabled={isReplayEnabled}
            replayStep={indicatorDisplayIndex ?? replayStep}
            overlayIndicators={overlayIndicators}
            panelIndicators={panelIndicators}
            setMainChartTimeScale={setMainChartTimeScale}
            setIndicatorTimeScale={setIndicatorTimeScale}
            onLoadMoreData={loadMoreHistoricalData}
            onRemoveIndicator={handleRemoveIndicator}
            onToggleVisibility={handleToggleVisibility}
            mainTimeScale={mainTimeScale}
          />

          {/* Mobile Replay Controls */}
          {mobileReplayControls}
        </div>
      </div>
    </IndicatorProvider>
  );
};

export default GraphsPage;
