/**
 * Indicator System Type Definitions
 *
 * This module provides a comprehensive type system for technical indicators.
 * Indicators are categorized into:
 * - Overlay: Rendered on top of the main price chart (EMA, SMA, Bollinger Bands)
 * - Panel: Rendered in separate panels below the main chart (RSI, MACD, ATR)
 */

import type { Time, LineData, HistogramData } from 'lightweight-charts';

// ============================================================================
// Base Types
// ============================================================================

/** Categories of indicators based on rendering location */
export type IndicatorCategory = 'overlay' | 'panel';

/** Output format types for different indicator series */
export type IndicatorOutputType = 'line' | 'histogram' | 'band' | 'multi-line';

/** Unique identifier for each indicator type */
export type IndicatorId =
  // Overlay Indicators
  | 'SMA'
  | 'EMA'
  | 'WMA'
  | 'VWMA'
  | 'BollingerBands'
  | 'KeltnerChannel'
  | 'Ichimoku'
  // Panel Indicators - Momentum
  | 'RSI'
  | 'MACD'
  | 'Stochastic'
  | 'StochasticRSI'
  | 'Williams%R'
  | 'CCI'
  | 'MFI'
  | 'ROC'
  | 'Momentum'
  // Panel Indicators - Volatility
  | 'ATR'
  | 'StandardDeviation'
  | 'HistoricalVolatility'
  // Panel Indicators - Volume
  | 'OBV'
  | 'VWAP'
  | 'AccumulationDistribution';

// ============================================================================
// Parameter Definitions
// ============================================================================

/** Base parameter interface */
export interface BaseParameter {
  key: string;
  label: string;
  description?: string;
}

/** Numeric parameter with range constraints */
export interface NumericParameter extends BaseParameter {
  type: 'number';
  default: number;
  min: number;
  max: number;
  step: number;
}

/** Color parameter */
export interface ColorParameter extends BaseParameter {
  type: 'color';
  default: string;
}

/** Select parameter with predefined options */
export interface SelectParameter extends BaseParameter {
  type: 'select';
  default: string;
  options: { value: string; label: string }[];
}

/** Boolean toggle parameter */
export interface BooleanParameter extends BaseParameter {
  type: 'boolean';
  default: boolean;
}

/** Union of all parameter types */
export type IndicatorParameter =
  | NumericParameter
  | ColorParameter
  | SelectParameter
  | BooleanParameter;

// ============================================================================
// Output Series Definitions
// ============================================================================

/** Describes a single output series from an indicator */
export interface OutputSeries {
  key: string;
  label: string;
  type: 'line' | 'histogram' | 'area';
  defaultColor: string;
  /** Optional line style: 0=solid, 1=dotted, 2=dashed, 3=large-dashed, 4=sparse-dotted */
  lineStyle?: number;
  lineWidth?: number;
}

// ============================================================================
// Indicator Definition
// ============================================================================

/** Complete indicator definition for the registry */
export interface IndicatorDefinition {
  id: IndicatorId;
  name: string;
  shortName: string;
  description: string;
  category: IndicatorCategory;
  /** Group for organizing in UI (e.g., "Moving Averages", "Momentum", "Volatility") */
  group: string;
  /** Icon name or component key */
  icon?: string;
  /** Parameters configurable by the user */
  parameters: IndicatorParameter[];
  /** Output series produced by this indicator */
  outputs: OutputSeries[];
  /** Minimum data points required for calculation */
  minDataPoints: number;
  /** Reference levels to draw (e.g., RSI overbought/oversold) */
  referenceLines?: {
    value: number;
    label: string;
    color?: string;
    style?: 'solid' | 'dashed' | 'dotted';
  }[];
  /** Value range for the indicator (for panel scaling) */
  valueRange?: {
    min?: number;
    max?: number;
    symmetric?: boolean; // e.g., for oscillators centered at 0
  };
}

// ============================================================================
// Instance Types (for active indicators)
// ============================================================================

/** Configuration values for an active indicator instance */
export type IndicatorConfig = Record<string, number | string | boolean>;

/** An active indicator instance with unique ID and configuration */
export interface IndicatorInstance {
  /** Unique instance ID (allows multiple of same type) */
  instanceId: string;
  /** The indicator type ID */
  indicatorId: IndicatorId;
  /** User-configured parameter values */
  config: IndicatorConfig;
  /** Whether the indicator is visible */
  visible: boolean;
  /** Custom label override */
  label?: string;
}

// ============================================================================
// Calculation Output Types
// ============================================================================

/** Base output for line-type indicators */
export interface LineIndicatorOutput {
  type: 'line';
  data: LineData<Time>[];
}

/** Output for histogram-type indicators */
export interface HistogramIndicatorOutput {
  type: 'histogram';
  data: HistogramData<Time>[];
}

/** Output for band-type indicators (like Bollinger Bands) */
export interface BandIndicatorOutput {
  type: 'band';
  upper: LineData<Time>[];
  middle: LineData<Time>[];
  lower: LineData<Time>[];
}

/** Output for multi-line indicators (like MACD, Stochastic) */
export interface MultiLineIndicatorOutput {
  type: 'multi-line';
  series: Record<string, LineData<Time>[] | HistogramData<Time>[]>;
}

/** Union of all indicator calculation outputs */
export type IndicatorOutput =
  | LineIndicatorOutput
  | HistogramIndicatorOutput
  | BandIndicatorOutput
  | MultiLineIndicatorOutput;

// ============================================================================
// Calculation Input Types
// ============================================================================

/** OHLCV data point for calculations */
export interface OHLCVData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

/** Signature for indicator calculation functions */
export type IndicatorCalculator = (
  data: OHLCVData[],
  config: IndicatorConfig
) => IndicatorOutput;

/**
 * Indicator Module - the default export shape from each indicator file
 * Combines definition and calculate function in one module
 */
export interface IndicatorModule {
  definition: IndicatorDefinition;
  calculate: IndicatorCalculator;
}

// ============================================================================
// UI Helper Types
// ============================================================================

/** Grouped indicators for UI display */
export interface IndicatorGroup {
  name: string;
  category: IndicatorCategory;
  indicators: IndicatorDefinition[];
}

/** Indicator with calculated output attached (for rendering) */
export interface CalculatedIndicator {
  instance: IndicatorInstance;
  definition: IndicatorDefinition;
  output: IndicatorOutput | null;
  error?: string;
}
