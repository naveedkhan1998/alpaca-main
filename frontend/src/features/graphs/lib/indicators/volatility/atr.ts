/**
 * Average True Range (ATR) Indicator
 */

import type { Time, LineData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  LineIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';
import { trueRange } from '../utils';

const definition: IndicatorDefinition = {
  id: 'ATR',
  name: 'Average True Range',
  shortName: 'ATR',
  description:
    'Volatility indicator showing the average range of price movement over a period. Higher values indicate higher volatility.',
  category: 'panel',
  group: 'Volatility',
  icon: 'ChartSquareBar',
  parameters: [
    {
      key: 'period',
      label: 'Period',
      type: 'number',
      default: 14,
      min: 2,
      max: 100,
      step: 1,
      description: 'Number of periods for ATR calculation',
    },
    {
      key: 'color',
      label: 'Line Color',
      type: 'color',
      default: '#3B82F6',
    },
    {
      key: 'showPercentage',
      label: 'Show as Percentage',
      type: 'boolean',
      default: false,
      description: 'Display ATR as percentage of price',
    },
  ],
  outputs: [
    {
      key: 'atr',
      label: 'ATR',
      type: 'line',
      defaultColor: '#3B82F6',
      lineWidth: 2,
    },
  ],
  minDataPoints: 14,
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): LineIndicatorOutput {
  const period = (config.period as number) || 14;
  const showPercentage = (config.showPercentage as boolean) || false;

  const tr = trueRange(data);
  const result: LineData<Time>[] = [];

  // Initial ATR (SMA of TR)
  let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period - 1; i < data.length; i++) {
    if (i > period - 1) {
      // Wilder's smoothing
      atr = (atr * (period - 1) + tr[i]) / period;
    }

    let value = atr;
    if (showPercentage) {
      value = (atr / data[i].close) * 100;
    }

    result.push({ time: data[i].time, value });
  }

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
