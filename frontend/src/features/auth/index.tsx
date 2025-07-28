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
    <div className="h-[100dvh] p-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 dark:from-gray-900 dark:via-purple-900 dark:to-violet-900">
      {/* Animated background elements */}
      <div className="fixed inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/5 animate-pulse"
            style={{
              width: Math.random() * 300 + 50 + 'px',
              height: Math.random() * 300 + 50 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDuration: Math.random() * 3 + 2 + 's',
              animationDelay: Math.random() * 2 + 's',
            }}
          />
        ))}
      </div>

      <div className="relative flex items-center justify-center h-full py-8 mx-auto ">
        <motion.div
          className="w-full max-w-5xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="grid grid-cols-1 overflow-hidden bg-white shadow-2xl lg:grid-cols-5 dark:bg-gray-800/95 backdrop-blur-lg">
            {/* Left Panel - Features */}
            <div className="relative hidden col-span-2 p-8 text-white md:block bg-gradient-to-br from-indigo-600 to-purple-700">
              <div className="sticky space-y-8 top-8">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold">ICICI Breeze</h1>
                  <p className="text-lg text-indigo-100">
                    Your gateway to intelligent trading
                  </p>
                </div>

                <div className="space-y-6">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                      className="flex items-start space-x-3 group"
                    >
                      <div className="p-2 rounded-lg bg-white/10 backdrop-blur-lg">
                        {feature.icon}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-medium">{feature.title}</h3>
                        <p className="text-sm text-indigo-100">
                          {feature.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-4">
                  <div className="p-4 rounded-lg bg-white/10 backdrop-blur-lg">
                    <p className="text-sm text-indigo-100">
                      "Experience the future of trading with our advanced
                      platform"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Auth Forms */}
            <div className="col-span-full p-8 max-h-[90vh] overflow-y-auto md:col-span-3">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-6"
              >
                <TabsList className="sticky top-0 z-10 grid w-full grid-cols-2 bg-white dark:bg-gray-800">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                  >
                    <LockIcon className="w-4 h-4 mr-2" />
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="registration"
                    className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
                  >
                    <UserPlusIcon className="w-4 h-4 mr-2" />
                    Register
                  </TabsTrigger>
                </TabsList>

                <motion.div className="relative">
                  <TabsContent value="login">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4"
                    >
                      <Login />
                    </motion.div>
                  </TabsContent>

                  <TabsContent value="registration">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4"
                    >
                      <Registration />
                    </motion.div>
                  </TabsContent>
                </motion.div>
              </Tabs>

              <motion.div
                className="mt-6 text-center text-gray-500 dark:text-gray-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-sm">
                  By using this service, you agree to our{' '}
                  <a
                    href="#"
                    className="text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="#"
                    className="text-indigo-600 hover:underline dark:text-indigo-400"
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
