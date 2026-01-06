import { useEffect, useMemo, useRef } from 'react';
import type {
  Time,
  BarData,
  LineData,
  HistogramData,
} from 'lightweight-charts';
import { useAppDispatch } from 'src/app/hooks';
import {
  setReplayStep,
  setReplayPlaying,
  setReplayAnimationProgress,
  setReplayTotalSteps,
} from '../graphSlice';
import { useReplayController } from './useReplayController';
import { formatDate } from '@/lib/functions';

interface UseReplayEngineProps {
  seriesData: (BarData<Time> | LineData<Time>)[];
  volumeData: HistogramData<Time>[];
}

const formatReplayTimeLabel = (timeValue?: Time) => {
  if (typeof timeValue === 'number') {
    const date = new Date(timeValue * 1000);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    };
    return date.toLocaleString(undefined, options);
  }
  if (typeof timeValue === 'string') {
    const timestamp = formatDate(timeValue);
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }
  if (timeValue && typeof timeValue === 'object' && 'year' in timeValue) {
    const { year, month, day } = timeValue as {
      year: number;
      month: number;
      day: number;
    };
    const date = new Date(year, (month ?? 1) - 1, day ?? 1);
    return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString();
  }
  return undefined;
};

export function useReplayEngine({
  seriesData,
  volumeData,
}: UseReplayEngineProps) {
  const dispatch = useAppDispatch();

  const {
    enabled: isReplayEnabled,
    playing: isReplayPlaying,
    speed: replaySpeed,
    currentStep: replayStep,
    totalSteps: replayTotalSteps,
    animate: isReplayAnimate,
    animationProgress,
  } = useReplayController();

  const totalSeriesCount = seriesData.length;
  const prevSeriesLengthRef = useRef(seriesData.length);
  const prevReplayEnabledRef = useRef(isReplayEnabled);

  // Sync total steps
  useEffect(() => {
    if (replayTotalSteps !== totalSeriesCount) {
      dispatch(setReplayTotalSteps(totalSeriesCount));
    }
  }, [dispatch, replayTotalSteps, totalSeriesCount]);

  // Handle Enable/Disable toggles
  useEffect(() => {
    if (prevReplayEnabledRef.current !== isReplayEnabled) {
      if (isReplayEnabled) {
        if (replayStep >= totalSeriesCount) {
          dispatch(setReplayStep(totalSeriesCount > 1 ? 1 : totalSeriesCount));
        }
        dispatch(setReplayPlaying(false));
      } else {
        dispatch(setReplayStep(totalSeriesCount));
        dispatch(setReplayPlaying(false));
      }
    }
    prevReplayEnabledRef.current = isReplayEnabled;
  }, [dispatch, isReplayEnabled, totalSeriesCount, replayStep]);

  // Handle new data arrival
  useEffect(() => {
    const previousLength = prevSeriesLengthRef.current;
    if (previousLength === totalSeriesCount) return;

    if (isReplayEnabled) {
      const delta = totalSeriesCount - previousLength;
      if (totalSeriesCount === 0) {
        dispatch(setReplayStep(0));
      } else if (delta > 0) {
        dispatch(setReplayStep(Math.min(replayStep + delta, totalSeriesCount)));
      } else {
        dispatch(setReplayStep(Math.min(replayStep, totalSeriesCount)));
      }
    } else {
      dispatch(setReplayStep(totalSeriesCount));
    }

    prevSeriesLengthRef.current = totalSeriesCount;
  }, [dispatch, totalSeriesCount, isReplayEnabled, replayStep]);

  // The Animation Loop
  useEffect(() => {
    if (!isReplayEnabled || !isReplayPlaying) return;
    if (totalSeriesCount <= 1) {
      dispatch(setReplayPlaying(false));
      return;
    }
    if (replayStep >= totalSeriesCount) {
      dispatch(setReplayPlaying(false));
      return;
    }

    // If animation is enabled, animate the current candle formation
    if (isReplayAnimate) {
      const baseIntervalMs = Math.max(120, Math.round(800 / replaySpeed));
      const animationFrameMs = 16; // ~60fps
      const totalFrames = Math.max(
        1,
        Math.floor(baseIntervalMs / animationFrameMs)
      );
      let currentFrame = Math.floor(animationProgress * totalFrames);

      const animationTimer = window.setInterval(() => {
        currentFrame++;
        const newProgress = Math.min(1, currentFrame / totalFrames);

        if (newProgress >= 1) {
          window.clearInterval(animationTimer);
          const next = replayStep + 1;
          if (next >= totalSeriesCount) {
            dispatch(setReplayStep(totalSeriesCount));
            dispatch(setReplayPlaying(false));
            dispatch(setReplayAnimationProgress(1));
          } else {
            dispatch(setReplayStep(next));
            dispatch(setReplayAnimationProgress(0));
          }
        } else {
          dispatch(setReplayAnimationProgress(newProgress));
        }
      }, animationFrameMs);

      return () => window.clearInterval(animationTimer);
    }

    // Non-animated mode
    const intervalMs = Math.max(120, Math.round(800 / replaySpeed));
    const timer = window.setInterval(() => {
      const next = replayStep + 1;
      if (next >= totalSeriesCount) {
        window.clearInterval(timer);
        dispatch(setReplayStep(totalSeriesCount));
        dispatch(setReplayPlaying(false));
      } else {
        dispatch(setReplayStep(next));
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    dispatch,
    isReplayEnabled,
    isReplayPlaying,
    isReplayAnimate,
    animationProgress,
    replaySpeed,
    replayStep,
    totalSeriesCount,
  ]);

  // Derived Values

  const effectiveReplayIndex = useMemo(() => {
    if (!isReplayEnabled) return totalSeriesCount;
    if (totalSeriesCount === 0) return 0;
    return Math.min(Math.max(replayStep, 1), totalSeriesCount);
  }, [isReplayEnabled, replayStep, totalSeriesCount]);

  const indicatorDisplayIndex = useMemo(() => {
    if (!isReplayEnabled) return undefined;
    if (isReplayAnimate && animationProgress > 0 && animationProgress < 1) {
      return Math.max(1, effectiveReplayIndex - 1);
    }
    return effectiveReplayIndex;
  }, [
    isReplayEnabled,
    isReplayAnimate,
    animationProgress,
    effectiveReplayIndex,
  ]);

  const displayedSeriesData = useMemo(
    () =>
      isReplayEnabled ? seriesData.slice(0, effectiveReplayIndex) : seriesData,
    [isReplayEnabled, seriesData, effectiveReplayIndex]
  );

  const animatedSeriesData = useMemo(() => {
    if (!isReplayEnabled || !isReplayAnimate || animationProgress >= 1) {
      return displayedSeriesData;
    }

    if (displayedSeriesData.length === 0) {
      return displayedSeriesData;
    }

    const lastCandle = displayedSeriesData[displayedSeriesData.length - 1];

    if (!('open' in lastCandle)) {
      return displayedSeriesData;
    }

    const { open, high, low, close, time } = lastCandle as {
      open: number;
      high: number;
      low: number;
      close: number;
      time: Time;
    };

    const isBullish = close >= open;
    const progress = animationProgress;

    let animatedHigh = open;
    let animatedLow = open;
    let animatedClose = open;

    if (isBullish) {
      if (progress < 0.3) {
        const phaseProgress = progress / 0.3;
        animatedLow = open + (low - open) * phaseProgress;
        animatedHigh = open;
        animatedClose = open + (low - open) * phaseProgress * 0.5;
      } else if (progress < 0.7) {
        const phaseProgress = (progress - 0.3) / 0.4;
        animatedLow = low;
        animatedHigh = open + (high - open) * phaseProgress;
        animatedClose = low + (high - low) * phaseProgress;
      } else {
        const phaseProgress = (progress - 0.7) / 0.3;
        animatedLow = low;
        animatedHigh = high;
        animatedClose = high + (close - high) * phaseProgress;
      }
    } else {
      if (progress < 0.3) {
        const phaseProgress = progress / 0.3;
        animatedHigh = open + (high - open) * phaseProgress;
        animatedLow = open;
        animatedClose = open + (high - open) * phaseProgress * 0.5;
      } else if (progress < 0.7) {
        const phaseProgress = (progress - 0.3) / 0.4;
        animatedHigh = high;
        animatedLow = open + (low - open) * phaseProgress;
        animatedClose = high + (low - high) * phaseProgress;
      } else {
        const phaseProgress = (progress - 0.7) / 0.3;
        animatedHigh = high;
        animatedLow = low;
        animatedClose = low + (close - low) * phaseProgress;
      }
    }

    const animatedCandle = {
      time,
      open,
      high: animatedHigh,
      low: animatedLow,
      close: animatedClose,
    };

    return [...displayedSeriesData.slice(0, -1), animatedCandle];
  }, [
    displayedSeriesData,
    isReplayEnabled,
    isReplayAnimate,
    animationProgress,
  ]);

  const displayedVolumeData = useMemo(
    () =>
      isReplayEnabled ? volumeData.slice(0, effectiveReplayIndex) : volumeData,
    [isReplayEnabled, volumeData, effectiveReplayIndex]
  );

  const currentReplayLabel = useMemo(() => {
    if (!isReplayEnabled || animatedSeriesData.length === 0) return undefined;
    const lastPoint = animatedSeriesData[animatedSeriesData.length - 1] as {
      time?: Time;
    };
    return formatReplayTimeLabel(lastPoint?.time);
  }, [animatedSeriesData, isReplayEnabled]);

  const shouldRenderReplayControls = isReplayEnabled && totalSeriesCount > 0;

  return {
    isReplayEnabled,
    isReplayPlaying,
    replaySpeed,
    replayStep,
    isReplayAnimate,
    effectiveReplayIndex,
    indicatorDisplayIndex,
    animatedSeriesData,
    displayedVolumeData,
    currentReplayLabel,
    shouldRenderReplayControls,
  };
}
