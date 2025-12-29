import { useCallback, useRef } from 'react';
import type { ITimeScaleApi, Time } from 'lightweight-charts';

export function useChartSync(options: {
  mainChartRef: React.MutableRefObject<ITimeScaleApi<Time> | null>;
  indicatorTimeScaleRefs: React.MutableRefObject<Map<string, ITimeScaleApi<Time>>>;
}) {
  const {
    mainChartRef,
    indicatorTimeScaleRefs,
  } = options;

  // Track handler reference for cleanup
  const handlerRef = useRef<(() => void) | null>(null);

  const syncCharts = useCallback(() => {
    if (!mainChartRef.current) return;

    const getChartsToSync = () => {
      const charts: ITimeScaleApi<Time>[] = [];
      
      // Access current value of ref to get latest indicator charts
      indicatorTimeScaleRefs.current.forEach((timeScale) => {
        if (timeScale) {
          charts.push(timeScale);
        }
      });
      
      return charts;
    };

    const handleVisibleTimeRangeChange = () => {
      const mainVisibleRange = mainChartRef.current?.getVisibleRange();
      if (!mainVisibleRange) return;
      
      getChartsToSync().forEach((timeScale) => {
        if (!timeScale) return;
        try {
          timeScale.setVisibleRange(mainVisibleRange);
        } catch {
          // ignore sync error
        }
      });
    };

    // Store handler ref for external triggering
    handlerRef.current = handleVisibleTimeRangeChange;

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
      handlerRef.current = null;
    };
  }, [mainChartRef, indicatorTimeScaleRefs]);

  // Trigger sync when indicator charts change
  const triggerSync = useCallback(() => {
    if (handlerRef.current) {
      handlerRef.current();
    }
  }, []);

  return { syncCharts, triggerSync } as const;
}
