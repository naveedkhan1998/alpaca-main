import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SeriesType } from 'lightweight-charts';
import { RootState } from 'src/app/store';
import type {
  IndicatorId,
  IndicatorInstance,
  IndicatorConfig,
} from './lib/indicators/types';

// ============================================================================
// Replay State
// ============================================================================

interface ReplayState {
  enabled: boolean;
  playing: boolean;
  speed: number;
  currentStep: number;
  totalSteps: number;
  animate: boolean;
  animationProgress: number; // 0-1 progress of current candle animation
}

// ============================================================================
// Graph State
// ============================================================================

interface GraphState {
  timeframe: number;
  chartType: SeriesType;
  seriesType: 'ohlc' | 'price' | 'volume';
  showVolume: boolean;
  autoRefresh: boolean;
  showControls: boolean;
  isFullscreen: boolean;

  // Indicator instances (new system)
  indicatorInstances: IndicatorInstance[];

  replay: ReplayState;
}

const initialState: GraphState = {
  timeframe: 1,
  chartType: 'Candlestick',
  seriesType: 'ohlc',
  showVolume: true,
  autoRefresh: true,
  showControls: true,
  isFullscreen: false,

  indicatorInstances: [],

  replay: {
    enabled: false,
    playing: false,
    speed: 1,
    currentStep: 0,
    totalSteps: 0,
    animate: false,
    animationProgress: 1,
  },
};

// ============================================================================
// Slice Definition
// ============================================================================

export const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
    // Chart settings
    setTimeframe: (state, action: PayloadAction<number>) => {
      state.timeframe = action.payload;
    },
    setChartType: (state, action: PayloadAction<SeriesType>) => {
      state.chartType = action.payload;
      if (['Candlestick', 'Bar'].includes(action.payload)) {
        state.seriesType = 'ohlc';
      } else if (['Area', 'Baseline', 'Line'].includes(action.payload)) {
        state.seriesType = 'price';
      }
    },
    setShowVolume: (state, action: PayloadAction<boolean>) => {
      state.showVolume = action.payload;
    },
    setAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.autoRefresh = action.payload;
    },
    setShowControls: (state, action: PayloadAction<boolean>) => {
      state.showControls = action.payload;
    },
    setIsFullscreen: (state, action: PayloadAction<boolean>) => {
      state.isFullscreen = action.payload;
    },

    // ========================================================================
    // Indicator System Actions
    // ========================================================================

    /** Add a new indicator instance */
    addIndicatorInstance: (state, action: PayloadAction<IndicatorInstance>) => {
      // Prevent duplicate instance IDs
      if (
        !state.indicatorInstances.some(
          inst => inst.instanceId === action.payload.instanceId
        )
      ) {
        state.indicatorInstances.push(action.payload);
      }
    },

    /** Remove an indicator instance by its unique ID */
    removeIndicatorInstance: (state, action: PayloadAction<string>) => {
      state.indicatorInstances = state.indicatorInstances.filter(
        inst => inst.instanceId !== action.payload
      );
    },

    /** Update configuration of an existing indicator instance */
    updateIndicatorInstanceConfig: (
      state,
      action: PayloadAction<{
        instanceId: string;
        config: Partial<IndicatorConfig>;
      }>
    ) => {
      const { instanceId, config } = action.payload;
      const instance = state.indicatorInstances.find(
        (inst: IndicatorInstance) => inst.instanceId === instanceId
      );
      if (instance) {
        instance.config = { ...instance.config, ...config } as IndicatorConfig;
      }
    },

    /** Toggle visibility of an indicator instance */
    toggleIndicatorVisibility: (state, action: PayloadAction<string>) => {
      const instance = state.indicatorInstances.find(
        inst => inst.instanceId === action.payload
      );
      if (instance) {
        instance.visible = !instance.visible;
      }
    },

    /** Update the label of an indicator instance */
    updateIndicatorLabel: (
      state,
      action: PayloadAction<{ instanceId: string; label: string }>
    ) => {
      const instance = state.indicatorInstances.find(
        inst => inst.instanceId === action.payload.instanceId
      );
      if (instance) {
        instance.label = action.payload.label;
      }
    },

    /** Remove all instances of a specific indicator type */
    removeAllInstancesOfType: (state, action: PayloadAction<IndicatorId>) => {
      state.indicatorInstances = state.indicatorInstances.filter(
        inst => inst.indicatorId !== action.payload
      );
    },

    /** Clear all indicator instances */
    clearAllIndicators: state => {
      state.indicatorInstances = [];
    },

    // ========================================================================
    // Replay Actions
    // ========================================================================
    setReplayEnabled: (state, action: PayloadAction<boolean>) => {
      state.replay.enabled = action.payload;
      if (!action.payload) {
        state.replay.playing = false;
        state.replay.currentStep = state.replay.totalSteps;
      }
    },
    setReplayPlaying: (state, action: PayloadAction<boolean>) => {
      state.replay.playing = action.payload;
    },
    setReplaySpeed: (state, action: PayloadAction<number>) => {
      state.replay.speed = action.payload;
    },
    setReplayStep: (state, action: PayloadAction<number>) => {
      state.replay.currentStep = action.payload;
    },
    setReplayTotalSteps: (state, action: PayloadAction<number>) => {
      state.replay.totalSteps = action.payload;
      if (!state.replay.enabled) {
        state.replay.currentStep = action.payload;
      } else {
        state.replay.currentStep = Math.min(
          state.replay.currentStep,
          action.payload
        );
      }
    },
    setReplayAnimate: (state, action: PayloadAction<boolean>) => {
      state.replay.animate = action.payload;
      if (action.payload) {
        state.replay.animationProgress = 1; // Reset to complete on toggle
      }
    },
    setReplayAnimationProgress: (state, action: PayloadAction<number>) => {
      state.replay.animationProgress = Math.max(0, Math.min(1, action.payload));
    },
  },
});

