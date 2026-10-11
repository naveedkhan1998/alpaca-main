import React from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import PriceChartPanel from '../charts/PriceChartPanel';
import IndicatorPanel from '../charts/IndicatorPanel';
import OptionsChainPanel from './OptionsChainPanel';
import { useIsMobile } from '@/hooks/useMobile';
import type {
  ITimeScaleApi,
  Time,
  BarData,
  LineData,
  HistogramData,
} from 'lightweight-charts';
import type { CalculatedIndicator } from '../../lib/indicators';

interface GraphPanelLayoutProps {
  // Data
  seriesData: (BarData<Time> | LineData<Time>)[];
  volumeData: HistogramData<Time>[];

  // UI State
  showVolume: boolean;
  isDarkMode: boolean;
  isLoadingMore: boolean;
  hasMoreData: boolean;

  // Replay State
  isReplayEnabled: boolean;
  replayStep: number;

  // Indicators
  overlayIndicators: CalculatedIndicator[];
  panelIndicators: CalculatedIndicator[];

  // Callbacks
  setMainChartTimeScale: (timeScale: ITimeScaleApi<Time>) => void;
  setIndicatorTimeScale: (
    instanceId: string
  ) => (timeScale: ITimeScaleApi<Time>) => void;
  onLoadMoreData: () => void;
  onRemoveIndicator: (instanceId: string) => void;
  onToggleVisibility: (instanceId: string) => void;

  // Sync
  mainTimeScale: ITimeScaleApi<Time> | null;

  assetId?: number;
  symbol?: string;
  currentPrice?: number;
  optionsOpen?: boolean;
  onToggleOptions?: () => void;
}

const GraphPanelLayout: React.FC<GraphPanelLayoutProps> = ({
  seriesData,
  volumeData,
  showVolume,
  isDarkMode,
  isLoadingMore,
  hasMoreData,
  isReplayEnabled,
  replayStep,
  overlayIndicators,
  panelIndicators,
  setMainChartTimeScale,
  setIndicatorTimeScale,
  onLoadMoreData,
  onRemoveIndicator,
  onToggleVisibility,
  mainTimeScale,
  assetId,
  symbol,
  currentPrice,
  optionsOpen = false,
  onToggleOptions,
}) => {
  const isMobile = useIsMobile();
  // Calculate panel sizes
  const hasPanelIndicators = panelIndicators.length > 0;
  const mainChartSize = hasPanelIndicators ? 70 : 100;
  const indicatorSize = hasPanelIndicators
    ? Math.floor((100 - mainChartSize) / panelIndicators.length)
    : 0;

  return (
    <ResizablePanelGroup
      key={`${optionsOpen ? 'options-open' : 'options-closed'}-${
        isMobile ? 'mobile' : 'desktop'
      }`}
      direction={isMobile ? 'vertical' : 'horizontal'}
      className="min-h-0 flex-1 overflow-hidden"
    >
      <ResizablePanel
        defaultSize={optionsOpen ? (isMobile ? 62 : 72) : 100}
        minSize={isMobile ? 30 : 45}
        className="min-w-0"
      >
        <ResizablePanelGroup direction="vertical">
          {/* Main Chart with Volume Overlay */}
          <ResizablePanel defaultSize={mainChartSize} minSize={30}>
            <div className="relative h-full">
              <PriceChartPanel
                seriesData={seriesData}
                volumeData={volumeData}
                showVolume={showVolume}
                mode={isDarkMode}
                setTimeScale={setMainChartTimeScale}
                overlayIndicators={overlayIndicators}
                onLoadMoreData={onLoadMoreData}
                isLoadingMore={isLoadingMore}
                hasMoreData={hasMoreData}
                isReplayEnabled={isReplayEnabled}
                replayStep={replayStep}
              />
            </div>
            {isLoadingMore && (
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
                  onRemove={onRemoveIndicator}
                  onToggleVisibility={onToggleVisibility}
                />
              </ResizablePanel>
            </React.Fragment>
          ))}
        </ResizablePanelGroup>
      </ResizablePanel>

      {optionsOpen && assetId && symbol && (
        <>
          <ResizableHandle
            withHandle
            className="bg-border/70 transition-colors hover:bg-primary/60"
          />
          <ResizablePanel
            defaultSize={isMobile ? 38 : 28}
            minSize={isMobile ? 20 : 22}
            maxSize={isMobile ? 70 : 50}
            className="min-h-0 min-w-0"
          >
            <OptionsChainPanel
              assetId={assetId}
              symbol={symbol}
              currentPrice={currentPrice}
              isDarkMode={isDarkMode}
              isMobile={isMobile}
              onClose={onToggleOptions}
            />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
};

export default GraphPanelLayout;
