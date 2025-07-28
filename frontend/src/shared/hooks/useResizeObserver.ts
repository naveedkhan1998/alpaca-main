import { useEffect, useState, useRef } from 'react';

interface Size {
  width: number;
  height: number;
}

const useResizeObserver = (targetRef: React.RefObject<HTMLElement>): Size => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;

    // Set initial size
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.floor(rect.width),
        height: Math.floor(rect.height),
      });
    };

    // Initial measurement
    updateSize();

    // Create ResizeObserver
    if (window.ResizeObserver) {
      resizeObserverRef.current = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setSize({
            width: Math.floor(width),
            height: Math.floor(height),
          });
        }
      });

      resizeObserverRef.current.observe(element);
    } else {
      // Fallback for browsers without ResizeObserver
      const handleResize = () => updateSize();
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [targetRef]);

  return size;
};

export default useResizeObserver;
