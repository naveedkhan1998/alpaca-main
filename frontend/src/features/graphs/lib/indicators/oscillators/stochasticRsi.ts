/**
 * Stochastic RSI Indicator
 */

import type { Time, LineData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  MultiLineIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';
import { sma, highest, lowest } from '../utils';

const definition: IndicatorDefinition = {
  id: 'StochasticRSI',
  name: 'Stochastic RSI',
  shortName: 'StochRSI',
  description:
    'Applies Stochastic formula to RSI values for increased sensitivity.',
  category: 'panel',
  group: 'Momentum',
  icon: 'ChartPie',
  parameters: [
    {
      key: 'rsiPeriod',
      label: 'RSI Period',
      type: 'number',
      default: 14,
      min: 5,
      max: 50,
      step: 1,
    },
    {
      key: 'stochPeriod',
      label: 'Stoch Period',
      type: 'number',
      default: 14,
      min: 5,
      max: 50,
      step: 1,
    },
    {
      key: 'kPeriod',
      label: '%K Smooth',
      type: 'number',
      default: 3,
      min: 1,
      max: 10,
      step: 1,
    },
    {
      key: 'dPeriod',
      label: '%D Smooth',
      type: 'number',
      default: 3,
      min: 1,
      max: 10,
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
  minDataPoints: 28,
  valueRange: { min: 0, max: 100 },
  referenceLines: [
    { value: 80, label: 'Overbought', color: '#EF4444', style: 'dashed' },
    { value: 20, label: 'Oversold', color: '#10B981', style: 'dashed' },
  ],
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): MultiLineIndicatorOutput {
  const rsiPeriod = (config.rsiPeriod as number) || 14;
  const stochPeriod = (config.stochPeriod as number) || 14;
  const kPeriod = (config.kPeriod as number) || 3;
  const dPeriod = (config.dPeriod as number) || 3;

  // First calculate RSI
  const rsiValues: number[] = [];

  if (data.length <= rsiPeriod) {
    return { type: 'multi-line', series: { k: [], d: [] } };
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= rsiPeriod; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / rsiPeriod;
  let avgLoss = losses / rsiPeriod;

  // Pad with NaN for alignment
  for (let i = 0; i < rsiPeriod; i++) {
    rsiValues.push(NaN);
  }

  rsiValues.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));

  for (let i = rsiPeriod + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const currentGain = change >= 0 ? change : 0;
    const currentLoss = change < 0 ? -change : 0;

    avgGain = (avgGain * (rsiPeriod - 1) + currentGain) / rsiPeriod;
    avgLoss = (avgLoss * (rsiPeriod - 1) + currentLoss) / rsiPeriod;

    rsiValues.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }

  // Apply stochastic formula to RSI
  const validRsi = rsiValues.filter(v => !isNaN(v));
  const highestRsi = highest(validRsi, stochPeriod);
  const lowestRsi = lowest(validRsi, stochPeriod);

  const stochRsiRaw: number[] = [];
  for (let i = 0; i < validRsi.length; i++) {
    if (isNaN(highestRsi[i]) || isNaN(lowestRsi[i])) {
      stochRsiRaw.push(NaN);
      continue;
    }
    const range = highestRsi[i] - lowestRsi[i];
    stochRsiRaw.push(
      range === 0 ? 50 : ((validRsi[i] - lowestRsi[i]) / range) * 100
    );
  }

  // Smooth for %K
  const kValues = sma(
    stochRsiRaw.filter(v => !isNaN(v)),
    kPeriod
  );

  // Smooth for %D
  const dValues = sma(
    kValues.filter(v => !isNaN(v)),
    dPeriod
  );

  const kResult: LineData<Time>[] = [];
  const dResult: LineData<Time>[] = [];

  const startOffset = rsiPeriod + stochPeriod - 1 + kPeriod - 1;
  let kIdx = 0;
  let dIdx = 0;

  for (let i = startOffset; i < data.length; i++) {
    if (kIdx < kValues.length && !isNaN(kValues[kIdx])) {
      kResult.push({ time: data[i].time, value: kValues[kIdx] });

      if (kIdx >= dPeriod - 1 && dIdx < dValues.length && !isNaN(dValues[dIdx])) {
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
