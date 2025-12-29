import type {
  IChartApi,
  ISeriesApi,
  SeriesType,
  BarData,
  LineData,
  Time,
} from 'lightweight-charts';
import {
  CandlestickSeries,
  BarSeries,
  AreaSeries,
  BaselineSeries,
  LineSeries,
} from 'lightweight-charts';

export function createSeriesForType(
  chart: IChartApi,
  type: SeriesType,
  mode: boolean,
  sample?: (BarData<Time> | LineData<Time>)[]
): ISeriesApi<SeriesType> {
  // TradingView professional colors
  const upColor = '#26a69a'; // Teal green
  const downColor = '#ef5350'; // Coral red

  switch (type) {
    case 'Candlestick':
      return chart.addSeries(CandlestickSeries, {
        upColor,
        downColor,
        borderVisible: false,
        wickUpColor: upColor,
        wickDownColor: downColor,
      });
    case 'Bar':
      return chart.addSeries(BarSeries, {
        upColor,
        downColor,
      });
    case 'Area':
      return chart.addSeries(AreaSeries, {
        lineColor: mode ? 'hsl(217, 91%, 60%)' : 'hsl(221, 83%, 53%)',
        topColor: mode
          ? 'hsla(217, 91%, 60%, 0.4)'
          : 'hsla(221, 83%, 53%, 0.4)',
        bottomColor: mode ? 'hsla(217, 91%, 60%, 0)' : 'hsla(221, 83%, 53%, 0)',
        lineWidth: 2,
      });
    case 'Baseline':
      return chart.addSeries(BaselineSeries, {
        baseValue: {
          type: 'price',
          price:
            sample && sample.length > 0 && 'close' in sample[0]
              ? (sample[0] as BarData<Time>).close
              : sample && sample.length > 0 && 'value' in sample[0]
                ? (sample[0] as LineData<Time>).value
                : 0,
        },
        topLineColor: upColor,
        bottomLineColor: downColor,
        topFillColor1: 'rgba(38, 166, 154, 0.28)',
        topFillColor2: 'rgba(38, 166, 154, 0.05)',
        bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
        bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
      });
    case 'Line':
    default:
      return chart.addSeries(LineSeries, {
        color: mode ? 'hsl(217, 91%, 60%)' : 'hsl(221, 83%, 53%)',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        lastValueVisible: true,
      });
  }
}
