/**
 * Commodity Channel Index (CCI) Indicator
 */

import type { Time, LineData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  LineIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';
import { sma } from '../utils';

const definition: IndicatorDefinition = {
  id: 'CCI',
  name: 'Commodity Channel Index',
  shortName: 'CCI',
  description:
    'Oscillator measuring price deviation from statistical mean. Values above +100 indicate overbought, below -100 indicate oversold.',
  category: 'panel',
  group: 'Momentum',
  icon: 'ChartPie',
  parameters: [
    {
      key: 'period',
      label: 'Period',
      type: 'number',
      default: 20,
      min: 5,
      max: 100,
      step: 1,
    },
    {
      key: 'overbought',
      label: 'Overbought Level',
      type: 'number',
      default: 100,
      min: 50,
      max: 200,
      step: 10,
    },
    {
      key: 'oversold',
      label: 'Oversold Level',
      type: 'number',
      default: -100,
      min: -200,
      max: -50,
      step: 10,
    },
    {
      key: 'color',
      label: 'Line Color',
      type: 'color',
      default: '#06B6D4',
    },
  ],
  outputs: [
    {
      key: 'cci',
      label: 'CCI',
      type: 'line',
      defaultColor: '#06B6D4',
      lineWidth: 2,
    },
  ],
  minDataPoints: 20,
  valueRange: { symmetric: true },
  referenceLines: [
    { value: 100, label: 'Overbought', color: '#EF4444', style: 'dashed' },
    { value: 0, label: 'Zero', color: '#6B7280', style: 'solid' },
    { value: -100, label: 'Oversold', color: '#10B981', style: 'dashed' },
  ],
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): LineIndicatorOutput {
  const period = (config.period as number) || 20;

  const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
  const smaValues = sma(typicalPrices, period);

  const result: LineData<Time>[] = [];

  for (let i = period - 1; i < data.length; i++) {
    if (isNaN(smaValues[i])) continue;

    const slice = typicalPrices.slice(i - period + 1, i + 1);
    const mean = smaValues[i];
    const meanDeviation =
      slice.reduce((sum, val) => sum + Math.abs(val - mean), 0) / period;

    const cci =
      meanDeviation === 0
        ? 0
        : (typicalPrices[i] - mean) / (0.015 * meanDeviation);

    result.push({ time: data[i].time, value: cci });
  }

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
