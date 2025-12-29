/**
 * Simple Moving Average (SMA) Indicator
 */

import type { Time, LineData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  LineIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';
import { sma as calculateSma, getSourcePrice } from '../utils';

const definition: IndicatorDefinition = {
  id: 'SMA',
  name: 'Simple Moving Average',
  shortName: 'SMA',
  description: 'The arithmetic mean of closing prices over a specified period.',
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
      description: 'Number of periods for the moving average calculation',
    },
    {
      key: 'source',
      label: 'Source',
      type: 'select',
      default: 'close',
      options: [
        { value: 'close', label: 'Close' },
        { value: 'open', label: 'Open' },
        { value: 'high', label: 'High' },
        { value: 'low', label: 'Low' },
        { value: 'hl2', label: 'HL/2' },
        { value: 'hlc3', label: 'HLC/3' },
        { value: 'ohlc4', label: 'OHLC/4' },
      ],
    },
    {
      key: 'color',
      label: 'Color',
      type: 'color',
      default: '#3B82F6',
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
      key: 'sma',
      label: 'SMA',
      type: 'line',
      defaultColor: '#3B82F6',
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
  const source = (config.source as string) || 'close';

  const prices = data.map(d => getSourcePrice(d, source));
  const smaValues = calculateSma(prices, period);

  const lineData: LineData<Time>[] = data
    .map((d, i) => ({
      time: d.time,
      value: smaValues[i],
    }))
    .filter(d => !isNaN(d.value));

  return { type: 'line', data: lineData };
}

export default { definition, calculate } as IndicatorModule;
