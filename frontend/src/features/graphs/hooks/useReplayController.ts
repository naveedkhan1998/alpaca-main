import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  selectReplayEnabled,
  selectReplayPlaying,
  selectReplaySpeed,
  selectReplayStep,
  selectReplayTotalSteps,
  selectReplayAnimate,
  selectReplayAnimationProgress,
  setReplayEnabled,
  setReplayPlaying,
  setReplaySpeed,
  setReplayStep,
  setReplayAnimate,
  setReplayAnimationProgress,
} from '../graphSlice';

export function useReplayController() {
  const dispatch = useAppDispatch();

  const enabled = useAppSelector(selectReplayEnabled);
  const playing = useAppSelector(selectReplayPlaying);
  const speed = useAppSelector(selectReplaySpeed);
  const currentStep = useAppSelector(selectReplayStep);
  const totalSteps = useAppSelector(selectReplayTotalSteps);
  const animate = useAppSelector(selectReplayAnimate);
  const animationProgress = useAppSelector(selectReplayAnimationProgress);

  const handleReplayToggle = useCallback(
    (value: boolean) => {
      dispatch(setReplayEnabled(value));
    },
    [dispatch]
  );

  const handleReplayPlayPause = useCallback(() => {
    if (!enabled) return;
    if (totalSteps <= 1) {
      dispatch(setReplayPlaying(false));
      return;
    }
    if (!playing && currentStep >= totalSteps) {
      dispatch(setReplayStep(totalSteps > 1 ? 1 : totalSteps));
      dispatch(setReplayAnimationProgress(0)); // Reset animation when restarting from end
    }
    if (!playing && animate) {
      // When starting playback with animate enabled, reset animation progress
      dispatch(setReplayAnimationProgress(0));
    }
    dispatch(setReplayPlaying(!playing));
  }, [dispatch, enabled, playing, animate, currentStep, totalSteps]);

  const handleReplayRestart = useCallback(() => {
    dispatch(setReplayPlaying(false));
    dispatch(setReplayStep(totalSteps > 1 ? 1 : totalSteps));
    dispatch(setReplayAnimationProgress(0)); // Reset animation on restart
  }, [dispatch, totalSteps]);

  const handleReplaySeek = useCallback(
    (value: number) => {
      if (totalSteps === 0) {
        dispatch(setReplayStep(0));
        return;
      }
      const clamped = Math.min(Math.max(Math.round(value), 1), totalSteps);
      dispatch(setReplayStep(clamped));
      dispatch(setReplayAnimationProgress(1)); // Complete animation when seeking
    },
    [dispatch, totalSteps]
  );

  const handleReplaySpeedChange = useCallback(
    (value: number) => {
      dispatch(setReplaySpeed(value));
    },
    [dispatch]
  );

  const handleReplayAnimateToggle = useCallback(
    (value: boolean) => {
      dispatch(setReplayAnimate(value));
    },
    [dispatch]
  );

  const handleAnimationProgressChange = useCallback(
    (value: number) => {
      dispatch(setReplayAnimationProgress(value));
    },
    [dispatch]
  );

  return {
    enabled,
    playing,
    speed,
    currentStep,
    totalSteps,
    animate,
    animationProgress,
    handleReplayToggle,
    handleReplayPlayPause,
    handleReplayRestart,
    handleReplaySeek,
    handleReplaySpeedChange,
    handleReplayAnimateToggle,
    handleAnimationProgressChange,
  };
}
