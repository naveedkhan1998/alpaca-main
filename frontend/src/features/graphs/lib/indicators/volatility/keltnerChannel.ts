/**
 * Keltner Channel Indicator
 */

import type { Time, LineData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  BandIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';
import { ema, trueRange } from '../utils';

const definition: IndicatorDefinition = {
  id: 'KeltnerChannel',
  name: 'Keltner Channel',
  shortName: 'KC',
  description:
    'Volatility-based envelope using EMA and ATR, useful for identifying trends and breakouts.',
  category: 'overlay',
  group: 'Volatility Bands',
  icon: 'ViewGrid',
  parameters: [
    {
      key: 'emaPeriod',
      label: 'EMA Period',
      type: 'number',
      default: 20,
      min: 5,
      max: 100,
      step: 1,
    },
    {
      key: 'atrPeriod',
      label: 'ATR Period',
      type: 'number',
      default: 10,
      min: 5,
      max: 50,
      step: 1,
    },
    {
      key: 'multiplier',
      label: 'ATR Multiplier',
      type: 'number',
      default: 2,
      min: 0.5,
      max: 5,
      step: 0.1,
    },
    {
      key: 'upperColor',
      label: 'Upper Band Color',
      type: 'color',
      default: '#10B981',
    },
    {
      key: 'middleColor',
      label: 'Middle Band Color',
      type: 'color',
      default: '#6366F1',
    },
    {
      key: 'lowerColor',
      label: 'Lower Band Color',
      type: 'color',
      default: '#EF4444',
    },
  ],
  outputs: [
    {
      key: 'upper',
      label: 'Upper Channel',
      type: 'line',
      defaultColor: '#10B981',
      lineStyle: 2,
      lineWidth: 1,
    },
    {
      key: 'middle',
      label: 'Middle Line',
      type: 'line',
      defaultColor: '#6366F1',
      lineWidth: 1,
    },
    {
      key: 'lower',
      label: 'Lower Channel',
      type: 'line',
      defaultColor: '#EF4444',
      lineStyle: 2,
      lineWidth: 1,
    },
  ],
  minDataPoints: 20,
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): BandIndicatorOutput {
  const emaPeriod = (config.emaPeriod as number) || 20;
  const atrPeriod = (config.atrPeriod as number) || 10;
  const multiplier = (config.multiplier as number) || 2;

  const prices = data.map(d => d.close);
  const emaValues = ema(prices, emaPeriod);

  // Calculate ATR
  const tr = trueRange(data);
  const atrValues = ema(tr, atrPeriod);

  const upper: LineData<Time>[] = [];
  const middle: LineData<Time>[] = [];
  const lower: LineData<Time>[] = [];

  for (let i = 0; i < data.length; i++) {
    if (isNaN(emaValues[i]) || isNaN(atrValues[i])) continue;

    const time = data[i].time;
    const middleValue = emaValues[i];
    const channel = atrValues[i] * multiplier;

    upper.push({ time, value: middleValue + channel });
    middle.push({ time, value: middleValue });
    lower.push({ time, value: middleValue - channel });
  }

  return { type: 'band', upper, middle, lower };
}

export default { definition, calculate } as IndicatorModule;
