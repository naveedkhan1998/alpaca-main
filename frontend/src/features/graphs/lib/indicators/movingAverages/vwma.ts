/**
 * Volume Weighted Moving Average (VWMA) Indicator
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
  id: 'VWMA',
  name: 'Volume Weighted Moving Average',
  shortName: 'VWMA',
  description:
    'A moving average that incorporates volume, giving more weight to high-volume periods.',
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
    },
    {
      key: 'color',
      label: 'Color',
      type: 'color',
      default: '#06B6D4',
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
      key: 'vwma',
      label: 'VWMA',
      type: 'line',
      defaultColor: '#06B6D4',
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

  const result: LineData<Time>[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    let volumeSum = 0;
    let priceVolumeSum = 0;

    slice.forEach(candle => {
      const volume = candle.volume || 0;
      volumeSum += volume;
      priceVolumeSum += candle.close * volume;
    });

    if (volumeSum > 0) {
      result.push({
        time: data[i].time,
        value: priceVolumeSum / volumeSum,
      });
    }
  }

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