// ============================================================================
// Action Exports
// ============================================================================

export const {
  // Chart settings
  setTimeframe,
  setChartType,
  setShowVolume,
  setAutoRefresh,
  setShowControls,
  setIsFullscreen,

  // Indicator system
  addIndicatorInstance,
  removeIndicatorInstance,
  updateIndicatorInstanceConfig,
  toggleIndicatorVisibility,
  updateIndicatorLabel,
  removeAllInstancesOfType,
  clearAllIndicators,

  // Replay
  setReplayEnabled,
  setReplayPlaying,
  setReplaySpeed,
  setReplayStep,
  setReplayTotalSteps,
  setReplayAnimate,
  setReplayAnimationProgress,
} = graphSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

// Chart settings
export const selectTimeframe = (state: RootState) => state.graph.timeframe;
export const selectChartType = (state: RootState) => state.graph.chartType;
export const selectSeriesType = (state: RootState) => state.graph.seriesType;
export const selectShowVolume = (state: RootState) => state.graph.showVolume;
export const selectAutoRefresh = (state: RootState) => state.graph.autoRefresh;
export const selectShowControls = (state: RootState) =>
  state.graph.showControls;
export const selectIsFullscreen = (state: RootState) =>
  state.graph.isFullscreen;

// Indicator system
export const selectIndicatorInstances = (state: RootState): IndicatorInstance[] =>
  state.graph.indicatorInstances;

export const selectIndicatorInstanceById =
  (instanceId: string) =>
  (state: RootState): IndicatorInstance | undefined =>
    state.graph.indicatorInstances.find(
      (inst: IndicatorInstance) => inst.instanceId === instanceId
    );

export const selectIndicatorInstancesByType =
  (indicatorId: IndicatorId) =>
  (state: RootState): IndicatorInstance[] =>
    state.graph.indicatorInstances.filter(
      (inst: IndicatorInstance) => inst.indicatorId === indicatorId
    );

export const selectVisibleIndicators = (state: RootState): IndicatorInstance[] =>
  state.graph.indicatorInstances.filter((inst: IndicatorInstance) => inst.visible);

export const selectHasIndicatorOfType =
  (indicatorId: IndicatorId) =>
  (state: RootState): boolean =>
    state.graph.indicatorInstances.some(
      (inst: IndicatorInstance) => inst.indicatorId === indicatorId
    );

// Replay
export const selectReplayEnabled = (state: RootState) =>
  state.graph.replay.enabled;
export const selectReplayPlaying = (state: RootState) =>
  state.graph.replay.playing;
export const selectReplaySpeed = (state: RootState) => state.graph.replay.speed;
export const selectReplayStep = (state: RootState) =>
  state.graph.replay.currentStep;
export const selectReplayTotalSteps = (state: RootState) =>
  state.graph.replay.totalSteps;
export const selectReplayAnimate = (state: RootState) =>
  state.graph.replay.animate;
export const selectReplayAnimationProgress = (state: RootState) =>
  state.graph.replay.animationProgress;

export default graphSlice.reducer;
