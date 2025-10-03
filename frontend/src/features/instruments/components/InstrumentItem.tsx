import React, { useState, useCallback, memo } from 'react';
import {
  Plus,
  Building2,
  Calendar,
  Target,
  TrendingUp,
  BarChart3,
  Currency,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

import type { Instrument as InstrumentType } from '@/types/common-types';
import { Spinner } from '@/components/ui/spinner';
import DurationSelector from './DurationSelector';
import { useAppSelector } from 'src/app/hooks';
import {
  getHasAlpacaAccount,
  getIsAlpacaAccountLoading,
} from 'src/features/auth/authSlice';

import { useIsMobile } from '@/hooks/useMobile';

interface InstrumentItemProps {
  instrument: InstrumentType;
  onSubscribe: (id: number, duration: number) => Promise<void>;
  isSubscribing: boolean;
  viewMode?: 'grid' | 'list';
}

// Animations
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 },
};

const InstrumentItem: React.FC<InstrumentItemProps> = memo(
  ({ instrument, onSubscribe, isSubscribing, viewMode = 'grid' }) => {
    const hasAlpacaAccount = useAppSelector(getHasAlpacaAccount);
    const isAlpacaAccountLoading = useAppSelector(getIsAlpacaAccountLoading);
    const [duration, setDuration] = useState<number>(4);
    const [showAccountDialog, setShowAccountDialog] = useState(false);
    const isMobile = useIsMobile();

    // Define AccountRequiredContent first
    const AccountRequiredContent = () => (
      <>
        <DialogHeader className="text-center">
          <DialogTitle>Breeze Account Required</DialogTitle>
          <DialogDescription className="text-center">
            You need to create and connect a Breeze account to load instrument
            data. Please set up your Breeze account in the settings to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => setShowAccountDialog(false)}
            className="w-full max-w-xs"
          >
            Got it
          </Button>
        </div>
      </>
    );

    const getTypeConfig = useCallback((series: string) => {
      const configs = {
        OPTION: {
          colors:
            'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300 border-violet-200 dark:border-violet-800',
          gradient: 'from-violet-500 to-fuchsia-500',
          icon: TrendingUp,
        },
        FUTURE: {
          colors:
            'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          gradient: 'from-amber-500 to-orange-500',
          icon: Calendar,
        },
        EQ: {
          colors:
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          gradient: 'from-emerald-500 to-teal-500',
          icon: Currency,
        },
        '0': {
          colors:
            'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          gradient: 'from-blue-500 to-indigo-500',
          icon: BarChart3,
        },
      };
      return configs[series as keyof typeof configs] || configs.EQ;
    }, []);

    const handleSubscribeClick = useCallback(() => {
      if (!hasAlpacaAccount && !isAlpacaAccountLoading) {
        setShowAccountDialog(true);
        return;
      }
      onSubscribe(instrument.id, duration);
    }, [
      onSubscribe,
      instrument.id,
      duration,
      hasAlpacaAccount,
      isAlpacaAccountLoading,
    ]);

    const formatDate = useCallback((dateString?: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }, []);

    const config = getTypeConfig(instrument.series || 'EQ');
    const TypeIcon = config.icon;

    // List view rendering for compact display
    if (viewMode === 'list') {
      return (
        <motion.div {...fadeInUp} className="w-full">
          <Card className="relative overflow-hidden transition-shadow group hover:shadow-lg">
            <div className="absolute inset-0 transition-opacity duration-300 opacity-0 pointer-events-none group-hover:opacity-100">
              <div
                className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-5`}
              />
            </div>

            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                {/* Left: Main Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`${config.colors} text-xs`}
                    >
                      {instrument.series === 'OPTION'
                        ? `${instrument.option_type} Option`
                        : instrument.series === 'FUTURE'
                          ? 'Future'
                          : instrument.series === '0'
                            ? 'Index'
                            : 'Equity'}
                    </Badge>
                    <h3 className="text-lg font-bold truncate md:text-xl text-foreground">
                      {instrument.exchange_code}
                    </h3>
                  </div>

                  {instrument.company_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {instrument.company_name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Middle: Details */}
                <div className="flex flex-wrap gap-3 text-sm md:gap-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="text-xs">🔢</span>
                    <span className="text-xs md:text-sm">
                      {instrument.stock_token || instrument.token}
                    </span>
                  </div>

                  {instrument.strike_price !== null && (
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-primary" />
                      <Badge className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                        ₹{instrument.strike_price}
                      </Badge>
                    </div>
                  )}

                  {instrument.expiry && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-xs md:text-sm">
                        {formatDate(instrument.expiry)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 md:ml-auto">
                  <div className="hidden md:block">
                    <DurationSelector
                      duration={duration}
                      onDurationChange={setDuration}
                    />
                  </div>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSubscribeClick}
                    disabled={isSubscribing || isAlpacaAccountLoading}
                    className="transition-all duration-200 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-lg whitespace-nowrap"
                  >
                    {isSubscribing ? (
                      <>
                        <Spinner className="w-4 h-4 mr-2" />
                        <span className="hidden md:inline">Loading...</span>
                        <span className="md:hidden">Loading</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline">
                          Load {duration}w Data
                        </span>
                        <span className="md:hidden">Load</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Mobile Duration Selector */}
                <div className="w-full md:hidden">
                  <DurationSelector
                    duration={duration}
                    onDurationChange={setDuration}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Dialog/Drawer */}
          {!isMobile && (
            <Dialog
              open={showAccountDialog}
              onOpenChange={setShowAccountDialog}
            >
              <DialogContent className="sm:max-w-md">
                <AccountRequiredContent />
              </DialogContent>
            </Dialog>
          )}

          {isMobile && (
            <Drawer
              open={showAccountDialog}
              onOpenChange={setShowAccountDialog}
            >
              <DrawerContent className="p-6">
                <DrawerHeader className="text-center">
                  <DrawerTitle>Breeze Account Required</DrawerTitle>
                  <DrawerDescription className="text-center">
                    You need to create and connect a Breeze account to load
                    instrument data. Please set up your Breeze account in the
                    settings to continue.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={() => setShowAccountDialog(false)}
                    className="w-full max-w-xs"
                  >
                    Got it
                  </Button>
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </motion.div>
      );
    }

    // Grid view rendering (default)
    return (
      <motion.div {...fadeInUp} className="w-full">
        <Card className="relative h-full overflow-hidden group min-h-[20rem]">
          <div className="absolute inset-0 transition-opacity duration-300 opacity-0 pointer-events-none group-hover:opacity-100">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-5`}
            />
          </div>

          <CardContent className="flex flex-col h-full p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1 min-w-0">
                <Badge variant="secondary" className={`mb-2 ${config.colors}`}>
                  {instrument.series === 'OPTION'
                    ? `${instrument.option_type} Option`
                    : instrument.series === 'FUTURE'
                      ? 'Future'
                      : instrument.series === '0'
                        ? 'Index'
                        : 'Equity'}
                </Badge>
                <h3 className="text-2xl font-bold truncate text-foreground">
                  {instrument.exchange_code}
                </h3>
              </div>
              <TypeIcon className="flex-shrink-0 w-6 h-6 opacity-50 text-muted-foreground" />
            </div>

            <div className="flex-grow mb-6 space-y-4">
              {instrument.company_name && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="flex-shrink-0 w-4 h-4" />
                  <span className="truncate">{instrument.company_name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-xs">🔢</span>
                <span>Token: {instrument.stock_token || instrument.token}</span>
              </div>

              {(instrument.series === 'OPTION' ||
                instrument.series === 'FUTURE') && (
                <div className="space-y-2">
                  {instrument.strike_price !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Strike:</span>
                      <Badge className="font-mono bg-primary/10 text-primary border-primary/20">
                        ₹{instrument.strike_price}
                      </Badge>
                    </div>
                  )}

                  {instrument.expiry && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Expires: {formatDate(instrument.expiry)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 mt-auto space-y-3 border-t border-border">
              <DurationSelector
                duration={duration}
                onDurationChange={setDuration}
              />
              <Button
                variant="default"
                size="sm"
                onClick={handleSubscribeClick}
                disabled={isSubscribing || isAlpacaAccountLoading}
                className="w-full transition-all duration-200 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-lg "
              >
                {isSubscribing ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Loading Data...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Load {duration} Weeks Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Dialog */}
        {!isMobile && (
          <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
            <DialogContent className="sm:max-w-md">
              <AccountRequiredContent />
            </DialogContent>
          </Dialog>
        )}

        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer open={showAccountDialog} onOpenChange={setShowAccountDialog}>
            <DrawerContent className="p-6">
              <DrawerHeader className="text-center">
                <DrawerTitle>Breeze Account Required</DrawerTitle>
                <DrawerDescription className="text-center">
                  You need to create and connect a Breeze account to load
                  instrument data. Please set up your Breeze account in the
                  settings to continue.
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => setShowAccountDialog(false)}
                  className="w-full max-w-xs"
                >
                  Got it
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </motion.div>
    );
  }
);

InstrumentItem.displayName = 'InstrumentItem';

export default InstrumentItem;
