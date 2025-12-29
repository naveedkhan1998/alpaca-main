/**
 * Relative Strength Index (RSI) Indicator
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
  id: 'RSI',
  name: 'Relative Strength Index',
  shortName: 'RSI',
  description:
    'Momentum oscillator that measures the speed and magnitude of price movements. Values above 70 indicate overbought, below 30 indicate oversold.',
  category: 'panel',
  group: 'Momentum',
  icon: 'ChartPie',
  parameters: [
    {
      key: 'period',
      label: 'Period',
      type: 'number',
      default: 14,
      min: 2,
      max: 100,
      step: 1,
      description: 'Number of periods for RSI calculation',
    },
    {
      key: 'overbought',
      label: 'Overbought Level',
      type: 'number',
      default: 70,
      min: 50,
      max: 95,
      step: 1,
      description: 'Level indicating overbought conditions',
    },
    {
      key: 'oversold',
      label: 'Oversold Level',
      type: 'number',
      default: 30,
      min: 5,
      max: 50,
      step: 1,
      description: 'Level indicating oversold conditions',
    },
    {
      key: 'color',
      label: 'Line Color',
      type: 'color',
      default: '#F59E0B',
    },
    {
      key: 'showZones',
      label: 'Show Overbought/Oversold Zones',
      type: 'boolean',
      default: true,
    },
  ],
  outputs: [
    {
      key: 'rsi',
      label: 'RSI',
      type: 'line',
      defaultColor: '#F59E0B',
      lineWidth: 2,
    },
  ],
  minDataPoints: 14,
  valueRange: { min: 0, max: 100 },
  referenceLines: [
    { value: 70, label: 'Overbought', color: '#EF4444', style: 'dashed' },
    { value: 50, label: 'Middle', color: '#6B7280', style: 'dotted' },
    { value: 30, label: 'Oversold', color: '#10B981', style: 'dashed' },
  ],
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): LineIndicatorOutput {
  const period = (config.period as number) || 14;

  if (data.length <= period) {
    return { type: 'line', data: [] };
  }

  const result: LineData<Time>[] = [];
  let gains = 0;
  let losses = 0;

  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  result.push({
    time: data[period].time,
    value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss),
  });

  // Calculate subsequent values using Wilder's smoothing
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    let currentGain = 0;
    let currentLoss = 0;

    if (change >= 0) {
      currentGain = change;
    } else {
      currentLoss = -change;
    }

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    result.push({
      time: data[i].time,
      value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss),
    });
  }

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
