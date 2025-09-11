import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChartSync } from '../useChartSync';
import type { ITimeScaleApi, Time } from 'lightweight-charts';

function makeTimeScale() {
  const api: Partial<ITimeScaleApi<Time>> & {
    _visibleRange: unknown;
    _handler?: () => void;
    subscribeVisibleTimeRangeChange?: (cb: () => void) => void;
    unsubscribeVisibleTimeRangeChange?: (cb: () => void) => void;
  } = {
    _visibleRange: { from: 1, to: 2 },
    setVisibleRange: vi.fn(),
    getVisibleRange: vi.fn(function (this: { _visibleRange: unknown }) {
      return this._visibleRange;
    }) as () => unknown,
  };
  api.subscribeVisibleTimeRangeChange = (cb: () => void) => {
    api._handler = cb;
  };
  api.unsubscribeVisibleTimeRangeChange = () => {
    api._handler = undefined;
  };
  return api as ITimeScaleApi<Time> & {
    _handler?: () => void;
    _visibleRange: unknown;
  };
}

describe('useChartSync', () => {
  it('syncs visible ranges across charts when called', () => {
    const main = makeTimeScale();
    const vol = makeTimeScale();
    const ind = makeTimeScale();

    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useChartSync({
        mainChartRef: { current: main },
        volumeChartRef: { current: vol },
        indicatorChartRef: { current: ind },
        shouldShowVolume: true,
        activeIndicators: ['RSI'],
      })
    );

    act(() => {
      result.current.syncCharts();
    });

    expect(vol.setVisibleRange).toHaveBeenCalledWith(main.getVisibleRange());
    expect(ind.setVisibleRange).toHaveBeenCalledWith(main.getVisibleRange());

    // Simulate visible range change on main timescale
    main._visibleRange = { from: 5, to: 10 };
    act(() => {
      // Let the hook subscribe after its debounce
      vi.runOnlyPendingTimers();
      main._handler?.();
    });
    expect(vol.setVisibleRange).toHaveBeenLastCalledWith({ from: 5, to: 10 });
    expect(ind.setVisibleRange).toHaveBeenLastCalledWith({ from: 5, to: 10 });
  });
});
