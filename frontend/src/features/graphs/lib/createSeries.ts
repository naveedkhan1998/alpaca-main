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
  switch (type) {
    case 'Candlestick':
      return chart.addSeries(CandlestickSeries, {
        upColor: mode ? 'hsl(142, 76%, 48%)' : 'hsl(142, 71%, 45%)',
        downColor: mode ? 'hsl(0, 84%, 65%)' : 'hsl(0, 84%, 60%)',
        borderVisible: false,
        wickUpColor: mode ? 'hsl(142, 76%, 48%)' : 'hsl(142, 71%, 45%)',
        wickDownColor: mode ? 'hsl(0, 84%, 65%)' : 'hsl(0, 84%, 60%)',
      });
    case 'Bar':
      return chart.addSeries(BarSeries, {
        upColor: mode ? 'hsl(142, 76%, 48%)' : 'hsl(142, 71%, 45%)',
        downColor: mode ? 'hsl(0, 84%, 65%)' : 'hsl(0, 84%, 60%)',
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
        topLineColor: mode ? 'hsl(142, 76%, 48%)' : 'hsl(142, 71%, 45%)',
        bottomLineColor: mode ? 'hsl(0, 84%, 65%)' : 'hsl(0, 84%, 60%)',
        topFillColor1: mode
          ? 'hsla(142, 76%, 48%, 0.28)'
          : 'hsla(142, 71%, 45%, 0.28)',
        topFillColor2: mode
          ? 'hsla(142, 76%, 48%, 0.05)'
          : 'hsla(142, 71%, 45%, 0.05)',
        bottomFillColor1: mode
          ? 'hsla(0, 84%, 65%, 0.05)'
          : 'hsla(0, 84%, 60%, 0.05)',
        bottomFillColor2: mode
          ? 'hsla(0, 84%, 65%, 0.28)'
          : 'hsla(0, 84%, 60%, 0.28)',
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
