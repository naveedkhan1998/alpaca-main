'use client';

import type React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  LockIcon,
  UserPlusIcon,
  LineChart,
  Shield,
  BarChart4,
  Clock,
  TrendingUp,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import Login from './components/Login';
import Registration from './components/Registration';

const LoginRegPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('login');

  const features = [
    {
      icon: <LineChart className="w-5 h-5" />,
      title: 'Real-Time Streaming',
      description:
        'Dedicated WebSocket service ingests Alpaca ticks and builds 1-minute candles live.',
    },
    {
      icon: <BarChart4 className="w-5 h-5" />,
      title: 'Historical Data Pipelines',
      description:
        'Automatic OHLCV backfills and caching for watchlist assets, ready for research.',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Interactive Analysis',
      description:
        'TradingView-style charts with indicators, multi-timeframe data, and live updates.',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: 'Dockerized Stack',
      description:
        'Docker Compose brings up Django API, Postgres, Redis, Celery, and Channels.',
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: 'Public Demo Modes',
      description:
        'Guest mode is read-only and rate-limited; register to unlock real-time features.',
    },
  ];

  const stats = [
    { label: 'Open source', value: 'MIT' },
    { label: 'Demo access', value: 'Guest or Full' },
    { label: 'Self-host ready', value: 'Docker Compose' },
  ];

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-background font-['DM_Sans']">
      {/* Atmosphere glow */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage: `
            radial-gradient(1100px circle at 10% 10%, hsl(var(--primary) / 0.16), transparent 55%),
            radial-gradient(900px circle at 90% 0%, hsl(var(--chart-2) / 0.14), transparent 55%),
            radial-gradient(800px circle at 85% 85%, hsl(var(--primary) / 0.12), transparent 60%)
          `,
        }}
      />

      {/* Modern Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.2] dark:opacity-[0.08]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
        }}
      />

      {/* Animated gradient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          className="absolute w-[520px] h-[520px] rounded-full bg-primary/15 blur-[110px]"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
          style={{ top: '10%', left: '10%' }}
        />
        <motion.div
          className="absolute w-[620px] h-[620px] rounded-full bg-chart-2/15 blur-[130px]"
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
          style={{ bottom: '10%', right: '10%' }}
        />
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Number.POSITIVE_INFINITY,
              delay: Math.random() * 2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="relative w-full h-full">
        <motion.div
          className="w-full h-full"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
        >
          <Card className="grid w-full h-full grid-cols-1 overflow-hidden border-0 rounded-none shadow-none lg:grid-cols-3 bg-card/95 backdrop-blur-xl lg:border-0">
            {/* Left Panel - Features - Now takes 2/3 of screen */}
            <div
              className="relative hidden col-span-2 p-10 overflow-y-auto lg:block"
              style={{
                backgroundImage: `
                  linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.92) 45%, hsl(var(--chart-2) / 0.7) 100%)
                `,
              }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-40">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.2),transparent_45%)]" />
              </div>
              <div className="max-w-2xl space-y-5">
                {/* Logo/Brand Section */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src="/android-chrome-192x192.png"
                        alt="Alpaca"
                        className="w-12 h-12 shadow-lg rounded-xl ring-2 ring-white/20"
                      />
                      <motion.div
                        className="absolute -inset-1 bg-white/10 rounded-xl blur"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{
                          duration: 2,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white font-['Plus_Jakarta_Sans'] tracking-tight">
                        Alpaca Trading
                      </h3>
                      <Badge
                        variant="secondary"
                        className="mt-1 text-white border-0 bg-white/20"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Open Source
                      </Badge>
                    </div>
                  </div>
                </motion.div>

                {/* Main Heading */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="space-y-3"
                >
                  <p className="text-[0.6rem] font-semibold tracking-[0.28em] text-white/70 uppercase">
                    Open Source / Public Demo / Self-Host Ready
                  </p>
                  <h1 className="text-3xl font-semibold leading-snug text-white font-['Plus_Jakarta_Sans'] tracking-tight">
                    Build a real-time market data platform
                  </h1>
                  <p className="text-sm leading-relaxed text-white/80">
                    Django + React stack for Alpaca streaming, backtesting, and
                    TradingView charts.
                  </p>
                </motion.div>

                {/* Features List */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                      className="flex items-start gap-3 p-3 transition-all duration-300 border cursor-pointer rounded-2xl bg-white/10 backdrop-blur-sm border-white/10 hover:bg-white/15 group"
                    >
                      <div className="p-2 rounded-lg bg-white/10 text-white group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="text-sm font-semibold text-white transition-transform duration-300 group-hover:translate-x-1">
                          {feature.title}
                        </h3>
                        <p className="text-xs leading-relaxed text-white/70">
                          {feature.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 transition-opacity duration-300 opacity-0 text-white/50 group-hover:opacity-100" />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Stats strip */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="grid gap-2 sm:grid-cols-3"
                >
                  {stats.map(stat => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2"
                    >
                      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-white/60">
                        {stat.label}
                      </div>
                      <div className="text-base font-semibold text-white font-['Plus_Jakarta_Sans']">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* Compact Info Row */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                  className="flex flex-wrap items-center gap-3 text-xs text-white/70"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                    <Sparkles className="w-4 h-4 text-white/80" />
                    Open-source starter kit
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-white/80" />
                    Powered by Alpaca API
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Right Panel - Auth Forms */}
            <div className="relative flex items-start justify-center px-4 py-6 overflow-y-auto [@media(min-height:1080px)]:items-center col-span-full lg:col-span-1 lg:p-6 bg-background/50 backdrop-blur-sm safe-top safe-bottom">
              <div className="w-full max-w-md space-y-6 lg:space-y-8">
                <motion.div
                  className="rounded-3xl border border-border/70 bg-card/80 px-6 py-6 shadow-[0_35px_120px_-70px_hsl(var(--primary)/0.6)] backdrop-blur-xl sm:px-8 lg:py-8"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="space-y-4 lg:space-y-6"
                  >
                    <TabsList className="grid w-full grid-cols-2 p-1 border bg-muted/60 backdrop-blur-sm border-border/60">
                      <TabsTrigger
                        value="login"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
                      >
                        <LockIcon className="w-4 h-4 mr-2" />
                        Login
                      </TabsTrigger>
                      <TabsTrigger
                        value="registration"
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300"
                      >
                        <UserPlusIcon className="w-4 h-4 mr-2" />
                        Register
                      </TabsTrigger>
                    </TabsList>

                    <AnimatePresence mode="wait">
                      <TabsContent value="login">
                        <motion.div
                          key="login"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Login />
                        </motion.div>
                      </TabsContent>

                      <TabsContent value="registration">
                        <motion.div
                          key="registration"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Registration />
                        </motion.div>
                      </TabsContent>
                    </AnimatePresence>
                  </Tabs>
                </motion.div>

                <motion.div
                  className="pt-2 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    By using this service, you agree to use it responsibly and
                    in accordance with Alpaca's terms of service.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Secured connection
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginRegPage;
