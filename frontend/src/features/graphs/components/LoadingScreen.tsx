import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Activity } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="relative flex items-center justify-center h-[100dvh] bg-gradient-to-br from-background via-muted/20 to-background overflow-hidden"
    >
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

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            initial={{
              x:
                Math.random() *
                (typeof window !== 'undefined' ? window.innerWidth : 1200),
              y:
                Math.random() *
                (typeof window !== 'undefined' ? window.innerHeight : 800),
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <motion.div
        className="relative w-full max-w-md mx-4"
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <div className="p-8 rounded-2xl bg-card/95 backdrop-blur-xl border-2 border-border/50 shadow-2xl">
          {/* Enhanced Spinner with Icon */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <motion.div
                className="w-20 h-20 border-4 rounded-full border-primary/20 border-t-primary"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-0 w-20 h-20 border-4 rounded-full border-accent/20 border-b-accent"
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <BarChart3 className="w-8 h-8 text-primary" />
              </motion.div>
              <motion.div
                className="absolute -inset-2 rounded-full bg-primary/10 blur-xl -z-10"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="sr-only">Loading...</span>
            </div>
          </div>

          {/* Title & Subtitle with Animation */}
          <motion.div
            className="mt-8 text-center space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground/70 bg-clip-text text-transparent">
              Loading Chart Data
            </h2>
            <p className="text-sm text-muted-foreground">
              Fetching the latest market data for analysis
            </p>
          </motion.div>

          {/* Animated Progress Bar */}
          <motion.div
            className="mt-6 h-2 w-full overflow-hidden rounded-full bg-muted/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ width: '40%' }}
            />
          </motion.div>

          {/* Loading Steps with Icons */}
          <motion.div
            className="mt-8 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {[
              { icon: TrendingUp, text: 'Connecting to market data' },
              { icon: Activity, text: 'Processing technical indicators' },
              { icon: BarChart3, text: 'Rendering chart visualization' },
            ].map((step, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: index * 0.3,
                  }}
                >
                  <step.icon className="w-5 h-5 text-primary" />
                </motion.div>
                <span className="text-sm text-muted-foreground">
                  {step.text}
                </span>
                <motion.div
                  className="ml-auto flex gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  {[0, 1, 2].map(dotIndex => (
                    <motion.div
                      key={dotIndex}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: dotIndex * 0.2 + index * 0.3,
                      }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>

          {/* Animated Dots */}
          <motion.div
            className="flex items-center justify-center mt-8 gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-primary"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
