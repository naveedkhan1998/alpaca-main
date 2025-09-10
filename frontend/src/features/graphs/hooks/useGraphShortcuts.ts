import { useEffect } from 'react';
import { useAppDispatch } from 'src/app/hooks';
import { setShowControls, setShowVolume } from '../graphSlice';

export function useGraphShortcuts(options: {
  showVolume: boolean;
  showControls: boolean;
  toggleFullscreen: () => void;
}) {
  const dispatch = useAppDispatch();
  const { showControls, showVolume, toggleFullscreen } = options;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target.isContentEditable)
        return;
      const key = e.key.toLowerCase();
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
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, showControls, showVolume, toggleFullscreen]);
}
