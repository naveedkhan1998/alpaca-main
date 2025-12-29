/**
 * Money Flow Index (MFI) Indicator
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
  id: 'MFI',
  name: 'Money Flow Index',
  shortName: 'MFI',
  description:
    'Volume-weighted RSI that incorporates both price and volume data. Values above 80 indicate overbought, below 20 indicate oversold.',
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
      key: 'color',
      label: 'Line Color',
      type: 'color',
      default: '#10B981',
    },
  ],
  outputs: [
    {
      key: 'mfi',
      label: 'MFI',
      type: 'line',
      defaultColor: '#10B981',
      lineWidth: 2,
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
): LineIndicatorOutput {
  const period = (config.period as number) || 14;

  const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
  const rawMoneyFlow = data.map((d, i) => typicalPrices[i] * (d.volume || 0));

  const result: LineData<Time>[] = [];

  for (let i = period; i < data.length; i++) {
    let positiveFlow = 0;
    let negativeFlow = 0;

    for (let j = i - period + 1; j <= i; j++) {
      if (typicalPrices[j] > typicalPrices[j - 1]) {
        positiveFlow += rawMoneyFlow[j];
      } else if (typicalPrices[j] < typicalPrices[j - 1]) {
        negativeFlow += rawMoneyFlow[j];
      }
    }

    const mfi =
      negativeFlow === 0 ? 100 : 100 - 100 / (1 + positiveFlow / negativeFlow);

    result.push({ time: data[i].time, value: mfi });
  }

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
