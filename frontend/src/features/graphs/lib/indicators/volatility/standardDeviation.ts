/**
 * Standard Deviation Indicator
 */

import type { Time, LineData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  LineIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';
import { stdDev } from '../utils';

const definition: IndicatorDefinition = {
  id: 'StandardDeviation',
  name: 'Standard Deviation',
  shortName: 'StdDev',
  description:
    'Statistical measure of price volatility showing how spread out prices are from the average.',
  category: 'panel',
  group: 'Volatility',
  icon: 'ChartSquareBar',
  parameters: [
    {
      key: 'period',
      label: 'Period',
      type: 'number',
      default: 20,
      min: 2,
      max: 100,
      step: 1,
    },
    {
      key: 'color',
      label: 'Line Color',
      type: 'color',
      default: '#A855F7',
    },
  ],
  outputs: [
    {
      key: 'stdDev',
      label: 'Std Dev',
      type: 'line',
      defaultColor: '#A855F7',
      lineWidth: 2,
    },
  ],
  minDataPoints: 20,
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): LineIndicatorOutput {
  const period = (config.period as number) || 20;

  const prices = data.map(d => d.close);
  const stdDevValues = stdDev(prices, period);

  const result: LineData<Time>[] = data
    .map((d, i) => ({
      time: d.time,
      value: stdDevValues[i],
    }))
    .filter(d => !isNaN(d.value));

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
