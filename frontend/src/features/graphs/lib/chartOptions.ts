import type { DeepPartial, ChartOptions } from 'lightweight-charts';

export function getBaseChartOptions(mode: boolean): DeepPartial<ChartOptions> {
  return {
    layout: {
      textColor: mode ? '#E2E8F0' : '#475569',
      background: { color: 'transparent' },
      fontSize: 12,
      fontFamily: 'Inter, -apple-system, sans-serif',
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      borderColor: mode ? '#334155' : '#CBD5E1',
    },
    rightPriceScale: {
      borderColor: mode ? '#334155' : '#CBD5E1',
      scaleMargins: { top: 0.05, bottom: 0.05 },
    },
    crosshair: {
      mode: 1,
      vertLine: { width: 1, color: mode ? '#64748B' : '#94A3B8', style: 2 },
      horzLine: {
        visible: true,
        labelVisible: true,
        color: mode ? '#64748B' : '#94A3B8',
        width: 1,
        style: 2,
      },
    },
    grid: {
      vertLines: { color: mode ? '#1E293B' : '#F1F5F9', style: 1 },
      horzLines: { color: mode ? '#1E293B' : '#F1F5F9', style: 1 },
    },
    handleScroll: true,
    handleScale: true,
  };
}
