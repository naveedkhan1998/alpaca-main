import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  setShowControls,
  setShowVolume,
  selectReplayEnabled,
  selectReplayPlaying,
  selectReplayStep,
  selectReplayTotalSteps,
  setReplayEnabled,
  setReplayPlaying,
  setReplayStep,
} from '../graphSlice';

export function useGraphShortcuts(options: {
  showVolume: boolean;
  showControls: boolean;
  toggleFullscreen: () => void;
}) {
  const dispatch = useAppDispatch();
  const { showControls, showVolume, toggleFullscreen } = options;

  const replayEnabled = useAppSelector(selectReplayEnabled);
  const replayPlaying = useAppSelector(selectReplayPlaying);
  const replayStep = useAppSelector(selectReplayStep);
  const replayTotalSteps = useAppSelector(selectReplayTotalSteps);

  const handlePlayPause = useCallback(() => {
    if (!replayEnabled) return;
    if (replayTotalSteps <= 1) {
      dispatch(setReplayPlaying(false));
      return;
    }
    if (!replayPlaying && replayStep >= replayTotalSteps) {
      dispatch(setReplayStep(replayTotalSteps > 1 ? 1 : replayTotalSteps));
    }
    dispatch(setReplayPlaying(!replayPlaying));
  }, [dispatch, replayEnabled, replayPlaying, replayStep, replayTotalSteps]);

  const handleRestart = useCallback(() => {
    if (!replayEnabled) return;
    dispatch(setReplayPlaying(false));
    dispatch(setReplayStep(replayTotalSteps > 1 ? 1 : replayTotalSteps));
  }, [dispatch, replayEnabled, replayTotalSteps]);

  const handleStepForward = useCallback(() => {
    if (!replayEnabled || replayStep >= replayTotalSteps) return;
    dispatch(setReplayStep(replayStep + 1));
  }, [dispatch, replayEnabled, replayStep, replayTotalSteps]);

  const handleStepBackward = useCallback(() => {
    if (!replayEnabled || replayStep <= 1) return;
    dispatch(setReplayStep(replayStep - 1));
  }, [dispatch, replayEnabled, replayStep]);

  const handleSkipForward = useCallback(() => {
    if (!replayEnabled) return;
    dispatch(setReplayStep(Math.min(replayTotalSteps, replayStep + 10)));
  }, [dispatch, replayEnabled, replayStep, replayTotalSteps]);

  const handleSkipBackward = useCallback(() => {
    if (!replayEnabled) return;
    dispatch(setReplayStep(Math.max(1, replayStep - 10)));
  }, [dispatch, replayEnabled, replayStep]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target.isContentEditable)
        return;

      const key = e.key.toLowerCase();

      // General shortcuts
      if (key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === 'v') {
        e.preventDefault();
        dispatch(setShowVolume(!showVolume));
      } else if (key === 'c') {
        e.preventDefault();
        dispatch(setShowControls(!showControls));
      }

      // Replay shortcuts
      else if (key === ' ' || key === 'spacebar') {
        // Space - play/pause replay
        if (replayEnabled) {
          e.preventDefault();
          handlePlayPause();
        }
      } else if (key === 'r') {
        // R - restart replay or toggle replay mode
        e.preventDefault();
        if (replayEnabled) {
          handleRestart();
        } else {
          dispatch(setReplayEnabled(true));
        }
      } else if (key === 'escape') {
        // Escape - exit replay mode
        if (replayEnabled) {
          e.preventDefault();
          dispatch(setReplayEnabled(false));
        }
      } else if (key === 'arrowright') {
        // Right arrow - step forward
        if (replayEnabled) {
          e.preventDefault();
          if (e.shiftKey) {
            handleSkipForward();
          } else {
            handleStepForward();
          }
        }
      } else if (key === 'arrowleft') {
        // Left arrow - step backward
        if (replayEnabled) {
          e.preventDefault();
          if (e.shiftKey) {
            handleSkipBackward();
          } else {
            handleStepBackward();
          }
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    dispatch,
    showControls,
    showVolume,
    toggleFullscreen,
    replayEnabled,
    handlePlayPause,
    handleRestart,
    handleStepForward,
    handleStepBackward,
    handleSkipForward,
    handleSkipBackward,
  ]);
}
