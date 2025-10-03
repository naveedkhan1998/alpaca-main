import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  XCircle,
  RefreshCw,
  ArrowLeft,
  Wifi,
  AlertTriangle,
  Clock,
} from 'lucide-react';

const ErrorScreen = () => {
  return (
    <div className="relative flex items-center justify-center h-[100dvh] bg-gradient-to-br from-background via-muted/20 to-destructive/5 px-4 overflow-hidden">
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Animated error pulse */}
      <motion.div
        className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full bg-destructive/5 blur-[100px]"
        style={{ x: '-50%', y: '-50%' }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <motion.div
        role="alert"
        aria-live="assertive"
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <div className="p-8 border-2 shadow-2xl rounded-2xl border-destructive/30 bg-card/95 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-6 text-center">
            {/* Error Icon with Animation */}
            <motion.div
              className="relative"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.8, delay: 0.2 }}
            >
              <div className="relative flex items-center justify-center w-24 h-24 border-2 rounded-full bg-gradient-to-br from-destructive/10 to-destructive/20 border-destructive/30">
                <XCircle
                  className="w-12 h-12 text-destructive"
                  aria-hidden="true"
                />
              </div>
              <motion.div
                className="absolute -inset-2 rounded-full bg-destructive/20 blur-xl -z-10"
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="absolute top-0 right-0 w-4 h-4 rounded-full bg-destructive"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>

            {/* Error Message */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-2xl font-bold text-destructive">
                Connection Error
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Unable to fetch chart data. Please check your connection and try
                again.
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="w-full pt-2 space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                onClick={() => window.location.reload()}
                className="w-full h-11 bg-destructive hover:bg-destructive/90 shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <RefreshCw
                  className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500"
                  aria-hidden="true"
                />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="w-full h-11 border-border/50 hover:border-border transition-all duration-300 group"
              >
                <ArrowLeft
                  className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300"
                  aria-hidden="true"
                />
                Go Back
              </Button>
            </motion.div>

            {/* Troubleshooting Tips */}
            <motion.div
              className="w-full p-4 mt-2 space-y-3 border rounded-xl border-destructive/20 bg-destructive/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="w-4 h-4" />
                <span>Troubleshooting Tips</span>
              </div>
              <div className="space-y-2.5 text-xs text-muted-foreground">
                <motion.div
                  className="flex items-start gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Wifi className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive/70" />
                  <span>Verify your internet connection is stable</span>
                </motion.div>
                <motion.div
                  className="flex items-start gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive/70" />
                  <span>
                    If on VPN or corporate network, ensure API access is allowed
                  </span>
                </motion.div>
                <motion.div
                  className="flex items-start gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-destructive/70" />
                  <span>
                    Wait a moment and retry in case of temporary outages
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ErrorScreen;
