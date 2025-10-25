import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SeriesType } from 'lightweight-charts';
import { RootState } from 'src/app/store';

// Indicator configuration types
export interface RSIConfig {
  period: number;
  overbought: number;
  oversold: number;
  color: string;
}

export interface ATRConfig {
  period: number;
  color: string;
}

export interface EMAConfig {
  period: number;
  color: string;
}

export interface BollingerBandsConfig {
  period: number;
  stdDev: number;
  upperColor: string;
  middleColor: string;
  lowerColor: string;
}

export interface MACDConfig {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  macdColor: string;
  signalColor: string;
  histogramColor: string;
}

export type IndicatorConfig = {
  RSI: RSIConfig;
  ATR: ATRConfig;
  EMA: EMAConfig;
  BollingerBands: BollingerBandsConfig;
  MACD: MACDConfig;
};

// Default indicator configurations
export const defaultIndicatorConfigs: IndicatorConfig = {
  RSI: {
    period: 14,
    overbought: 70,
    oversold: 30,
    color: '#F59E0B',
  },
  ATR: {
    period: 14,
    color: '#3B82F6',
  },
  EMA: {
    period: 20,
    color: '#FBBF24',
  },
  BollingerBands: {
    period: 20,
    stdDev: 2,
    upperColor: '#F59E0B',
    middleColor: '#3B82F6',
    lowerColor: '#EF4444',
  },
  MACD: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    macdColor: '#3B82F6',
    signalColor: '#EF4444',
    histogramColor: '#8B5CF6',
  },
};

interface ReplayState {
  enabled: boolean;
  playing: boolean;
  speed: number;
  currentStep: number;
  totalSteps: number;
}

interface GraphState {
  timeframe: number;
  chartType: SeriesType;
  seriesType: 'ohlc' | 'price' | 'volume';
  showVolume: boolean;
  autoRefresh: boolean;
  showControls: boolean;
  isFullscreen: boolean;
  activeIndicators: string[];
  indicatorConfigs: IndicatorConfig;
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
  activeIndicators: [],
  indicatorConfigs: defaultIndicatorConfigs,
  replay: {
    enabled: false,
    playing: false,
    speed: 1,
    currentStep: 0,
    totalSteps: 0,
  },
};

export const graphSlice = createSlice({
  name: 'graph',
  initialState,
  reducers: {
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
    addIndicator: (state, action: PayloadAction<string>) => {
      if (!state.activeIndicators.includes(action.payload)) {
        state.activeIndicators.push(action.payload);
      }
    },
    removeIndicator: (state, action: PayloadAction<string>) => {
      state.activeIndicators = state.activeIndicators.filter(
        indicator => indicator !== action.payload
      );
    },
    updateIndicatorConfig: <K extends keyof IndicatorConfig>(
      state: GraphState,
      action: PayloadAction<{
        indicator: K;
        config: Partial<IndicatorConfig[K]>;
      }>
    ) => {
      const { indicator, config } = action.payload;
      state.indicatorConfigs[indicator] = {
        ...state.indicatorConfigs[indicator],
        ...config,
      } as IndicatorConfig[K];
    },
    resetIndicatorConfig: <K extends keyof IndicatorConfig>(
      state: GraphState,
      action: PayloadAction<K>
    ) => {
      state.indicatorConfigs[action.payload] =
        defaultIndicatorConfigs[action.payload];
    },
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
  },
});

export const {
  setTimeframe,
  setChartType,
  setShowVolume,
  setAutoRefresh,
  setShowControls,
  setIsFullscreen,
  addIndicator,
  removeIndicator,
  updateIndicatorConfig,
  resetIndicatorConfig,
  setReplayEnabled,
  setReplayPlaying,
  setReplaySpeed,
  setReplayStep,
  setReplayTotalSteps,
} = graphSlice.actions;

export const selectTimeframe = (state: RootState) => state.graph.timeframe;
export const selectChartType = (state: RootState) => state.graph.chartType;
export const selectSeriesType = (state: RootState) => state.graph.seriesType;
export const selectShowVolume = (state: RootState) => state.graph.showVolume;
export const selectAutoRefresh = (state: RootState) => state.graph.autoRefresh;
export const selectShowControls = (state: RootState) =>
  state.graph.showControls;
export const selectIsFullscreen = (state: RootState) =>
  state.graph.isFullscreen;
export const selectActiveIndicators = (state: RootState) =>
  state.graph.activeIndicators;
export const selectIndicatorConfigs = (state: RootState) =>
  state.graph.indicatorConfigs;
export const selectReplayEnabled = (state: RootState) =>
  state.graph.replay.enabled;
export const selectReplayPlaying = (state: RootState) =>
  state.graph.replay.playing;
export const selectReplaySpeed = (state: RootState) => state.graph.replay.speed;
export const selectReplayStep = (state: RootState) =>
  state.graph.replay.currentStep;
export const selectReplayTotalSteps = (state: RootState) =>
  state.graph.replay.totalSteps;
export const selectIndicatorConfig =
  <K extends keyof IndicatorConfig>(indicator: K) =>
  (state: RootState) =>
    state.graph.indicatorConfigs[indicator];

export default graphSlice.reducer;
