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
        upColor: mode ? '#10B981' : '#059669',
        downColor: mode ? '#EF4444' : '#DC2626',
        borderVisible: false,
        wickUpColor: mode ? '#10B981' : '#059669',
        wickDownColor: mode ? '#EF4444' : '#DC2626',
      });
    case 'Bar':
      return chart.addSeries(BarSeries, {
        upColor: mode ? '#10B981' : '#059669',
        downColor: mode ? '#EF4444' : '#DC2626',
      });
    case 'Area':
      return chart.addSeries(AreaSeries, {
        lineColor: mode ? '#3B82F6' : '#2563EB',
        topColor: mode ? 'rgba(59, 130, 246, 0.4)' : 'rgba(37, 99, 235, 0.4)',
        bottomColor: mode ? 'rgba(59, 130, 246, 0)' : 'rgba(37, 99, 235, 0)',
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
        topLineColor: mode ? '#10B981' : '#059669',
        bottomLineColor: mode ? '#EF4444' : '#DC2626',
        topFillColor1: 'rgba(38, 166, 154, 0.28)',
        topFillColor2: 'rgba(38, 166, 154, 0.05)',
        bottomFillColor1: 'rgba(239, 83, 80, 0.05)',
        bottomFillColor2: 'rgba(239, 83, 80, 0.28)',
      });
    case 'Line':
    default:
      return chart.addSeries(LineSeries, {
        color: mode ? '#3B82F6' : '#2563EB',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        lastValueVisible: true,
      });
  }
}
