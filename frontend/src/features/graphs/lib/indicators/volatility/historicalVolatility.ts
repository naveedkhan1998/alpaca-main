/**
 * Historical Volatility Indicator
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
  id: 'HistoricalVolatility',
  name: 'Historical Volatility',
  shortName: 'HV',
  description:
    'Annualized standard deviation of log returns over a specified period.',
  category: 'panel',
  group: 'Volatility',
  icon: 'ChartSquareBar',
  parameters: [
    {
      key: 'period',
      label: 'Period',
      type: 'number',
      default: 21,
      min: 5,
      max: 100,
      step: 1,
    },
    {
      key: 'annualize',
      label: 'Annualize',
      type: 'boolean',
      default: true,
    },
    {
      key: 'color',
      label: 'Line Color',
      type: 'color',
      default: '#F97316',
    },
  ],
  outputs: [
    {
      key: 'hv',
      label: 'HV',
      type: 'line',
      defaultColor: '#F97316',
      lineWidth: 2,
    },
  ],
  minDataPoints: 21,
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): LineIndicatorOutput {
  const period = (config.period as number) || 21;
  const annualize = (config.annualize as boolean) ?? true;
  const tradingDays = 252; // Annual trading days

  // Calculate log returns
  const logReturns: number[] = [NaN];
  for (let i = 1; i < data.length; i++) {
    logReturns.push(Math.log(data[i].close / data[i - 1].close));
  }

  const result: LineData<Time>[] = [];

  for (let i = period; i < data.length; i++) {
    const slice = logReturns.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance =
      slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      (period - 1);
    let hv = Math.sqrt(variance);

    if (annualize) {
      hv = hv * Math.sqrt(tradingDays) * 100; // As percentage
    }

    result.push({ time: data[i].time, value: hv });
  }

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
