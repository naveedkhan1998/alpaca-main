/**
 * Indicator System - Main Exports
 *
 * This module provides a comprehensive, extensible indicator system for
 * financial charting with lightweight-charts.
 */

// Types
export type {
  IndicatorCategory,
  IndicatorOutputType,
  IndicatorId,
  BaseParameter,
  NumericParameter,
  ColorParameter,
  SelectParameter,
  BooleanParameter,
  IndicatorParameter,
  OutputSeries,
  IndicatorDefinition,
  IndicatorConfig,
  IndicatorInstance,
  LineIndicatorOutput,
  HistogramIndicatorOutput,
  BandIndicatorOutput,
  MultiLineIndicatorOutput,
  IndicatorOutput,
  OHLCVData,
  IndicatorCalculator,
  IndicatorGroup,
  CalculatedIndicator,
  IndicatorModule,
} from './types';

// Registry and calculations
export {
  INDICATOR_REGISTRY,
  getAllIndicators,
  getIndicator,
  getIndicatorModule,
  getCalculator,
  getIndicatorsByCategory,
  getIndicatorsGrouped,
  getDefaultConfig,
  validateConfig,
  calculateIndicator,
  getMaxLookback,
} from './registry';

// Category exports for direct access if needed
export { movingAverages } from './movingAverages';
export { oscillators } from './oscillators';
export { volatility } from './volatility';
export { volume } from './volume';
