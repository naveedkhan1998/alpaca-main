/**
 * Momentum Indicator
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
  id: 'Momentum',
  name: 'Momentum',
  shortName: 'MOM',
  description:
    'Measures the rate of price change by calculating the difference between current price and price n periods ago.',
  category: 'panel',
  group: 'Momentum',
  icon: 'TrendingUp',
  parameters: [
    {
      key: 'period',
      label: 'Period',
      type: 'number',
      default: 10,
      min: 1,
      max: 100,
      step: 1,
    },
    {
      key: 'color',
      label: 'Line Color',
      type: 'color',
      default: '#14B8A6',
    },
  ],
  outputs: [
    {
      key: 'momentum',
      label: 'Momentum',
      type: 'line',
      defaultColor: '#14B8A6',
      lineWidth: 2,
    },
  ],
  minDataPoints: 10,
  valueRange: { symmetric: true },
  referenceLines: [
    { value: 0, label: 'Zero', color: '#6B7280', style: 'solid' },
  ],
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): LineIndicatorOutput {
  const period = (config.period as number) || 10;

  const result: LineData<Time>[] = [];

  for (let i = period; i < data.length; i++) {
    const pastPrice = data[i - period].close;
    const currentPrice = data[i].close;

    result.push({ time: data[i].time, value: currentPrice - pastPrice });
  }

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
