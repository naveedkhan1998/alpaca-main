'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingPhase {
  message: string;
  minDuration: number;
  maxDuration: number;
  progress: number;
  subTasks?: string[];
}

const loadingPhases: LoadingPhase[] = [
  {
    message: 'Initializing trading platform',
    minDuration: 2000,
    maxDuration: 6000,
    progress: 15,
    subTasks: [
      'Loading core systems',
      'Starting services',
      'Verifying credentials',
    ],
  },
  {
    message: 'Connecting to markets',
    minDuration: 3000,
    maxDuration: 12000,
    progress: 40,
    subTasks: [
      'Establishing connections',
      'Authenticating',
      'Syncing market data',
    ],
  },
  {
    message: 'Loading portfolio data',
    minDuration: 3000,
    maxDuration: 15000,
    progress: 65,
    subTasks: [
      'Fetching positions',
      'Analyzing performance',
      'Building reports',
    ],
  },
  {
    message: 'Preparing dashboard',
    minDuration: 2000,
    maxDuration: 10000,
    progress: 85,
    subTasks: [
      'Setting up workspace',
      'Loading preferences',
      'Applying themes',
    ],
  },
  {
    message: 'Almost ready',
    minDuration: 1500,
    maxDuration: 5000,
    progress: 100,
    subTasks: ['Finalizing setup', 'All systems ready'],
  },
];

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [dots, setDots] = useState('');
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; delay: number }>
  >([]);

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
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Enhanced Grid Background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating Particles */}
      {particles.map(particle => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-purple-400 rounded-full opacity-60"
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
        className="absolute z-50 text-white top-8 left-8"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-blue-400"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          />
          <span className="text-xl font-semibold tracking-wide">System</span>
        </div>
        <div className="max-w-sm mt-8">
          <h2 className="mb-3 text-2xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text">
            Initializing Application
          </h2>
          <p className="text-sm leading-relaxed text-gray-300">
            Please wait while we prepare everything for you →
          </p>
        </div>
      </motion.div>

      {/* Status Indicator */}
      <motion.div
        className="absolute text-sm tracking-wider text-purple-300 top-8 right-8"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        → SYSTEM ONLINE
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
          className="pointer-events-auto"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <Card className="w-[400px] mx-4 border shadow-2xl border-purple-500/30 bg-slate-900/95 backdrop-blur-xl shadow-purple-500/20">
            <div className="p-8 space-y-6 h-80">
              {' '}
              {/* Fixed height container */}
              {/* Phase Message - Fixed height */}
              <div className="flex flex-col justify-center h-20 space-y-4 text-center">
                <AnimatePresence mode="wait">
                  <motion.h2
                    key={currentPhase}
                    className="flex items-center justify-center h-8 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {loadingPhases[currentPhase]?.message || 'Initializing'}
                    <span className="inline-block w-6 text-left">{dots}</span>
                  </motion.h2>
                </AnimatePresence>

                {/* Sub-task indicator - Fixed height */}
                <div className="flex items-center justify-center h-5">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`${currentPhase}-subtask`}
                      className="text-sm text-slate-400"
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
                </div>
              </div>
              {/* Enhanced Progress Bar - Fixed height */}
              <div className="h-20 space-y-4">
                <div className="relative w-full h-4 overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                  <motion.div
                    className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-white/40 to-transparent"
                    animate={{
                      x: [`-100%`, `${Math.min(progress + 15, 100)}%`],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'easeInOut',
                    }}
                    style={{ width: '30%' }}
                  />
                  {/* Progress segments */}
                  <div className="absolute inset-0 flex">
                    {loadingPhases.map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 border-r border-slate-700 last:border-r-0"
                        style={{ opacity: i <= currentPhase ? 0.3 : 0.1 }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between h-8">
                  <motion.p
                    className="text-lg font-semibold text-purple-300"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  >
                    {Math.round(progress)}%
                  </motion.p>
                  <div className="flex space-x-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-purple-400 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {/* Enhanced Status Info - Fixed height */}
              <div className="flex flex-col justify-center h-24 space-y-3 text-center">
                <motion.p
                  className="flex items-center justify-center h-5 text-sm text-slate-400"
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                >
                  This may take a few moments...
                </motion.p>
                <div className="flex justify-center h-4 space-x-6 text-xs text-slate-500">
                  <span>
                    Phase {currentPhase + 1}/{loadingPhases.length}
                  </span>
                  <span>•</span>
                  <span>
                    {progress < 50
                      ? 'Initializing'
                      : progress < 90
                        ? 'Almost ready'
                        : 'Finishing up'}
                  </span>
                </div>
              </div>
              {/* Long loading encouragement - Fixed height area */}
              <div className="flex items-center justify-center h-16">
                {progress > 30 && progress < 95 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full p-3 border rounded-lg bg-slate-800/50 border-slate-700"
                  >
                    <p className="text-xs leading-relaxed text-center text-slate-400">
                      {progress < 60
                        ? 'Setting up your personalized experience...'
                        : progress < 80
                          ? 'Optimizing performance for the best experience...'
                          : 'Putting the finishing touches...'}
                    </p>
                  </motion.div>
                )}
              </div>
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
