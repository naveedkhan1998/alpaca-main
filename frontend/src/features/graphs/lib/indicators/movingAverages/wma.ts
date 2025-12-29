/**
 * Weighted Moving Average (WMA) Indicator
 */

import type { Time, LineData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  LineIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';
import { wma as calculateWma } from '../utils';

const definition: IndicatorDefinition = {
  id: 'WMA',
  name: 'Weighted Moving Average',
  shortName: 'WMA',
  description:
    'A moving average where more recent data points are given progressively higher weights.',
  category: 'overlay',
  group: 'Moving Averages',
  icon: 'TrendingUp',
  parameters: [
    {
      key: 'period',
      label: 'Period',
      type: 'number',
      default: 20,
      min: 2,
      max: 500,
      step: 1,
    },
    {
      key: 'color',
      label: 'Color',
      type: 'color',
      default: '#8B5CF6',
    },
    {
      key: 'lineWidth',
      label: 'Line Width',
      type: 'number',
      default: 2,
      min: 1,
      max: 5,
      step: 1,
    },
  ],
  outputs: [
    {
      key: 'wma',
      label: 'WMA',
      type: 'line',
      defaultColor: '#8B5CF6',
      lineWidth: 2,
    },
  ],
  minDataPoints: 2,
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): LineIndicatorOutput {
  const period = (config.period as number) || 20;

  const prices = data.map(d => d.close);
  const wmaValues = calculateWma(prices, period);

  const lineData: LineData<Time>[] = data
    .map((d, i) => ({
      time: d.time,
      value: wmaValues[i],
    }))
    .filter(d => !isNaN(d.value));

  return { type: 'line', data: lineData };
}

export default { definition, calculate } as IndicatorModule;
