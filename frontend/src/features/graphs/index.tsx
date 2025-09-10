import React, { useRef, useCallback } from 'react';
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
import ChartControls from './components/ChartControls';
import MainChart from './components/MainChart';
import VolumeChart from './components/VolumeChart';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import NotFoundScreen from './components/NotFoundScreen';
import GraphHeader from './components/GraphHeader';
import IndicatorChart from './components/IndicatorChart';
import { useIsMobile } from '@/hooks/useMobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import PanelHeader from './components/PanelHeader';
import { useCandles } from './hooks/useCandles';
import { useDerivedSeries } from './hooks/useDerivedSeries';
import { useChartSync } from './hooks/useChartSync';
import { useFullscreen } from './hooks/useFullscreen';
import { useGraphShortcuts } from './hooks/useGraphShortcuts';
import ChartToolbar from './components/ChartToolbar';
import {
  setShowVolume,
  selectTimeframe,
  selectShowVolume,
  selectAutoRefresh,
  selectShowControls,
  setShowControls,
  selectSeriesType,
  selectActiveIndicators,
  removeIndicator,
} from './graphSlice';

interface LocationState {
  obj: Asset;
}

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

  // Refs
  const mainChartRef = useRef<ITimeScaleApi<Time> | null>(null);
  const volumeChartRef = useRef<ITimeScaleApi<Time> | null>(null);
  const indicatorChartRef = useRef<ITimeScaleApi<Time> | null>(null);
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
  } = useDerivedSeries({ candles, seriesType, isDarkMode, activeIndicators });

  const shouldShowVolume = showVolume && hasValidVolume;

  // TimeScale refs setters
  const setMainChartTimeScale = (timeScale: ITimeScaleApi<Time>) => {
    mainChartRef.current = timeScale;
  };
  const setVolumeChartTimeScale = (timeScale: ITimeScaleApi<Time>) => {
    volumeChartRef.current = timeScale;
  };
  const setIndicatorChartTimeScale = (timeScale: ITimeScaleApi<Time>) => {
    indicatorChartRef.current = timeScale;
  };

  // Sync charts & fullscreen
  const { syncCharts } = useChartSync({
    mainChartRef,
    volumeChartRef,
    indicatorChartRef,
    shouldShowVolume,
    activeIndicators,
  });

  const { isFullscreenView, toggleFullscreen } = useFullscreen(chartSectionRef);

  // Keyboard shortcuts
  useGraphShortcuts({ showVolume, showControls, toggleFullscreen });

  // Keep charts in sync on mount/update
  React.useEffect(() => {
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
                  <PanelHeader
                    title="Controls"
                    icon={<HiCog className="w-4 h-4 text-chart-1" />}
                    dense
                  />
                  <div className="flex-1 p-5 overflow-y-auto">
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
                  {/* Chart Toolbar overlay */}
                  <div className="pointer-events-auto">
                    <ChartToolbar compact />
                  </div>
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
                    <PanelHeader
                      title="Indicators"
                      icon={<HiChartBar className="w-4 h-4 text-chart-1" />}
                      onClose={() => {
                        dispatch(removeIndicator('RSI'));
                        dispatch(removeIndicator('ATR'));
                      }}
                      dense
                    />
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
                  defaultSize={25}
                  minSize={20}
                  maxSize={35}
                  className="min-w-0"
                >
                  <div className="flex flex-col h-full">
                    <PanelHeader
                      title="Controls"
                      icon={<HiCog className="w-4 h-4 text-chart-1" />}
                      onClose={() => dispatch(setShowControls(false))}
                    />
                    <div className="flex-1 p-4 overflow-y-auto">
                      <ChartControls />
                    </div>
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Charts Area */}
            <ResizablePanel defaultSize={showControls ? 75 : 100}>
              <div className="h-full p-4">
                <ResizablePanelGroup direction="vertical">
                  {/* Main Chart */}
                  <ResizablePanel defaultSize={shouldShowVolume ? 75 : 100}>
                    <div className="relative h-full">
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
                      <div className="pointer-events-auto">
                        <ChartToolbar compact />
                      </div>
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
                        />
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
                        <PanelHeader
                          title="Indicators"
                          icon={<HiChartBar className="w-4 h-4 text-chart-1" />}
                          onClose={() => {
                            dispatch(removeIndicator('RSI'));
                            dispatch(removeIndicator('ATR'));
                          }}
                        />
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
