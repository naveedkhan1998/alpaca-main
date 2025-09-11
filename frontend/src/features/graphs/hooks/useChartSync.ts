import { useCallback } from 'react';
import type { ITimeScaleApi, Time } from 'lightweight-charts';

export function useChartSync(options: {
  mainChartRef: React.MutableRefObject<ITimeScaleApi<Time> | null>;
  volumeChartRef: React.MutableRefObject<ITimeScaleApi<Time> | null>;
  indicatorChartRef: React.MutableRefObject<ITimeScaleApi<Time> | null>;
  shouldShowVolume: boolean;
  activeIndicators: string[];
}) {
  const {
    mainChartRef,
    volumeChartRef,
    indicatorChartRef,
    shouldShowVolume,
    activeIndicators,
  } = options;

  const syncCharts = useCallback(() => {
    if (!mainChartRef.current) return;

    const getChartsToSync = () => {
      const charts: ITimeScaleApi<Time>[] = [];
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
    indicatorChartRef,
    shouldShowVolume,
    activeIndicators,
  ]);

  return { syncCharts } as const;
}
