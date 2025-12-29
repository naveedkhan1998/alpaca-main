/**
 * Accumulation/Distribution Indicator
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
  id: 'AccumulationDistribution',
  name: 'Accumulation/Distribution',
  shortName: 'A/D',
  description: 'Volume-based indicator that measures cumulative money flow.',
  category: 'panel',
  group: 'Volume',
  icon: 'ChartBar',
  parameters: [
    {
      key: 'color',
      label: 'Line Color',
      type: 'color',
      default: '#0EA5E9',
    },
  ],
  outputs: [
    {
      key: 'ad',
      label: 'A/D',
      type: 'line',
      defaultColor: '#0EA5E9',
      lineWidth: 2,
    },
  ],
  minDataPoints: 1,
};

function calculate(
  data: OHLCVData[],
  _config: IndicatorConfig // eslint-disable-line @typescript-eslint/no-unused-vars
): LineIndicatorOutput {
  let ad = 0;
  const result: LineData<Time>[] = [];

  for (let i = 0; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const close = data[i].close;
    const volume = data[i].volume || 0;

    const range = high - low;
    if (range !== 0) {
      const mfm = (close - low - (high - close)) / range;
      ad += mfm * volume;
    }

    result.push({ time: data[i].time, value: ad });
  }

  return { type: 'line', data: result };
}

export default { definition, calculate } as IndicatorModule;
