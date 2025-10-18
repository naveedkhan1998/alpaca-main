import { useCallback } from 'react';
import type { ITimeScaleApi, Time } from 'lightweight-charts';

export function useChartSync(options: {
  mainChartRef: React.MutableRefObject<ITimeScaleApi<Time> | null>;
  volumeChartRef: React.MutableRefObject<ITimeScaleApi<Time> | null>;
  rsiChartRef: React.MutableRefObject<ITimeScaleApi<Time> | null>;
  atrChartRef: React.MutableRefObject<ITimeScaleApi<Time> | null>;
  shouldShowVolume: boolean;
  activeIndicators: string[];
}) {
  const {
    mainChartRef,
    volumeChartRef,
    rsiChartRef,
    atrChartRef,
    shouldShowVolume,
    activeIndicators,
  } = options;

  const syncCharts = useCallback(() => {
    if (!mainChartRef.current) return;

    const getChartsToSync = () => {
      const charts: ITimeScaleApi<Time>[] = [];
      if (shouldShowVolume && volumeChartRef.current)
        charts.push(volumeChartRef.current);
      if (activeIndicators.includes('RSI') && rsiChartRef.current)
        charts.push(rsiChartRef.current);
      if (activeIndicators.includes('ATR') && atrChartRef.current)
        charts.push(atrChartRef.current);
      return charts;
    };

    const handleVisibleTimeRangeChange = () => {
      const mainVisibleRange = mainChartRef.current?.getVisibleRange();
      if (!mainVisibleRange) return;
      getChartsToSync().forEach(timeScale => {
        if (!timeScale) return;
        try {
          timeScale.setVisibleRange(mainVisibleRange);
        } catch {
          // ignore sync error
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
  }, [
    mainChartRef,
    volumeChartRef,
    rsiChartRef,
    atrChartRef,
    shouldShowVolume,
    activeIndicators,
  ]);

  return { syncCharts } as const;
}
