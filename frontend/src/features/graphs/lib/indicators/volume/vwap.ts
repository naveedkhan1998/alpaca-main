/**
 * Volume Weighted Average Price (VWAP) Indicator
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
  id: 'VWAP',
  name: 'Volume Weighted Average Price',
  shortName: 'VWAP',
  description:
    'Average price weighted by volume, commonly used as intraday benchmark.',
  category: 'overlay',
  group: 'Volume',
  icon: 'TrendingUp',
  parameters: [
    {
      key: 'color',
      label: 'Line Color',
      type: 'color',
      default: '#8B5CF6',
    },
    {
      key: 'showBands',
      label: 'Show StdDev Bands',
      type: 'boolean',
      default: false,
    },
    {
      key: 'bandMultiplier',
      label: 'Band Multiplier',
      type: 'number',
      default: 2,
      min: 1,
      max: 4,
      step: 0.5,
    },
  ],
  outputs: [
    {
      key: 'vwap',
      label: 'VWAP',
      type: 'line',
      defaultColor: '#8B5CF6',
      lineWidth: 2,
    },
  ],
  minDataPoints: 1,
};

function calculate(
  data: OHLCVData[],
  _config: IndicatorConfig // eslint-disable-line @typescript-eslint/no-unused-vars
): LineIndicatorOutput {
  let cumulativeTPV = 0; // Typical Price * Volume
  let cumulativeVolume = 0;
  const result: LineData<Time>[] = [];

  for (let i = 0; i < data.length; i++) {
    const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
    const volume = data[i].volume || 0;

    cumulativeTPV += typicalPrice * volume;
    cumulativeVolume += volume;

    const vwap =
      cumulativeVolume === 0 ? typicalPrice : cumulativeTPV / cumulativeVolume;
    result.push({ time: data[i].time, value: vwap });
  }

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
