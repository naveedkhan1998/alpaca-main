import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LockIcon,
  UserPlusIcon,
  LineChart,
  Shield,
  BarChart4,
  Clock,
  Smartphone,
} from 'lucide-react';
import Login from './components/Login';
import Registration from './components/Registration';

const LoginRegPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('login');

  const features = [
    {
      icon: <LineChart className="w-5 h-5" />,
      title: 'Real-time Market Data',
      description: 'Access live market insights instantly',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Secure Transactions',
      description: 'Bank-grade security for your peace of mind',
    },
    {
      icon: <BarChart4 className="w-5 h-5" />,
      title: 'Advanced Analytics',
      description: 'Comprehensive portfolio analysis tools',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: '24/7 Trading',
      description: 'Trade anytime, anywhere',
    },
    {
      icon: <Smartphone className="w-5 h-5" />,
      title: 'Mobile Access',
      description: 'Seamless mobile trading experience',
    },
  ];

  return (
    <div className="h-[100dvh] p-4 gradient-aurora bg-gradient-to-br from-primary/30 via-accent/20 to-success/15 dark:from-background dark:via-card/50 dark:to-background relative overflow-hidden">
      {/* Enhanced animated background elements */}
      <div className="fixed inset-0 gradient-mesh"></div>
      <div className="fixed inset-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-sm"
            style={{
              width: Math.random() * 200 + 80 + 'px',
              height: Math.random() * 200 + 80 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 15, 0],
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: Math.random() * 4 + 4,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <div className="relative flex items-center justify-center h-full py-8 mx-auto">
        <motion.div
          className="w-full max-w-5xl"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Card className="grid grid-cols-1 overflow-hidden glass-card shadow-glass dark:shadow-glass-dark lg:grid-cols-5 border border-white/20 dark:border-white/10">
            {/* Left Panel - Features */}
            <div className="relative hidden col-span-2 p-8 text-white md:block bg-gradient-to-br from-primary/90 via-accent/80 to-primary/70 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"></div>
              <div className="relative space-y-8">
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent">
                    Alpaca API for North American Market Data
                  </h1>
                  <p className="text-lg text-white/80">
                    Your gateway to intelligent trading
                  </p>
                </motion.div>

                <motion.div 
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                      className="flex items-start space-x-4 group cursor-pointer"
                      whileHover={{ x: 5, transition: { duration: 0.2 } }}
                    >
                      <div className="p-3 rounded-xl bg-white/20 backdrop-blur-lg border border-white/30 group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                        {feature.icon}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold text-white">{feature.title}</h3>
                        <p className="text-sm text-white/70">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div 
                  className="pt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                >
                  <div className="p-4 rounded-xl bg-white/15 backdrop-blur-lg border border-white/20">
                    <p className="text-sm text-white/90 italic">
                      "Experience the future of trading with our advanced platform"
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Right Panel - Auth Forms */}
            <div className="col-span-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto md:col-span-3 bg-card/50 backdrop-blur-xl">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-6"
              >
                <TabsList className="sticky top-0 z-10 grid w-full grid-cols-2 glass-card border border-border/30">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:glass-button data-[state=active]:text-primary-foreground transition-all duration-300"
                  >
                    <LockIcon className="w-4 h-4 mr-2" />
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="registration"
                    className="data-[state=active]:glass-button data-[state=active]:text-primary-foreground transition-all duration-300"
                  >
                    <UserPlusIcon className="w-4 h-4 mr-2" />
                    Register
                  </TabsTrigger>
                </TabsList>

                <motion.div className="relative">
                  <TabsContent value="login">
                    <motion.div
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.95 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="mt-6"
                    >
                      <Login />
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="registration">
                    <motion.div
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.95 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="mt-6"
                    >
                      <Registration />
                    </motion.div>
                  </TabsContent>
                </motion.div>
              </Tabs>

              <motion.div
                className="mt-8 text-center text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <p className="text-sm">
                  By using this service, you agree to our{' '}
                  <a
                    href="#"
                    className="text-primary hover:text-primary/80 hover:underline transition-colors duration-200"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="#"
                    className="text-primary hover:text-primary/80 hover:underline transition-colors duration-200"
                  >
                    Privacy Policy
                  </a>
                </p>
              </motion.div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginRegPage;
