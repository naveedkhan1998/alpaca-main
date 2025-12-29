/**
 * Stochastic Oscillator Indicator
 */

import type { Time, LineData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  MultiLineIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';
import { sma } from '../utils';

const definition: IndicatorDefinition = {
  id: 'Stochastic',
  name: 'Stochastic Oscillator',
  shortName: 'Stoch',
  description:
    'Momentum indicator comparing closing price to price range over a period. %K is the main line, %D is the smoothed signal.',
  category: 'panel',
  group: 'Momentum',
  icon: 'ChartPie',
  parameters: [
    {
      key: 'kPeriod',
      label: '%K Period',
      type: 'number',
      default: 14,
      min: 3,
      max: 100,
      step: 1,
      description: 'Lookback period for %K calculation',
    },
    {
      key: 'dPeriod',
      label: '%D Period',
      type: 'number',
      default: 3,
      min: 1,
      max: 20,
      step: 1,
      description: 'Smoothing period for %D (signal line)',
    },
    {
      key: 'smooth',
      label: 'Smooth %K',
      type: 'number',
      default: 3,
      min: 1,
      max: 10,
      step: 1,
      description: 'Smoothing for slow stochastic',
    },
    {
      key: 'overbought',
      label: 'Overbought Level',
      type: 'number',
      default: 80,
      min: 60,
      max: 95,
      step: 1,
    },
    {
      key: 'oversold',
      label: 'Oversold Level',
      type: 'number',
      default: 20,
      min: 5,
      max: 40,
      step: 1,
    },
    {
      key: 'kColor',
      label: '%K Color',
      type: 'color',
      default: '#3B82F6',
    },
    {
      key: 'dColor',
      label: '%D Color',
      type: 'color',
      default: '#EF4444',
    },
  ],
  outputs: [
    {
      key: 'k',
      label: '%K',
      type: 'line',
      defaultColor: '#3B82F6',
      lineWidth: 2,
    },
    {
      key: 'd',
      label: '%D',
      type: 'line',
      defaultColor: '#EF4444',
      lineWidth: 1,
      lineStyle: 2,
    },
  ],
  minDataPoints: 14,
  valueRange: { min: 0, max: 100 },
  referenceLines: [
    { value: 80, label: 'Overbought', color: '#EF4444', style: 'dashed' },
    { value: 50, label: 'Middle', color: '#6B7280', style: 'dotted' },
    { value: 20, label: 'Oversold', color: '#10B981', style: 'dashed' },
  ],
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): MultiLineIndicatorOutput {
  const kPeriod = (config.kPeriod as number) || 14;
  const dPeriod = (config.dPeriod as number) || 3;
  const smooth = (config.smooth as number) || 3;

  // Calculate raw %K
  const rawK: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) {
      rawK.push(NaN);
      continue;
    }

    const slice = data.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...slice.map(d => d.high));
    const lowestLow = Math.min(...slice.map(d => d.low));

    const range = highestHigh - lowestLow;
    rawK.push(range === 0 ? 50 : ((data[i].close - lowestLow) / range) * 100);
  }

  // Smooth %K (slow stochastic)
  const smoothK = sma(
    rawK.filter(v => !isNaN(v)),
    smooth
  );

  // Calculate %D (SMA of %K)
  const dValues = sma(
    smoothK.filter(v => !isNaN(v)),
    dPeriod
  );

  const kResult: LineData<Time>[] = [];
  const dResult: LineData<Time>[] = [];

  let kIdx = 0;
  let dIdx = 0;

  for (let i = kPeriod - 1 + smooth - 1; i < data.length; i++) {
    if (kIdx < smoothK.length && !isNaN(smoothK[kIdx])) {
      kResult.push({ time: data[i].time, value: smoothK[kIdx] });

      if (dIdx < dValues.length && !isNaN(dValues[dIdx])) {
        dResult.push({ time: data[i].time, value: dValues[dIdx] });
        dIdx++;
      }
    }
    kIdx++;
  }

  return {
    type: 'multi-line',
    series: {
      k: kResult,
      d: dResult,
    },
  };
}

export default { definition, calculate } as IndicatorModule;
