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
      title: 'Real-time Market Data',
      description: 'WebSocket streaming for live market updates',
    },
    {
      icon: <BarChart4 className="w-5 h-5" />,
      title: 'TradingView Charts',
      description: 'Professional charting with technical indicators',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Django REST API',
      description: 'Robust backend with Python/Django',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: 'Docker Ready',
      description: 'Easy deployment with Docker orchestration',
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: 'Free Tier Included',
      description: 'Start with 30 assets at no cost',
    },
  ];

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Modern Grid Background */}
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

      {/* Animated gradient orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px]"
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
          className="absolute w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px]"
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
            <div className="relative hidden col-span-2 p-12 overflow-y-auto lg:block bg-gradient-to-br from-primary via-primary/90 to-accent">
              <div className="max-w-xl space-y-8">
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
                      <h3 className="text-xl font-bold text-white">
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
                  className="space-y-4"
                >
                  <h1 className="text-3xl font-bold leading-tight text-white">
                    Market Data Streaming Platform
                  </h1>
                  <p className="text-lg leading-relaxed text-white/80">
                    Full-stack starter kit for building real-time trading
                    dashboards with Django, React, and TradingView
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <TrendingUp className="w-5 h-5 text-white/80" />
                    <span className="text-sm text-white/70">
                      Powered by Alpaca API
                    </span>
                  </div>
                </motion.div>

                {/* Features List */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="space-y-4 "
                >
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                      className="flex items-start gap-4 p-4 transition-all duration-300 border cursor-pointer rounded-xl bg-white/10 backdrop-blur-sm border-white/10 hover:bg-white/15 group"
                    >
                      <div className="p-2.5 rounded-lg bg-white/10 text-white group-hover:scale-110 transition-transform duration-300">
                        {feature.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="font-semibold text-white transition-transform duration-300 group-hover:translate-x-1">
                          {feature.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-white/70">
                          {feature.description}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 transition-opacity duration-300 opacity-0 text-white/50 group-hover:opacity-100" />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Info Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  className="relative p-6 overflow-hidden border rounded-2xl bg-white/10 backdrop-blur-sm border-white/10"
                >
                  <motion.div
                    className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white/50 via-white/80 to-white/50"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{
                      duration: 3,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: 'linear',
                    }}
                  />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-white/80" />
                      <span className="text-sm font-medium text-white/90">
                        Open Source Starter Kit
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-white/70">
                      A production-ready foundation for building market data
                      applications with real-time WebSocket streaming,
                      professional charts, and Docker deployment.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Right Panel - Auth Forms */}
            <div className="relative flex items-start justify-center px-4 py-6 overflow-y-auto [@media(min-height:1080px)]:items-center col-span-full lg:col-span-1 lg:p-6 bg-background/50 backdrop-blur-sm safe-top safe-bottom">
              <div className="w-full max-w-md space-y-6 lg:space-y-8">
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="space-y-4 lg:space-y-6"
                >
                  <TabsList className="grid w-full grid-cols-2 p-1 border bg-muted/50 backdrop-blur-sm border-border/50">
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

                <motion.div
                  className="pt-4 mt-4 text-center border-t lg:pt-6 lg:mt-6 border-border/50"
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
