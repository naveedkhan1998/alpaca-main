import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  selectReplayEnabled,
  selectReplayPlaying,
  selectReplaySpeed,
  selectReplayStep,
  selectReplayTotalSteps,
  setReplayEnabled,
  setReplayPlaying,
  setReplaySpeed,
  setReplayStep,
} from '../graphSlice';

export function useReplayController() {
  const dispatch = useAppDispatch();

  const enabled = useAppSelector(selectReplayEnabled);
  const playing = useAppSelector(selectReplayPlaying);
  const speed = useAppSelector(selectReplaySpeed);
  const currentStep = useAppSelector(selectReplayStep);
  const totalSteps = useAppSelector(selectReplayTotalSteps);

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
    }
    dispatch(setReplayPlaying(!playing));
  }, [dispatch, enabled, playing, currentStep, totalSteps]);

  const handleReplayRestart = useCallback(() => {
    dispatch(setReplayPlaying(false));
    dispatch(setReplayStep(totalSteps > 1 ? 1 : totalSteps));
  }, [dispatch, totalSteps]);

  const handleReplaySeek = useCallback(
    (value: number) => {
      if (totalSteps === 0) {
        dispatch(setReplayStep(0));
        return;
      }
      const clamped = Math.min(Math.max(Math.round(value), 1), totalSteps);
      dispatch(setReplayStep(clamped));
    },
    [dispatch, totalSteps]
  );

  const handleReplaySpeedChange = useCallback(
    (value: number) => {
      dispatch(setReplaySpeed(value));
    },
    [dispatch]
  );

  return {
    enabled,
    playing,
    speed,
    currentStep,
    totalSteps,
    handleReplayToggle,
    handleReplayPlayPause,
    handleReplayRestart,
    handleReplaySeek,
    handleReplaySpeedChange,
  };
}
