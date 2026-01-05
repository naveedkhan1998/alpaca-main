import React, { useRef } from 'react';
import { ITimeScaleApi, Time } from 'lightweight-charts';
import { useTheme } from '@/components/ThemeProvider';
import { useCandlesV3 } from '../../graphs/hooks/useCandlesV3';
import { useDerivedSeries } from '../../graphs/hooks/useDerivedSeries';
import PriceChartPanel from '../../graphs/components/charts/PriceChartPanel';
import { IndicatorProvider } from '../../graphs/context';
import { Skeleton } from '@/components/ui/skeleton';

interface WatchlistChartProps {
  assetId: number;
}

export const WatchlistChart: React.FC<WatchlistChartProps> = ({ assetId }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  // Force line chart for preview
  const seriesType = 'price';

  const {
    candles,
    loadingInitial,
    isLoadingMore,
    hasMore,
    loadMoreHistoricalData,
  } = useCandlesV3({
    assetId,
    timeframe: 1440, // Default to 1 Day for watchlist view
    autoRefresh: false, // Disable auto refresh
  });

  const { seriesData, volumeData } = useDerivedSeries({
    candles,
    seriesType,
    isDarkMode,
  });

  // We don't really need to do anything with this ref here yet,
  // but PriceChartPanel requires the setter.
  const mainChartRef = useRef<ITimeScaleApi<Time> | null>(null);

  if (loadingInitial) {
    return <Skeleton className="w-full h-[400px] rounded-lg" />;
  }

  return (
    <IndicatorProvider>
      <div className="w-full h-[400px] border rounded-lg overflow-hidden bg-card relative">
        <PriceChartPanel
          seriesData={seriesData}
          volumeData={volumeData}
          showVolume={true}
          mode={isDarkMode}
          setTimeScale={ts => {
            mainChartRef.current = ts;
          }}
          overlayIndicators={[]}
          onLoadMoreData={loadMoreHistoricalData}
          isLoadingMore={isLoadingMore}
          hasMoreData={hasMore}
          chartTypeOverride="Area"
        />
      </div>
    </IndicatorProvider>
  );
};
