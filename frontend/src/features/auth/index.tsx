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
  Activity,
} from 'lucide-react';
import Login from './components/Login';
import Registration from './components/Registration';

const LoginRegPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('login');

  const features = [
    {
      icon: <LineChart className="w-4 h-4" />,
      title: 'Real-time Streaming',
      description: 'WebSocket feeds for live market data',
    },
    {
      icon: <BarChart4 className="w-4 h-4" />,
      title: 'TradingView Charts',
      description: 'Professional charting with indicators',
    },
    {
      icon: <Shield className="w-4 h-4" />,
      title: 'Django REST API',
      description: 'Robust Python/Django backend',
    },
    {
      icon: <Clock className="w-4 h-4" />,
      title: 'Docker Ready',
      description: 'Containerized deployment',
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      title: 'Free Tier',
      description: 'Start with 30 assets at no cost',
    },
  ];

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-background">
      {/* Terminal grid background */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--primary)) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glow accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative w-full h-full">
        <motion.div
          className="w-full h-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
        >
          <Card className="grid w-full h-full grid-cols-1 overflow-hidden border-0 rounded-none shadow-none lg:grid-cols-5 bg-background">
            {/* Left Panel - Features - Takes 3/5 of screen */}
            <div className="relative hidden col-span-3 p-8 overflow-y-auto border-r lg:flex lg:flex-col lg:justify-center bg-card border-border/40">
              {/* Subtle radial glow */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-transparent" />

              <div className="relative max-w-lg space-y-6">
                {/* Logo/Brand */}
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center rounded size-8 bg-primary/10 ring-1 ring-primary/20">
                      <img
                        src="/android-chrome-192x192.png"
                        alt="Alpaca Logo"
                        className="size-8"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        Alpaca Trading
                      </h3>
                      <Badge
                        variant="outline"
                        className="mt-0.5 text-[10px] h-4 font-mono border-primary/30 text-primary"
                      >
                        <Activity className="w-2.5 h-2.5 mr-0.5" />
                        Open Source
                      </Badge>
                    </div>
                  </div>
                </motion.div>

                {/* Main Heading */}
                <motion.div
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="space-y-2"
                >
                  <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
                    Market Data
                    <span className="text-primary"> Streaming</span> Platform
                  </h1>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    Full-stack starter kit for building real-time trading
                    dashboards with Django, React, and TradingView
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <TrendingUp className="w-3.5 h-3.5 text-primary/60" />
                    <span className="text-[11px] font-mono text-muted-foreground/70">
                      Powered by Alpaca API
                    </span>
                  </div>
                </motion.div>

                {/* Features List - Compact */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="space-y-2"
                >
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 + index * 0.06 }}
                      className="flex items-center gap-3 p-2.5 transition-all duration-150 border rounded cursor-pointer bg-background/50 border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] group"
                    >
                      <div className="p-1.5 rounded bg-primary/8 text-primary group-hover:bg-primary/12 transition-colors">
                        {feature.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[12px] font-semibold text-foreground group-hover:text-primary transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground/70">
                          {feature.description}
                        </p>
                      </div>
                      <ChevronRight className="w-3 h-3 transition-opacity duration-200 opacity-0 text-primary/40 group-hover:opacity-100" />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Info Card */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.7 }}
                  className="relative p-4 overflow-hidden border rounded bg-muted/30 border-border/40"
                >
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary/70" />
                      <span className="text-[11px] font-semibold text-foreground/80">
                        Open Source Starter Kit
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground/70">
                      Production-ready foundation for market data applications
                      with real-time WebSocket streaming and Docker deployment.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Right Panel - Auth Forms - 2/5 */}
            <div className="relative flex items-start justify-center px-4 py-6 overflow-y-auto [@media(min-height:1080px)]:items-center col-span-full lg:col-span-2 lg:p-5 bg-background safe-top safe-bottom">
              <div className="w-full max-w-sm space-y-4 lg:space-y-5">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="space-y-3 lg:space-y-4"
                >
                  <TabsList className="grid w-full grid-cols-2 p-0.5 h-8 bg-muted/50 border border-border/50">
                    <TabsTrigger
                      value="login"
                      className="text-[12px] h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200"
                    >
                      <LockIcon className="w-3 h-3 mr-1.5" />
                      Login
                    </TabsTrigger>
                    <TabsTrigger
                      value="registration"
                      className="text-[12px] h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all duration-200"
                    >
                      <UserPlusIcon className="w-3 h-3 mr-1.5" />
                      Register
                    </TabsTrigger>
                  </TabsList>

                  <AnimatePresence mode="wait">
                    <TabsContent value="login">
                      <motion.div
                        key="login"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Login />
                      </motion.div>
                    </TabsContent>

                    <TabsContent value="registration">
                      <motion.div
                        key="registration"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Registration />
                      </motion.div>
                    </TabsContent>
                  </AnimatePresence>
                </Tabs>

                <motion.div
                  className="pt-3 mt-3 text-center border-t border-border/30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <p className="text-[10px] leading-relaxed text-muted-foreground/60">
                    By using this service, you agree to use it responsibly and
                    in accordance with Alpaca's terms of service.
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <Shield className="w-3 h-3 text-primary/40" />
                    <span className="text-[10px] font-mono text-muted-foreground/50">
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
