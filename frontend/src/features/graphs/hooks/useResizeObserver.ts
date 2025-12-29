import { useEffect, useRef } from 'react';

export function useResizeObserver(
  targetRef: React.RefObject<HTMLElement | null>,
  onResize: (rect: DOMRectReadOnly) => void
) {
  const observerRef = useRef<ResizeObserver | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastRectRef = useRef<DOMRectReadOnly | null>(null);
  // Store callback in ref to avoid recreating observer on callback change
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    // Debounced handler using requestAnimationFrame
    const handleResize = (entries: ResizeObserverEntry[]) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;

      // Skip if dimensions haven't actually changed
      if (
        lastRectRef.current &&
        Math.abs(lastRectRef.current.width - rect.width) < 1 &&
        Math.abs(lastRectRef.current.height - rect.height) < 1
      ) {
        return;
      }
      lastRectRef.current = rect;

      // Cancel any pending animation frame
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      // Schedule resize callback on next frame
      rafIdRef.current = requestAnimationFrame(() => {
        onResizeRef.current(rect);
        rafIdRef.current = null;
      });
    };

    observerRef.current = new ResizeObserver(handleResize);
    observerRef.current.observe(el);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (observerRef.current && el) {
        observerRef.current.unobserve(el);
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      lastRectRef.current = null;
    };
  }, [targetRef]);
}
