import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isDevelopment } from '@/lib/environment';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'announcement:dismissed:v1';

export default function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setTopOffset = (value: string) => {
    document.documentElement.style.setProperty('--app-top-offset', value);
  };

  useEffect(() => {
    if (isDevelopment) {
      setTopOffset('0px');
      return;
    }
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsVisible(!dismissed);
  }, []);

  useEffect(() => {
    if (isDevelopment) return;

    if (!isVisible) {
      setTopOffset('0px');
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const height = el.getBoundingClientRect().height;
      setTopOffset(`${height}px`);
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    return () => {
      ro.disconnect();
      setTopOffset('0px');
    };
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (isDevelopment) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={containerRef}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full overflow-hidden border-b border-border bg-background"
        >
          <div className="mx-auto flex w-full max-w-[1400px] items-start justify-between gap-3 px-4 py-3 sm:items-center sm:px-6 lg:px-8">
            <div className="flex items-start flex-1 min-w-0 gap-3 sm:items-center">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border bg-muted sm:mt-0">
                <Bell className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="min-w-0">
                <p className="text-sm leading-relaxed text-foreground">
                  This demo runs on free hosting and retains data for up to{' '}
                  <span className="font-medium">1 year</span>.{' '}
                  <a
                    href="https://github.com/naveedkhan1998/alpaca-main"
                    className="underline underline-offset-4 text-muted-foreground hover:text-foreground"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View the repository
                  </a>{' '}
                  to deploy your own copy.
                </p>
              </div>
            </div>

            <Button
              onClick={handleClose}
              variant="ghost"
              size="icon"
              className="mt-0.5 h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Close announcement"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
