/**
 * Rate of Change (ROC) Indicator
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
  id: 'ROC',
  name: 'Rate of Change',
  shortName: 'ROC',
  description:
    'Momentum oscillator measuring the percentage change between current price and price n periods ago.',
  category: 'panel',
  group: 'Momentum',
  icon: 'TrendingUp',
  parameters: [
    {
      key: 'period',
      label: 'Period',
      type: 'number',
      default: 12,
      min: 1,
      max: 100,
      step: 1,
    },
    {
      key: 'color',
      label: 'Line Color',
      type: 'color',
      default: '#EC4899',
    },
  ],
  outputs: [
    {
      key: 'roc',
      label: 'ROC',
      type: 'line',
      defaultColor: '#EC4899',
      lineWidth: 2,
    },
  ],
  minDataPoints: 12,
  valueRange: { symmetric: true },
  referenceLines: [
    { value: 0, label: 'Zero', color: '#6B7280', style: 'solid' },
  ],
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): LineIndicatorOutput {
  const period = (config.period as number) || 12;

  const result: LineData<Time>[] = [];

  for (let i = period; i < data.length; i++) {
    const pastPrice = data[i - period].close;
    const currentPrice = data[i].close;
    const roc =
      pastPrice === 0 ? 0 : ((currentPrice - pastPrice) / pastPrice) * 100;

    result.push({ time: data[i].time, value: roc });
  }

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
