import type { DeepPartial, ChartOptions } from 'lightweight-charts';

export function getBaseChartOptions(mode: boolean): DeepPartial<ChartOptions> {
  return {
    layout: {
      textColor: mode ? 'hsl(220, 20%, 96%)' : 'hsl(222, 50%, 10%)',
      background: { color: 'transparent' },
      fontSize: 12,
      fontFamily: 'Inter, -apple-system, sans-serif',
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      borderColor: mode ? 'hsl(222, 47%, 18%)' : 'hsl(220, 15%, 86%)',
    },
    rightPriceScale: {
      borderColor: mode ? 'hsl(222, 47%, 18%)' : 'hsl(220, 15%, 86%)',
      scaleMargins: { top: 0.05, bottom: 0.05 },
    },
    crosshair: {
      mode: 1,
      vertLine: {
        width: 1,
        color: mode ? 'hsl(220, 20%, 65%)' : 'hsl(220, 12%, 42%)',
        style: 2,
      },
      horzLine: {
        visible: true,
        labelVisible: true,
        color: mode ? 'hsl(220, 20%, 65%)' : 'hsl(220, 12%, 42%)',
        width: 1,
        style: 2,
      },
    },
    grid: {
      vertLines: {
        color: mode ? 'hsl(222, 47%, 15%)' : 'hsl(220, 18%, 88%)',
        style: 1,
      },
      horzLines: {
        color: mode ? 'hsl(222, 47%, 15%)' : 'hsl(220, 18%, 88%)',
        style: 1,
      },
    },
    handleScroll: true,
    handleScale: true,
  };
}
