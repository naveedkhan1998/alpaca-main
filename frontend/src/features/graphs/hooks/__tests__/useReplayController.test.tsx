import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useReplayController } from '../useReplayController';
import graphReducer from '../../graphSlice';

// Test harness component
function TestHarness({
  onHook,
}: {
  onHook: (hook: ReturnType<typeof useReplayController>) => void;
}) {
  const hook = useReplayController();
  onHook(hook);
  return null;
}

function renderWithStore(initialState = {}) {
  const fullInitialState = {
    timeframe: 1,
    chartType: 'Candlestick' as const,
    seriesType: 'ohlc' as const,
    showVolume: true,
    autoRefresh: true,
    showControls: true,
    isFullscreen: false,
    activeIndicators: [],
    indicatorConfigs: {
      RSI: { period: 14, overbought: 70, oversold: 30, color: '#F59E0B' },
      ATR: { period: 14, color: '#3B82F6' },
      EMA: { period: 20, color: '#FBBF24' },
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
    },
    replay: {
      enabled: false,
      playing: false,
      speed: 1,
      currentStep: 0,
      totalSteps: 0,
    },
    ...initialState,
  };

  const store = configureStore({
    reducer: { graph: graphReducer },
    preloadedState: { graph: fullInitialState },
  });

  let hookResult: ReturnType<typeof useReplayController> | null = null;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  render(
    <TestHarness
      onHook={hook => {
        hookResult = hook;
      }}
    />,
    { wrapper }
  );

  return { store, hook: hookResult! };
}

describe('useReplayController', () => {
  beforeEach(() => {
    // Clear any previous state
  });

  describe('initial state', () => {
    it('returns default replay state', () => {
      const { hook } = renderWithStore();

      expect(hook.enabled).toBe(false);
      expect(hook.playing).toBe(false);
      expect(hook.speed).toBe(1);
      expect(hook.currentStep).toBe(0);
      expect(hook.totalSteps).toBe(0);
    });
  });

  describe('handleReplayToggle', () => {
    it('enables replay when called with true', () => {
      const { store, hook } = renderWithStore();

      act(() => {
        hook.handleReplayToggle(true);
      });

      const state = store.getState().graph.replay;
      expect(state.enabled).toBe(true);
    });

    it('disables replay and stops playing when called with false', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: true,
          playing: true,
          speed: 1,
          currentStep: 5,
          totalSteps: 10,
        },
      });

      act(() => {
        hook.handleReplayToggle(false);
      });

      const state = store.getState().graph.replay;
      expect(state.enabled).toBe(false);
      expect(state.playing).toBe(false);
      expect(state.currentStep).toBe(10); // Should be set to totalSteps
    });
  });

  describe('handleReplayPlayPause', () => {
    it('does nothing when replay is not enabled', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: false,
          playing: false,
          speed: 1,
          currentStep: 0,
          totalSteps: 10,
        },
      });

      act(() => {
        hook.handleReplayPlayPause();
      });

      const state = store.getState().graph.replay;
      expect(state.playing).toBe(false); // Should remain false
    });

    it('stops playing when totalSteps <= 1', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: true,
          playing: true,
          speed: 1,
          currentStep: 1,
          totalSteps: 1,
        },
      });

      act(() => {
        hook.handleReplayPlayPause();
      });

      const state = store.getState().graph.replay;
      expect(state.playing).toBe(false);
    });

    it('restarts from beginning when trying to play at the end', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: true,
          playing: false,
          speed: 1,
          currentStep: 10,
          totalSteps: 10,
        },
      });

      act(() => {
        hook.handleReplayPlayPause();
      });

      const state = store.getState().graph.replay;
      expect(state.playing).toBe(true);
      expect(state.currentStep).toBe(1); // Should restart from beginning
    });

    it('starts playing when called while paused', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: true,
          playing: false,
          speed: 1,
          currentStep: 5,
          totalSteps: 10,
        },
      });

      act(() => {
        hook.handleReplayPlayPause();
      });

      const state = store.getState().graph.replay;
      expect(state.playing).toBe(true);
    });

    it('pauses playing when called while playing', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: true,
          playing: true,
          speed: 1,
          currentStep: 5,
          totalSteps: 10,
        },
      });

      act(() => {
        hook.handleReplayPlayPause();
      });

      const state = store.getState().graph.replay;
      expect(state.playing).toBe(false);
    });
  });

  describe('handleReplayRestart', () => {
    it('stops playing and sets step to 1 when totalSteps > 1', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: true,
          playing: true,
          speed: 1,
          currentStep: 8,
          totalSteps: 10,
        },
      });

      act(() => {
        hook.handleReplayRestart();
      });

      const state = store.getState().graph.replay;
      expect(state.playing).toBe(false);
      expect(state.currentStep).toBe(1);
    });

    it('stops playing and sets step to totalSteps when totalSteps <= 1', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: true,
          playing: true,
          speed: 1,
          currentStep: 1,
          totalSteps: 1,
        },
      });

      act(() => {
        hook.handleReplayRestart();
      });

      const state = store.getState().graph.replay;
      expect(state.playing).toBe(false);
      expect(state.currentStep).toBe(1);
    });
  });

  describe('handleReplaySeek', () => {
    it('sets step to 0 when totalSteps is 0', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: true,
          playing: false,
          speed: 1,
          currentStep: 5,
          totalSteps: 0,
        },
      });

      act(() => {
        hook.handleReplaySeek(3);
      });

      const state = store.getState().graph.replay;
      expect(state.currentStep).toBe(0);
    });

    it('clamps step value between 1 and totalSteps', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: true,
          playing: false,
          speed: 1,
          currentStep: 5,
          totalSteps: 10,
        },
      });

      // Test clamping to minimum
      act(() => {
        hook.handleReplaySeek(0);
      });
      let state = store.getState().graph.replay;
      expect(state.currentStep).toBe(1);

      // Test clamping to maximum
      act(() => {
        hook.handleReplaySeek(15);
      });
      state = store.getState().graph.replay;
      expect(state.currentStep).toBe(10);

      // Test valid value
      act(() => {
        hook.handleReplaySeek(7);
      });
      state = store.getState().graph.replay;
      expect(state.currentStep).toBe(7);
    });

    it('rounds decimal values', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: true,
          playing: false,
          speed: 1,
          currentStep: 5,
          totalSteps: 10,
        },
      });

      act(() => {
        hook.handleReplaySeek(7.8);
      });

      const state = store.getState().graph.replay;
      expect(state.currentStep).toBe(8);
    });
  });

  describe('handleReplaySpeedChange', () => {
    it('updates the replay speed', () => {
      const { store, hook } = renderWithStore({
        replay: {
          enabled: true,
          playing: false,
          speed: 1,
          currentStep: 5,
          totalSteps: 10,
        },
      });

      act(() => {
        hook.handleReplaySpeedChange(2);
      });

      const state = store.getState().graph.replay;
      expect(state.speed).toBe(2);
    });
  });
});
