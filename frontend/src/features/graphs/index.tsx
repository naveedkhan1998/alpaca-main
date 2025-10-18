import React, { useRef, useCallback } from 'react';
import type { ITimeScaleApi, Time } from 'lightweight-charts';
import { useLocation } from 'react-router-dom';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
//
import { HiChartBar, HiCog, HiLightningBolt } from 'react-icons/hi';
import type { Asset } from '@/types/common-types';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import PanelHeader from './components/PanelHeader';
import PaperTradingPanel from './components/controls/PaperTradingPanel';
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
  selectIndicatorConfigs,
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
  const indicatorConfigs = useAppSelector(selectIndicatorConfigs);
  const [isPaperTradingOpen, setIsPaperTradingOpen] = React.useState(false);

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

  const shouldShowVolume = showVolume && hasValidVolume;
  const latestPrice = candles.length > 0 ? candles[0]?.close : undefined;

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
                      rsiData={rsiData}
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
                      atrData={atrData}
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
                      <ResizableHandle className='p-0' withHandle />
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

                  {/* RSI Chart */}
                  {activeIndicators.includes('RSI') && (
                    <>
                      <ResizableHandle className='p-0' withHandle />
                      <ResizablePanel defaultSize={20} minSize={15}>
                        <PanelHeader
                          title="RSI"
                          icon={
                            <HiChartBar className="w-4 h-4 text-amber-500" />
                          }
                          onClose={() => dispatch(removeIndicator('RSI'))}
                        />
                        <IndicatorChart
                          rsiData={rsiData}
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
                      <ResizableHandle className='p-0' withHandle />
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
                          atrData={atrData}
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

      {isMobile ? (
        <Drawer open={isPaperTradingOpen} onOpenChange={setIsPaperTradingOpen}>
          <DrawerContent className="h-[90dvh]  p-0 ">
            <PaperTradingPanel
              asset={obj}
              currentPrice={latestPrice}
              enabled={isPaperTradingOpen}
              isInDrawer={true}
            />
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isPaperTradingOpen} onOpenChange={setIsPaperTradingOpen}>
          <DialogContent className="max-w-7xl w-full max-h-[90dvh] p-0 sm:rounded-xl m-auto">
            <PaperTradingPanel
              asset={obj}
              currentPrice={latestPrice}
              enabled={isPaperTradingOpen}
            />
          </DialogContent>
        </Dialog>
      )}

      <Button
        type="button"
        size="lg"
        className={`fixed bottom-6 right-6 z-50 shadow-2xl transition-all duration-300 bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary hover:to-primary text-primary-foreground font-bold rounded-xl ${
          isPaperTradingOpen
            ? 'pointer-events-none opacity-0 scale-90'
            : 'opacity-95 scale-75 hover:scale-105'
        }`}
        onClick={() => setIsPaperTradingOpen(true)}
        aria-label="Open paper trading"
      >
        <HiLightningBolt className="w-5 h-5 mr-2" />
        <span className="hidden tracking-wide sm:inline">Start Trading</span>
        <span className="sm:hidden">Trade</span>
      </Button>
    </div>
  );
};

export default GraphsPage;
