import { useEffect, useRef } from 'react';

export function useResizeObserver(
  targetRef: React.RefObject<HTMLElement | null>,
  onResize: (rect: DOMRectReadOnly) => void
) {
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    observerRef.current = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) onResize(rect);
    });
    observerRef.current.observe(el);

    return () => {
      if (observerRef.current && el) {
        observerRef.current.unobserve(el);
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [targetRef, onResize]);
}
