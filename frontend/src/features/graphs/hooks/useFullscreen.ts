import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch } from 'src/app/hooks';
import { setIsFullscreen } from '../graphSlice';

export function useFullscreen(sectionRef: React.RefObject<HTMLElement | null>) {
  const dispatch = useAppDispatch();
  const [isFullscreenView, setIsFullscreenView] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!sectionRef.current) return;
    if (!document.fullscreenElement) {
      sectionRef.current
        .requestFullscreen()
        .then(() => {
          dispatch(setIsFullscreen(true));
          setIsFullscreenView(true);
        })
        .catch(() => void 0);
    } else {
      document.exitFullscreen().then(() => {
        dispatch(setIsFullscreen(false));
        setIsFullscreenView(false);
      });
    }
  }, [dispatch, sectionRef]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      dispatch(setIsFullscreen(active));
      setIsFullscreenView(active);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [dispatch]);

  return { isFullscreenView, toggleFullscreen } as const;
}
