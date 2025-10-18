import { useState, useEffect, createElement } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, BarChart3, Shield, Zap } from 'lucide-react';

interface LoadingPhase {
  message: string;
  minDuration: number;
  maxDuration: number;
  progress: number;
  subTasks?: string[];
  icon?: React.ComponentType<{ className?: string }>;
}

const loadingPhases: LoadingPhase[] = [
  {
    message: 'Initializing Platform',
    minDuration: 1500,
    maxDuration: 3000,
    progress: 20,
    subTasks: [
      'Loading core systems',
      'Verifying credentials',
      'Starting services',
    ],
    icon: Zap,
  },
  {
    message: 'Connecting to Markets',
    minDuration: 2000,
    maxDuration: 4000,
    progress: 45,
    subTasks: [
      'Establishing connections',
      'Authenticating session',
      'Syncing market data',
    ],
    icon: TrendingUp,
  },
  {
    message: 'Loading Portfolio',
    minDuration: 1800,
    maxDuration: 3500,
    progress: 70,
    subTasks: [
      'Fetching positions',
      'Analyzing performance',
      'Building reports',
    ],
    icon: BarChart3,
  },
  {
    message: 'Finalizing Setup',
    minDuration: 1200,
    maxDuration: 2500,
    progress: 90,
    subTasks: [
      'Loading preferences',
      'Applying themes',
      'Setting up workspace',
    ],
    icon: Shield,
  },
  {
    message: 'Ready to Trade',
    minDuration: 800,
    maxDuration: 1500,
    progress: 100,
    subTasks: ['All systems ready', 'Welcome back!'],
    icon: TrendingUp,
  },
];

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [dots, setDots] = useState('');
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);

  // Get computed colors from CSS variables
  const [colors, setColors] = useState({
    primary: 'hsl(221 83% 53%)',
    primaryDark: 'hsl(217 91% 60%)',
    muted: 'hsl(220 15% 95%)',
    mutedDark: 'hsl(222 47% 9%)',
  });

  useEffect(() => {
    // Get actual computed values from CSS variables
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      const isDark = root.classList.contains('dark');

      setColors({
        primary: isDark ? 'hsl(217 91% 60%)' : 'hsl(221 83% 53%)',
        primaryDark: 'hsl(217 91% 60%)',
        muted: isDark ? 'hsl(222 47% 9%)' : 'hsl(220 15% 95%)',
        mutedDark: 'hsl(222 47% 9%)',
      });

      // Listen for theme changes
      const observer = new MutationObserver(() => {
        const isDark = root.classList.contains('dark');
        setColors({
          primary: isDark ? 'hsl(217 91% 60%)' : 'hsl(221 83% 53%)',
          primaryDark: 'hsl(217 91% 60%)',
          muted: isDark ? 'hsl(222 47% 9%)' : 'hsl(220 15% 95%)',
          mutedDark: 'hsl(222 47% 9%)',
        });
      });

      observer.observe(root, {
        attributes: true,
        attributeFilter: ['class'],
      });

      return () => observer.disconnect();
    }
  }, []);

  // Generate particles
  useEffect(() => {
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x:
        Math.random() *
        (typeof window !== 'undefined' ? window.innerWidth : 1200),
      y:
        Math.random() *
        (typeof window !== 'undefined' ? window.innerHeight : 800),
      delay: Math.random() * 2,
    }));
    setParticles(newParticles);
  }, []);

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Realistic progress simulation for long loading times
  useEffect(() => {
    let phaseIndex = 0;
    let phaseStartTime = Date.now();
    let phaseDuration =
      Math.random() *
        (loadingPhases[0].maxDuration - loadingPhases[0].minDuration) +
      loadingPhases[0].minDuration;
    let lastProgress = 0;

    const updateProgress = () => {
      if (phaseIndex >= loadingPhases.length) return;

      const currentPhaseData = loadingPhases[phaseIndex];
      const elapsed = Date.now() - phaseStartTime;
      const phaseProgress = Math.min(elapsed / phaseDuration, 1);

      // Add some randomness and stuttering for realism
      const jitter = (Math.random() - 0.5) * 0.5;
      const targetProgress =
        lastProgress +
        (currentPhaseData.progress - lastProgress) * phaseProgress;
      const newProgress = Math.min(
        Math.max(targetProgress + jitter, lastProgress),
        currentPhaseData.progress
      );

      setProgress(newProgress);
      setCurrentPhase(phaseIndex);

      // Move to next phase
      if (phaseProgress >= 1) {
        lastProgress = currentPhaseData.progress;
        phaseIndex++;
        if (phaseIndex < loadingPhases.length) {
          phaseStartTime = Date.now();
          phaseDuration =
            Math.random() *
              (loadingPhases[phaseIndex].maxDuration -
                loadingPhases[phaseIndex].minDuration) +
            loadingPhases[phaseIndex].minDuration;
        }
      }
    };

    const interval = setInterval(updateProgress, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Enhanced Grid Background */}
      <div
        className="absolute inset-0 opacity-20 dark:opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Floating Particles */}
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute w-1.5 h-1.5 bg-primary/40 rounded-full"
          initial={{ x: particle.x, y: particle.y, scale: 0 }}
          animate={{
            y: particle.y - 100,
            scale: [0, 1, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 3,
            delay: particle.delay,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Brand Section */}
      <motion.div
        className="absolute z-50 top-8 left-8"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="/android-chrome-192x192.png"
              alt="Alpaca"
              className="w-12 h-12 shadow-lg rounded-xl ring-2 ring-border/50"
            />
            <motion.div
              className="absolute opacity-75 -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl blur"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Alpaca Trading
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <motion.div
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              />
              <span className="text-xs font-medium text-muted-foreground">
                Loading...
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Status Indicator */}
      <motion.div
        className="absolute flex items-center gap-2 top-8 right-8"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <motion.div
          className="w-2 h-2 rounded-full bg-success"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        />
        <span className="text-sm font-medium tracking-wider text-success">
          ONLINE
        </span>
      </motion.div>

      {/* Enhanced Animated Blocks */}
      <EnhancedAnimatedBlock
        initialX={-200}
        y={120}
        width={120}
        height={120}
        colors={['#FF6B6B', '#FFE66D', '#4ECDC4']}
        pattern="wave"
        duration={8}
        delay={0}
      />
      <EnhancedAnimatedBlock
        initialX={-150}
        y={240}
        width={120}
        height={120}
        colors={['#C7F0BD', '#A0CED9', '#83B5D1']}
        pattern="pulse"
        duration={10}
        delay={1}
      />
      <EnhancedAnimatedBlock
        initialX={-180}
        y={360}
        width={120}
        height={120}
        colors={['#F7B2BD', '#B2F7EF']}
        pattern="flow"
        duration={9}
        delay={2}
      />
      <EnhancedAnimatedBlock
        initialX={-160}
        y={540}
        width={120}
        height={120}
        colors={['#D4A5A5', '#A5D4D4', '#D4D4A5']}
        pattern="matrix"
        duration={7}
        delay={0.5}
      />
      <EnhancedAnimatedBlock
        initialX={-220}
        y={720}
        width={120}
        height={120}
        colors={['#A8DADC', '#C3F0CA']}
        pattern="spiral"
        duration={11}
        delay={1.5}
      />
      <EnhancedAnimatedBlock
        initialX={-250}
        y={960}
        width={120}
        height={120}
        colors={['#FFD1BA', '#BAE1FF', '#FFBAE1']}
        pattern="matrix"
        duration={12}
        delay={0.8}
      />

      {/* Enhanced Progress Card - Properly Centered */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="w-full max-w-md mx-4 pointer-events-auto"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <Card className="border-2 shadow-2xl border-primary/20 bg-card/95 backdrop-blur-xl">
            <div className="p-8 space-y-6">
              {/* Icon and Phase Message */}
              <div className="flex flex-col items-center space-y-4 text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`icon-${currentPhase}`}
                    className="relative"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                  >
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 ring-2 ring-primary/30">
                      {loadingPhases[currentPhase]?.icon &&
                        createElement(loadingPhases[currentPhase].icon!, {
                          className: 'w-8 h-8 text-primary',
                        })}
                    </div>
                    <motion.div
                      className="absolute opacity-50 -inset-2 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl blur-lg -z-10"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                  </motion.div>
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPhase}
                    className="space-y-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h2 className="flex items-center justify-center text-2xl font-bold text-foreground">
                      {loadingPhases[currentPhase]?.message || 'Initializing'}
                      <span className="inline-block w-8 text-left text-primary">
                        {dots}
                      </span>
                    </h2>
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={`${currentPhase}-subtask`}
                        className="text-sm text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {loadingPhases[currentPhase]?.subTasks?.[
                          Math.floor(Date.now() / 2000) %
                            (loadingPhases[currentPhase]?.subTasks?.length || 1)
                        ] || 'Processing...'}
                      </motion.p>
                    </AnimatePresence>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="space-y-3">
                <div className="relative w-full h-3 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-white/40 via-white/60 to-transparent"
                    animate={{
                      x: [`-30%`, `${Math.min(progress + 30, 130)}%`],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'linear',
                    }}
                    style={{ width: '30%' }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <motion.p
                    className="text-lg font-bold text-primary"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  >
                    {Math.round(progress)}%
                  </motion.p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>
                      Step {currentPhase + 1} of {loadingPhases.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phase Indicators */}
              <div className="flex items-center justify-center gap-2">
                {loadingPhases.map((_, i) => (
                  <motion.div
                    key={i}
                    className="h-1.5 rounded-full"
                    initial={{
                      width: i === currentPhase ? '32px' : '8px',
                    }}
                    animate={{
                      width: i === currentPhase ? '32px' : '8px',
                    }}
                    style={{
                      backgroundColor:
                        i <= currentPhase ? colors.primary : colors.muted,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>

              {/* Status Message */}
              {progress > 20 && progress < 95 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 border rounded-lg bg-muted/50 border-border/50"
                >
                  <p className="text-xs text-center text-muted-foreground">
                    {progress < 50
                      ? '🚀 Setting up your trading environment...'
                      : progress < 75
                        ? '⚡ Loading real-time market data...'
                        : '✨ Almost there! Preparing your dashboard...'}
                  </p>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

interface EnhancedAnimatedBlockProps {
  initialX: number;
  y: number;
  width: number;
  height: number;
  colors: string[];
  pattern: 'wave' | 'pulse' | 'flow' | 'matrix' | 'spiral';
  duration: number;
  delay: number;
}

function EnhancedAnimatedBlock({
  initialX,
  y,
  width,
  height,
  colors,
  pattern,
  duration,
  delay,
}: EnhancedAnimatedBlockProps) {
  const renderPattern = () => {
    switch (pattern) {
      case 'wave':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg">
            <motion.div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(45deg, ${colors[0]}, ${colors[1]})`,
              }}
              animate={{
                background: [
                  `linear-gradient(45deg, ${colors[0]}, ${colors[1]})`,
                  `linear-gradient(135deg, ${colors[1]}, ${colors[0]})`,
                  `linear-gradient(45deg, ${colors[0]}, ${colors[1]})`,
                ],
              }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
            />
          </div>
        );
      case 'pulse':
        return (
          <motion.div
            className="w-full h-full rounded-lg"
            style={{ backgroundColor: colors[0] }}
            animate={{
              scale: [1, 1.1, 1],
              backgroundColor: colors,
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
            }}
          />
        );
      case 'flow':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, transparent, ${colors[i % colors.length]}, transparent)`,
                }}
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.7,
                  ease: 'linear',
                }}
              />
            ))}
          </div>
        );
      case 'matrix':
        return (
          <div className="grid w-full h-full grid-cols-4 grid-rows-4 gap-1 p-1 overflow-hidden rounded-lg">
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-full h-full rounded-sm"
                style={{ backgroundColor: colors[i % colors.length] }}
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        );
      case 'spiral':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg">
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{
                background: `conic-gradient(from 0deg, ${colors[0]}, ${colors[1]}, ${colors[0]})`,
              }}
              animate={{ rotate: 360 }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'linear',
              }}
            />
          </div>
        );

      default:
        return (
          <div
            className="w-full h-full rounded-lg"
            style={{ backgroundColor: colors[0] }}
          />
        );
    }
  };

  return (
    <motion.div
      className="absolute shadow-lg"
      style={{
        width,
        height,
        top: y,
      }}
      initial={{ x: initialX, opacity: 0 }}
      animate={{
        x: typeof window !== 'undefined' ? window.innerWidth + 200 : 1400,
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'easeInOut',
      }}
    >
      {renderPattern()}
    </motion.div>
  );
}

export default LoadingScreen;
