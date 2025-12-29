/**
 * Williams %R Indicator
 */

import type { Time, LineData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  LineIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';

const definition: IndicatorDefinition = {
  id: 'Williams%R',
  name: "Williams %R",
  shortName: '%R',
  description:
    'Momentum indicator that measures overbought/oversold levels. Similar to Stochastic but inverted.',
  category: 'panel',
  group: 'Momentum',
  icon: 'ChartPie',
  parameters: [
    {
      key: 'period',
      label: 'Period',
      type: 'number',
      default: 14,
      min: 5,
      max: 100,
      step: 1,
    },
    {
      key: 'overbought',
      label: 'Overbought Level',
      type: 'number',
      default: -20,
      min: -50,
      max: 0,
      step: 1,
    },
    {
      key: 'oversold',
      label: 'Oversold Level',
      type: 'number',
      default: -80,
      min: -100,
      max: -50,
      step: 1,
    },
    {
      key: 'color',
      label: 'Line Color',
      type: 'color',
      default: '#8B5CF6',
    },
  ],
  outputs: [
    {
      key: 'williamsR',
      label: '%R',
      type: 'line',
      defaultColor: '#8B5CF6',
      lineWidth: 2,
    },
  ],
  minDataPoints: 14,
  valueRange: { min: -100, max: 0 },
  referenceLines: [
    { value: -20, label: 'Overbought', color: '#EF4444', style: 'dashed' },
    { value: -50, label: 'Middle', color: '#6B7280', style: 'dotted' },
    { value: -80, label: 'Oversold', color: '#10B981', style: 'dashed' },
  ],
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): LineIndicatorOutput {
  const period = (config.period as number) || 14;

  const result: LineData<Time>[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const highestHigh = Math.max(...slice.map(d => d.high));
    const lowestLow = Math.min(...slice.map(d => d.low));

    const range = highestHigh - lowestLow;
    const value =
      range === 0 ? -50 : ((highestHigh - data[i].close) / range) * -100;

    result.push({ time: data[i].time, value });
  }

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
