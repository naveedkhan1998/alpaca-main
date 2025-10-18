# Indicator Configuration System

## Overview
The indicator configuration system allows users to customize technical indicator parameters in real-time. All indicator configurations are stored in Redux and applied dynamically to chart calculations.

## Architecture

### State Management (graphSlice.ts)
- **Location**: `src/features/graphs/graphSlice.ts`
- **Exports**:
  - `IndicatorConfig` types: `RSIConfig`, `ATRConfig`, `EMAConfig`, `BollingerBandsConfig`, `MACDConfig`
  - `defaultIndicatorConfigs`: Default parameters for each indicator
  - `updateIndicatorConfig`: Action to update a specific indicator's configuration
  - `resetIndicatorConfig`: Action to reset an indicator to default values
  - `selectIndicatorConfigs`: Selector to get all indicator configs
  - `selectIndicatorConfig`: Selector to get a specific indicator's config

### UI Components

#### IndicatorSettingsDialog
- **Location**: `src/features/graphs/components/IndicatorSettingsDialog.tsx`
- **Purpose**: Modal dialog for configuring indicator parameters
- **Features**:
  - Dynamic forms based on indicator type
  - Real-time sliders for numeric values
  - Color pickers for line colors
  - Reset to default button
  - Live preview (changes apply on save)

#### IndicatorsPanel
- **Location**: `src/features/graphs/components/controls/IndicatorsPanel.tsx`
- **Purpose**: Panel for toggling indicators and accessing settings
- **Features**:
  - Settings button (gear icon) next to each indicator
  - Toggle switch for enabling/disabling indicators
  - Opens IndicatorSettingsDialog when settings clicked

### Data Flow

1. **Configuration Storage**: Redux `graphSlice` stores all indicator configs
2. **UI Changes**: User modifies settings in `IndicatorSettingsDialog`
3. **State Update**: `updateIndicatorConfig` action updates Redux state
4. **Selector Usage**: `index.tsx` retrieves configs via `selectIndicatorConfigs`
5. **Hook Integration**: Configs passed to `useDerivedSeries` hook
6. **Calculation**: Hook uses configs to calculate indicator data with custom parameters
7. **Chart Update**: Calculated data rendered on charts with custom colors

## Supported Indicators

### RSI (Relative Strength Index)
- **Parameters**:
  - `period`: Length of calculation window (5-50, default: 14)
  - `overbought`: Upper threshold level (60-90, default: 70)
  - `oversold`: Lower threshold level (10-40, default: 30)
  - `color`: Line color (default: #9333ea)

### ATR (Average True Range)
- **Parameters**:
  - `period`: Length of calculation window (5-50, default: 14)
  - `color`: Line color (default: #f97316)

### EMA (Exponential Moving Average)
- **Parameters**:
  - `period`: Length of calculation window (5-200, default: 20)
  - `color`: Line color (default: #3b82f6)

### Bollinger Bands
- **Parameters**:
  - `period`: Length of calculation window (5-50, default: 20)
  - `stdDev`: Standard deviation multiplier (1-4, default: 2)
  - `upperColor`: Upper band color (default: #ef4444)
  - `middleColor`: Middle band color (default: #3b82f6)
  - `lowerColor`: Lower band color (default: #22c55e)

### MACD (Moving Average Convergence Divergence)
- **Parameters**:
  - `fastPeriod`: Fast EMA period (5-30, default: 12)
  - `slowPeriod`: Slow EMA period (15-50, default: 26)
  - `signalPeriod`: Signal line period (5-20, default: 9)
  - `macdColor`: MACD line color (default: #3b82f6)
  - `signalColor`: Signal line color (default: #f97316)
  - `histogramColor`: Histogram color (default: #6b7280)

## Performance Optimization

### Real-time Updates
The indicator charts use an optimized update strategy:
- **Length Tracking**: `prevRsiLengthRef` and `prevAtrLengthRef` track data array length
- **Smart Updates**:
  - If `data.length` unchanged → Use `update()` method (efficient for real-time)
  - If `data.length` changed → Use `setData()` method (for timeframe changes)
- **Result**: Eliminates unnecessary re-renders during real-time updates

## Usage Example

```typescript
// In a component
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { updateIndicatorConfig, selectIndicatorConfig } from '../graphSlice';

const MyComponent = () => {
  const dispatch = useAppDispatch();
  const rsiConfig = useAppSelector(selectIndicatorConfig('RSI'));

  const handleUpdateRSI = () => {
    dispatch(updateIndicatorConfig({
      indicator: 'RSI',
      config: {
        ...rsiConfig,
        period: 21,
        overbought: 75,
        oversold: 25,
      }
    }));
  };

  return <button onClick={handleUpdateRSI}>Update RSI</button>;
};
```

## Future Enhancements
- [ ] Save custom presets
- [ ] Import/export configurations
- [ ] More indicator types (Stochastic, VWAP, etc.)
- [ ] Multi-indicator templates
- [ ] Indicator alerts based on threshold crossings
