/**
 * Indicator Registry
 *
 * Central registry that dynamically builds from category modules.
 * Each indicator is imported from its respective category folder.
 */

import type {
  IndicatorDefinition,
  IndicatorId,
  IndicatorGroup,
  IndicatorModule,
  IndicatorCalculator,
  IndicatorConfig,
  IndicatorOutput,
  OHLCVData,
} from './types';

// Import all indicator categories
import { movingAverages } from './movingAverages';
import { oscillators } from './oscillators';
import { volatility } from './volatility';
import { volume } from './volume';

// ============================================================================
// Registry Building
// ============================================================================

/** All indicator modules combined */
const ALL_INDICATORS: IndicatorModule[] = [
  ...movingAverages,
  ...oscillators,
  ...volatility,
  ...volume,
];

/** Map of indicator ID to module */
const INDICATOR_MODULES = new Map<IndicatorId, IndicatorModule>();

/** Map of indicator ID to definition */
const INDICATOR_DEFINITIONS = new Map<IndicatorId, IndicatorDefinition>();

// Build the registry
ALL_INDICATORS.forEach(module => {
  const id = module.definition.id;
  INDICATOR_MODULES.set(id, module);
  INDICATOR_DEFINITIONS.set(id, module.definition);
});

// ============================================================================
// Registry Exports
// ============================================================================

/** Get all indicators as an array of definitions */
export function getAllIndicators(): IndicatorDefinition[] {
  return Array.from(INDICATOR_DEFINITIONS.values());
}

/** Get indicator definition by ID */
export function getIndicator(id: IndicatorId): IndicatorDefinition | undefined {
  return INDICATOR_DEFINITIONS.get(id);
}

/** Get indicator module (definition + calculator) by ID */
export function getIndicatorModule(id: IndicatorId): IndicatorModule | undefined {
  return INDICATOR_MODULES.get(id);
}

/** Get calculator function for an indicator */
export function getCalculator(id: IndicatorId): IndicatorCalculator | undefined {
  return INDICATOR_MODULES.get(id)?.calculate;
}

/** Get indicators by category */
export function getIndicatorsByCategory(
  category: 'overlay' | 'panel'
): IndicatorDefinition[] {
  return getAllIndicators().filter(ind => ind.category === category);
}

/** Get indicators grouped by their group property */
export function getIndicatorsGrouped(): IndicatorGroup[] {
  const groups = new Map<string, IndicatorGroup>();

  getAllIndicators().forEach(indicator => {
    const key = `${indicator.category}-${indicator.group}`;
    if (!groups.has(key)) {
      groups.set(key, {
        name: indicator.group,
        category: indicator.category,
        indicators: [],
      });
    }
    groups.get(key)!.indicators.push(indicator);
  });

  // Sort groups: overlay first, then by group name
  return Array.from(groups.values()).sort((a, b) => {
    if (a.category !== b.category) {
      return a.category === 'overlay' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

/** Get default configuration for an indicator */
export function getDefaultConfig(id: IndicatorId): Record<string, unknown> {
  const indicator = getIndicator(id);
  if (!indicator) return {};

  const config: Record<string, unknown> = {};
  indicator.parameters.forEach(param => {
    config[param.key] = param.default;
  });
  return config;
}

/** Validate indicator configuration */
export function validateConfig(
  id: IndicatorId,
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const indicator = getIndicator(id);
  if (!indicator) return { valid: false, errors: ['Unknown indicator'] };

  const errors: string[] = [];

  indicator.parameters.forEach(param => {
    const value = config[param.key];

    if (param.type === 'number') {
      const numValue = value as number;
      if (numValue < param.min || numValue > param.max) {
        errors.push(
          `${param.label} must be between ${param.min} and ${param.max}`
        );
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/** Calculate an indicator by ID */
export function calculateIndicator(
  indicatorId: IndicatorId,
  data: OHLCVData[],
  config: IndicatorConfig
): IndicatorOutput | null {
  const calculator = getCalculator(indicatorId);
  if (!calculator) {
    console.warn(`No calculator found for indicator: ${indicatorId}`);
    return null;
  }
  return calculator(data, config);
}

/**
 * Get the maximum lookback period from a list of indicator instances.
 * This is used to ensure sufficient historical data is available for indicator calculations.
 * Defaults to 200 if no indicators have period parameters.
 */
export function getMaxLookback(instances: { indicatorId: IndicatorId; config: Record<string, unknown> }[]): number {
  let maxPeriod = 0;

  for (const instance of instances) {
    const definition = getIndicator(instance.indicatorId);
    if (!definition) continue;

    // Check each parameter for period-like values
    for (const param of definition.parameters) {
      if (param.type === 'number') {
        const key = param.key.toLowerCase();
        // Look for period, length, or other lookback-related parameters
        if (key.includes('period') || key.includes('length') || key === 'slow' || key === 'fast' || key === 'signal') {
          const value = instance.config[param.key];
          if (typeof value === 'number' && value > maxPeriod) {
            maxPeriod = value;
          }
        }
      }
    }
  }

  // Default to 200 for safety (handles SMA 200 etc.)
  return Math.max(maxPeriod, 200);
}

// Legacy export for backwards compatibility
export const INDICATOR_REGISTRY: Record<IndicatorId, IndicatorDefinition> =
  Object.fromEntries(INDICATOR_DEFINITIONS) as Record<
    IndicatorId,
    IndicatorDefinition
  >;
