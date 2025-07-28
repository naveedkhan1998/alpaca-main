import React, { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
  HistogramData,
  ITimeScaleApi,
  HistogramSeries,
} from 'lightweight-charts';

interface VolumeChartProps {
  volumeData: HistogramData<Time>[];
  mode: boolean;
  setTimeScale: (timeScale: ITimeScaleApi<Time>) => void;
}

const VolumeChart: React.FC<VolumeChartProps> = ({
  volumeData,
  mode,
  setTimeScale,
}) => {
  const volumeChartContainerRef = useRef<HTMLDivElement | null>(null);
  const volumeChartRef = useRef<IChartApi | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Create chart on mount
  useEffect(() => {
    if (!volumeChartContainerRef.current || volumeChartRef.current) return;

    const chart = createChart(volumeChartContainerRef.current, {
      layout: {
        textColor: mode ? '#E2E8F0' : '#475569',
        background: { color: 'transparent' },
        fontSize: 11,
        fontFamily: 'Inter, -apple-system, sans-serif',
      },
      timeScale: {
        visible: true,
        timeVisible: true,
        secondsVisible: false,
        borderColor: mode ? '#334155' : '#CBD5E1',
      },
      rightPriceScale: {
        borderColor: mode ? '#334155' : '#CBD5E1',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      grid: {
        vertLines: {
          visible: false,
        },
        horzLines: {
          color: mode ? '#1E293B' : '#F1F5F9',
          style: 1,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: mode ? '#64748B' : '#94A3B8',
          style: 2,
        },
        horzLine: {
          visible: true,
          labelVisible: true,
          color: mode ? '#64748B' : '#94A3B8',
          width: 1,
          style: 2,
        },
      },
      handleScroll: true,
      handleScale: true,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'right',
      base: 0,
    });

    volumeSeriesRef.current = volumeSeries;
    volumeChartRef.current = chart;
    setTimeScale(chart.timeScale());

    // Handle Resize
    const resizeObserver = new ResizeObserver(entries => {
      if (volumeChartContainerRef.current && volumeChartRef.current) {
        const { width, height } = entries[0].contentRect;
        volumeChartRef.current.applyOptions({ width, height });
      }
    });

    resizeObserver.observe(volumeChartContainerRef.current);

    // Clean up on unmount
    return () => {
      resizeObserver.disconnect();
      chart.remove();
      volumeChartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update chart options when mode changes
  useEffect(() => {
    if (volumeChartRef.current) {
      volumeChartRef.current.applyOptions({
        layout: {
          textColor: mode ? '#E2E8F0' : '#475569',
          background: { color: 'transparent' },
        },
        timeScale: {
          borderColor: mode ? '#334155' : '#CBD5E1',
        },
        rightPriceScale: {
          borderColor: mode ? '#334155' : '#CBD5E1',
        },
        grid: {
          horzLines: {
            color: mode ? '#1E293B' : '#F1F5F9',
          },
        },
        crosshair: {
          vertLine: {
            color: mode ? '#64748B' : '#94A3B8',
          },
          horzLine: {
            color: mode ? '#64748B' : '#94A3B8',
          },
        },
      });
    }
  }, [mode]);

  // Update data when volumeData changes
  useEffect(() => {
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(volumeData);
    }
  }, [volumeData]);

  return (
    <div className="w-full h-full">
      <div
        ref={volumeChartContainerRef}
        className="relative w-full h-full"
        style={{ height: 'calc(100% - 64px)' }}
      />
    </div>
  );
};

export default VolumeChart;
