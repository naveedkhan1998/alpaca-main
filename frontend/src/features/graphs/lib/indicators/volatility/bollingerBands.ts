/**
 * Bollinger Bands Indicator
 */

import type { Time, LineData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  BandIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';
import { sma, stdDev } from '../utils';

const definition: IndicatorDefinition = {
  id: 'BollingerBands',
  name: 'Bollinger Bands',
  shortName: 'BB',
  description:
    'Volatility bands placed above and below a moving average, based on standard deviation.',
  category: 'overlay',
  group: 'Volatility Bands',
  icon: 'ViewGrid',
  parameters: [
    {
      key: 'period',
      label: 'Period',
      type: 'number',
      default: 20,
      min: 5,
      max: 100,
      step: 1,
      description: 'Number of periods for the middle band (SMA)',
    },
    {
      key: 'stdDev',
      label: 'Standard Deviation',
      type: 'number',
      default: 2,
      min: 0.5,
      max: 5,
      step: 0.1,
      description: 'Number of standard deviations for the bands',
    },
    {
      key: 'upperColor',
      label: 'Upper Band Color',
      type: 'color',
      default: '#F59E0B',
    },
    {
      key: 'middleColor',
      label: 'Middle Band Color',
      type: 'color',
      default: '#3B82F6',
    },
    {
      key: 'lowerColor',
      label: 'Lower Band Color',
      type: 'color',
      default: '#EF4444',
    },
    {
      key: 'fillOpacity',
      label: 'Fill Opacity',
      type: 'number',
      default: 0.1,
      min: 0,
      max: 0.5,
      step: 0.05,
    },
  ],
  outputs: [
    {
      key: 'upper',
      label: 'Upper Band',
      type: 'line',
      defaultColor: '#F59E0B',
      lineStyle: 2,
      lineWidth: 1,
    },
    {
      key: 'middle',
      label: 'Middle Band',
      type: 'line',
      defaultColor: '#3B82F6',
      lineStyle: 1,
      lineWidth: 1,
    },
    {
      key: 'lower',
      label: 'Lower Band',
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
  const period = (config.period as number) || 20;
  const stdDevMultiplier = (config.stdDev as number) || 2;

  const prices = data.map(d => d.close);
  const smaValues = sma(prices, period);
  const stdDevValues = stdDev(prices, period);

  const upper: LineData<Time>[] = [];
  const middle: LineData<Time>[] = [];
  const lower: LineData<Time>[] = [];

  for (let i = 0; i < data.length; i++) {
    if (isNaN(smaValues[i]) || isNaN(stdDevValues[i])) continue;

    const time = data[i].time;
    const middleValue = smaValues[i];
    const deviation = stdDevValues[i] * stdDevMultiplier;

    upper.push({ time, value: middleValue + deviation });
    middle.push({ time, value: middleValue });
    lower.push({ time, value: middleValue - deviation });
  }

  return { type: 'band', upper, middle, lower };
}

export default { definition, calculate } as IndicatorModule;
