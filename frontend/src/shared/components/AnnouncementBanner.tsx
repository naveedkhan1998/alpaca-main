import { useEffect, useState } from 'react';
import { Bell, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isDevelopment } from '@/lib/environment';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'announcement:dismissed:v1';

export default function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isDevelopment) return; // skip in dev
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsVisible(!dismissed);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (isDevelopment) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-full overflow-hidden border-b bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20 backdrop-blur-sm"
        >
          <div className="relative mx-auto w-full max-w-[1400px] px-4 py-3 sm:px-6 lg:px-8">
            {/* Animated background pulse */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'linear',
              }}
            />

            <div className="relative flex items-center justify-between gap-4">
              {/* Left: Icon and Message */}
              <div className="flex items-center flex-1 min-w-0 gap-3">
                {/* Animated icon */}
                <motion.div
                  className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-primary/20 ring-2 ring-primary/30"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                  }}
                >
                  <Bell className="w-4 h-4 text-primary" />
                </motion.div>

                {/* Message content */}
                <div className="flex flex-wrap items-center flex-1 min-w-0 gap-2">
                  <p className="text-sm leading-relaxed text-foreground/80">
                    This demo runs on free hosting and database services and
                    retains data for up to{' '}
                    <span className="font-semibold text-foreground">
                      6 months
                    </span>
                    .
                    <span className="hidden sm:inline">
                      {' '}
                      To remove this limit and run a production-ready instance,
                      run the app locally or deploy your own copy.{' '}
                      <a
                        href="https://github.com/naveedkhan1998/alpaca-main"
                        className="font-semibold underline text-foreground"
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        View the repository
                      </a>{' '}
                      for setup instructions.
                    </span>
                  </p>
                </div>
              </div>

              {/* Right: Close button */}
              <Button
                onClick={handleClose}
                variant="ghost"
                size="icon"
                className="flex-shrink-0 w-8 h-8 transition-colors rounded-lg hover:bg-primary/10 hover:text-primary"
                aria-label="Close announcement"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile: Additional info */}
            <div className="mt-2 sm:hidden pl-11">
              <p className="text-xs text-muted-foreground">
                Configure in{' '}
                <a
                  href="/accounts"
                  className="inline-flex items-center gap-1 font-medium underline transition-colors text-primary hover:text-primary/80 underline-offset-2 decoration-primary/30"
                >
                  Account Settings
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
