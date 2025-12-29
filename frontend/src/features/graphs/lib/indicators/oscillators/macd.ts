/**
 * Moving Average Convergence Divergence (MACD) Indicator
 */

import type { Time, LineData, HistogramData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  MultiLineIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';
import { ema } from '../utils';

const definition: IndicatorDefinition = {
  id: 'MACD',
  name: 'Moving Average Convergence Divergence',
  shortName: 'MACD',
  description:
    'Trend-following momentum indicator showing the relationship between two EMAs. Includes MACD line, signal line, and histogram.',
  category: 'panel',
  group: 'Momentum',
  icon: 'ChartBar',
  parameters: [
    {
      key: 'fastPeriod',
      label: 'Fast Period',
      type: 'number',
      default: 12,
      min: 2,
      max: 50,
      step: 1,
      description: 'Period for the fast EMA',
    },
    {
      key: 'slowPeriod',
      label: 'Slow Period',
      type: 'number',
      default: 26,
      min: 5,
      max: 100,
      step: 1,
      description: 'Period for the slow EMA',
    },
    {
      key: 'signalPeriod',
      label: 'Signal Period',
      type: 'number',
      default: 9,
      min: 2,
      max: 50,
      step: 1,
      description: 'Period for the signal line EMA',
    },
    {
      key: 'macdColor',
      label: 'MACD Line Color',
      type: 'color',
      default: '#3B82F6',
    },
    {
      key: 'signalColor',
      label: 'Signal Line Color',
      type: 'color',
      default: '#EF4444',
    },
    {
      key: 'histogramPositiveColor',
      label: 'Histogram Positive',
      type: 'color',
      default: '#22C55E',
    },
    {
      key: 'histogramNegativeColor',
      label: 'Histogram Negative',
      type: 'color',
      default: '#EF4444',
    },
  ],
  outputs: [
    {
      key: 'macd',
      label: 'MACD',
      type: 'line',
      defaultColor: '#3B82F6',
      lineWidth: 2,
    },
    {
      key: 'signal',
      label: 'Signal',
      type: 'line',
      defaultColor: '#EF4444',
      lineWidth: 2,
    },
    {
      key: 'histogram',
      label: 'Histogram',
      type: 'histogram',
      defaultColor: '#8B5CF6',
    },
  ],
  minDataPoints: 26,
  valueRange: { symmetric: true },
  referenceLines: [
    { value: 0, label: 'Zero', color: '#6B7280', style: 'solid' },
  ],
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): MultiLineIndicatorOutput {
  const fastPeriod = (config.fastPeriod as number) || 12;
  const slowPeriod = (config.slowPeriod as number) || 26;
  const signalPeriod = (config.signalPeriod as number) || 9;
  const histPositiveColor =
    (config.histogramPositiveColor as string) || '#22C55E';
  const histNegativeColor =
    (config.histogramNegativeColor as string) || '#EF4444';

  const prices = data.map(d => d.close);
  const fastEMA = ema(prices, fastPeriod);
  const slowEMA = ema(prices, slowPeriod);

  // Calculate MACD line (fast EMA - slow EMA)
  const macdLine: number[] = fastEMA.map((fast, i) => fast - slowEMA[i]);

  // Calculate signal line (EMA of MACD)
  const signalLine = ema(
    macdLine.filter(v => !isNaN(v)),
    signalPeriod
  );

  // Map back to full length with proper alignment
  const macdResult: LineData<Time>[] = [];
  const signalResult: LineData<Time>[] = [];
  const histogramResult: HistogramData<Time>[] = [];

  let signalIdx = 0;
  const startIdx = slowPeriod - 1;

  for (let i = startIdx; i < data.length; i++) {
    if (isNaN(macdLine[i])) continue;

    const time = data[i].time;
    const macdValue = macdLine[i];

    macdResult.push({ time, value: macdValue });

    // Signal and histogram only available after signal period
    if (i >= startIdx + signalPeriod - 1 && signalIdx < signalLine.length) {
      const signalValue = signalLine[signalIdx];
      if (!isNaN(signalValue)) {
        signalResult.push({ time, value: signalValue });

        const histValue = macdValue - signalValue;
        histogramResult.push({
          time,
          value: histValue,
          color: histValue >= 0 ? histPositiveColor : histNegativeColor,
        });
      }
      signalIdx++;
    }
  }

  return {
    type: 'multi-line',
    series: {
      macd: macdResult,
      signal: signalResult,
      histogram: histogramResult,
    },
  };
}

export default { definition, calculate } as IndicatorModule;
