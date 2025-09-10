import { useCallback } from 'react';

export function useChartSync(options: {
  mainChartRef: React.MutableRefObject<any>;
  volumeChartRef: React.MutableRefObject<any>;
  indicatorChartRef: React.MutableRefObject<any>;
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
      const charts: any[] = [];
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
        } catch (error) {
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
