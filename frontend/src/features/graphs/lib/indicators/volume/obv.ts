/**
 * On-Balance Volume (OBV) Indicator
 */

import type { Time, LineData } from 'lightweight-charts';
import type {
  IndicatorDefinition,
  IndicatorConfig,
  MultiLineIndicatorOutput,
  OHLCVData,
  IndicatorModule,
} from '../types';
import { ema } from '../utils';

const definition: IndicatorDefinition = {
  id: 'OBV',
  name: 'On-Balance Volume',
  shortName: 'OBV',
  description:
    'Cumulative volume indicator that adds volume on up days and subtracts on down days.',
  category: 'panel',
  group: 'Volume',
  icon: 'ChartBar',
  parameters: [
    {
      key: 'obvColor',
      label: 'OBV Color',
      type: 'color',
      default: '#0EA5E9',
    },
    {
      key: 'showSignalLine',
      label: 'Show Signal Line',
      type: 'boolean',
      default: true,
    },
    {
      key: 'signalPeriod',
      label: 'Signal Period',
      type: 'number',
      default: 21,
      min: 5,
      max: 100,
      step: 1,
    },
    {
      key: 'signalColor',
      label: 'Signal Line Color',
      type: 'color',
      default: '#F59E0B',
    },
  ],
  outputs: [
    {
      key: 'obv',
      label: 'OBV',
      type: 'line',
      defaultColor: '#0EA5E9',
      lineWidth: 2,
    },
    {
      key: 'signal',
      label: 'Signal',
      type: 'line',
      defaultColor: '#F59E0B',
      lineWidth: 1,
      lineStyle: 2,
    },
  ],
  minDataPoints: 2,
};

function calculate(
  data: OHLCVData[],
  config: IndicatorConfig
): MultiLineIndicatorOutput {
  const showSignalLine = (config.showSignalLine as boolean) ?? true;
  const signalPeriod = (config.signalPeriod as number) || 21;

  const obvValues: number[] = [data[0].volume || 0];

  for (let i = 1; i < data.length; i++) {
    const volume = data[i].volume || 0;
    const prevClose = data[i - 1].close;
    const currentClose = data[i].close;

    if (currentClose > prevClose) {
      obvValues.push(obvValues[i - 1] + volume);
    } else if (currentClose < prevClose) {
      obvValues.push(obvValues[i - 1] - volume);
    } else {
      obvValues.push(obvValues[i - 1]);
    }
  }

  const obvResult: LineData<Time>[] = data.map((d, i) => ({
    time: d.time,
    value: obvValues[i],
  }));

  const result: MultiLineIndicatorOutput = {
    type: 'multi-line',
    series: {
      obv: obvResult,
    },
  };

  if (showSignalLine) {
    const signalValues = ema(obvValues, signalPeriod);
    const signalResult: LineData<Time>[] = data
      .map((d, i) => ({
        time: d.time,
        value: signalValues[i],
      }))
      .filter(d => !isNaN(d.value));

    result.series.signal = signalResult;
  }

  return result;
}

export default { definition, calculate } as IndicatorModule;
