import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChartSync } from '../useChartSync';
import type {
  ITimeScaleApi,
  Time,
  IRange,
  TimeRangeChangeEventHandler,
} from 'lightweight-charts';

function makeTimeScale() {
  const api: Partial<ITimeScaleApi<Time>> & {
    _visibleRange: IRange<Time> | null;
    _handler?: TimeRangeChangeEventHandler<Time>;
    subscribeVisibleTimeRangeChange?: (
      handler: TimeRangeChangeEventHandler<Time>
    ) => void;
    unsubscribeVisibleTimeRangeChange?: (
      handler: TimeRangeChangeEventHandler<Time>
    ) => void;
  } = {
    _visibleRange: { from: 1 as unknown as Time, to: 2 as unknown as Time },
    setVisibleRange: vi.fn(),
    getVisibleRange: vi.fn(function (this: {
      _visibleRange: IRange<Time> | null;
    }) {
      return this._visibleRange;
    }) as () => IRange<Time> | null,
  };
  api.subscribeVisibleTimeRangeChange = (
    handler: TimeRangeChangeEventHandler<Time>
  ) => {
    api._handler = handler;
  };
  api.unsubscribeVisibleTimeRangeChange = () => {
    api._handler = undefined;
  };
  return api as ITimeScaleApi<Time> & {
    _handler?: TimeRangeChangeEventHandler<Time>;
    _visibleRange: IRange<Time> | null;
  };
}

describe('useChartSync', () => {
  it('syncs visible ranges across charts when called', () => {
    const main = makeTimeScale();
    const indicator1 = makeTimeScale();
    const indicator2 = makeTimeScale();

    const indicatorTimeScaleRefs = new Map<string, ITimeScaleApi<Time>>();
    indicatorTimeScaleRefs.set('rsi-1', indicator1);
    indicatorTimeScaleRefs.set('macd-1', indicator2);

    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useChartSync({
        mainChartRef: { current: main },
        indicatorTimeScaleRefs: { current: indicatorTimeScaleRefs },
      })
    );

    act(() => {
      result.current.syncCharts();
    });

    expect(indicator1.setVisibleRange).toHaveBeenCalledWith(
      main.getVisibleRange()
    );
    expect(indicator2.setVisibleRange).toHaveBeenCalledWith(
      main.getVisibleRange()
    );

    // Simulate visible range change on main timescale
    main._visibleRange = {
      from: 5 as unknown as Time,
      to: 10 as unknown as Time,
    };
    act(() => {
      // Let the hook subscribe after its debounce
      vi.runOnlyPendingTimers();
      main._handler?.(main.getVisibleRange()!);
    });
    expect(indicator1.setVisibleRange).toHaveBeenLastCalledWith({
      from: 5,
      to: 10,
    });
    expect(indicator2.setVisibleRange).toHaveBeenLastCalledWith({
      from: 5,
      to: 10,
    });
  });

  it('works with empty indicator refs', () => {
    const main = makeTimeScale();

    const indicatorTimeScaleRefs = new Map<string, ITimeScaleApi<Time>>();

    vi.useFakeTimers();
    const { result } = renderHook(() =>
      useChartSync({
        mainChartRef: { current: main },
        indicatorTimeScaleRefs: { current: indicatorTimeScaleRefs },
      })
    );

    act(() => {
      result.current.syncCharts();
    });

    // Should not throw even with empty indicator refs
    expect(main.getVisibleRange).toHaveBeenCalled();
  });
});
