import React, { ChangeEvent, useState, useCallback, useMemo } from 'react';
import {
  Search,
  CalendarIcon,
  X,
  Filter,
  TrendingUp,
  BarChart3,
  Building2,
} from 'lucide-react';
import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
} from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Instrument from './components/Instrument';

interface Exchange {
  value: string;
  label: string;
  instrumentExchange: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const InstrumentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedExchange, setSelectedExchange] = useState<string>('NSE');

  // NFO specific filters
  const [instrumentType, setInstrumentType] = useState<'OPTION' | 'FUTURE'>(
    'OPTION'
  );
  const [optionType, setOptionType] = useState<string>('');
  const [strikePrice, setStrikePrice] = useState<number | null>(null);
  const [expiryAfter, setExpiryAfter] = useState<Date | undefined>(undefined);
  const [expiryBefore, setExpiryBefore] = useState<Date | undefined>(undefined);

  const exchanges: Exchange[] = useMemo(
    () => [
      {
        value: 'NSE',
        label: 'NSE',
        instrumentExchange: 'NSE',
        icon: Building2,
        description: 'National Stock Exchange',
        color: 'bg-blue-500',
      },
      {
        value: 'BSE',
        label: 'BSE',
        instrumentExchange: 'BSE',
        icon: BarChart3,
        description: 'Bombay Stock Exchange',
        color: 'bg-green-500',
      },
      {
        value: 'NFO',
        label: 'NFO',
        instrumentExchange: 'FON',
        icon: TrendingUp,
        description: 'NSE Futures & Options',
        color: 'bg-purple-500',
      },
    ],
    []
  );

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const resetNFOFilters = useCallback(() => {
    setOptionType('');
    setStrikePrice(null);
    setExpiryAfter(undefined);
    setExpiryBefore(undefined);
  }, []);

  const handleExchangeChange = useCallback(
    (value: string) => {
      setSelectedExchange(value);
      if (value !== 'NFO') {
        resetNFOFilters();
      }
    },
    [resetNFOFilters]
  );

  const handleInstrumentTypeChange = useCallback(
    (type: 'OPTION' | 'FUTURE') => {
      setInstrumentType(type);
      if (type === 'FUTURE') {
        setOptionType('');
        setStrikePrice(null);
      }
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    resetNFOFilters();
  }, [resetNFOFilters]);

  const currentExchange = useMemo(
    () => exchanges.find(ex => ex.value === selectedExchange),
    [exchanges, selectedExchange]
  );

  const renderFilters = () => (
    <div className="space-y-6">
      {/* Search Bar */}
      <div>
        <div className="relative">
          <Search className="absolute w-5 h-5 transform -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search instruments..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 text-base rounded-lg shadow-sm h-11 bg-background border-border focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="absolute p-0 transform -translate-y-1/2 w-7 h-7 right-2 top-1/2 hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Exchange Selection */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
          Exchanges
        </h3>
        <div className="inline-flex flex-wrap w-full gap-1 p-1 border rounded-md border-border/50 bg-card/60">
          {exchanges.map(exchange => {
            const Icon = exchange.icon;
            const isActive = selectedExchange === exchange.value;
            return (
              <Button
                key={exchange.value}
                type="button"
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 gap-1 px-2"
                onClick={() => handleExchangeChange(exchange.value)}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{exchange.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* NFO Advanced Filters */}
      <AnimatePresence>
        {selectedExchange === 'NFO' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <Separator className="my-6" />
            <div>
              <h3 className="flex items-center mb-4 text-lg font-semibold text-primary">
                <Filter className="w-5 h-5 mr-2" />
                Advanced Filters
              </h3>
              <div className="space-y-4">
                {/* Instrument Type */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-between w-full bg-background"
                    >
                      <span>
                        {instrumentType === 'OPTION'
                          ? '📈 Options'
                          : '📊 Futures'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                    <DropdownMenuItem
                      onClick={() => handleInstrumentTypeChange('OPTION')}
                    >
                      📈 Options
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleInstrumentTypeChange('FUTURE')}
                    >
                      📊 Futures
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Option Type (Only for Options) */}
                {instrumentType === 'OPTION' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-between w-full bg-background"
                      >
                        <span>
                          {optionType
                            ? optionType === 'CE'
                              ? '📞 Call'
                              : '📉 Put'
                            : 'Option Type'}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                      <DropdownMenuItem onClick={() => setOptionType('')}>
                        All Types
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setOptionType('CE')}>
                        📞 Call (CE)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setOptionType('PE')}>
                        📉 Put (PE)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Strike Price (Only for Options) */}
                {instrumentType === 'OPTION' && (
                  <Input
                    type="number"
                    placeholder="Strike Price"
                    value={strikePrice === null ? '' : strikePrice}
                    onChange={e =>
                      setStrikePrice(
                        e.target.value === '' ? null : Number(e.target.value)
                      )
                    }
                    className="w-full bg-background"
                  />
                )}

                {/* Expiry Filters */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-background',
                        !expiryAfter && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {expiryAfter
                        ? format(expiryAfter, 'PPP')
                        : 'Expiry After'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expiryAfter}
                      onSelect={setExpiryAfter}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal bg-background',
                        !expiryBefore && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {expiryBefore
                        ? format(expiryBefore, 'PPP')
                        : 'Expiry Before'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expiryBefore}
                      onSelect={setExpiryBefore}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {/* Clear Filters */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="w-full text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <PageLayout
      header={<PageHeader>Instruments Explorer</PageHeader>}
      subheader={
        <PageSubHeader>
          {selectedExchange === 'NFO'
            ? `Search and subscribe to ${instrumentType.toLowerCase()}s with advanced filtering options`
            : 'Discover and subscribe to financial instruments across multiple exchanges'}
        </PageSubHeader>
      }
    >
      <PageContent>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Left Column: Filters */}
          <aside className="lg:col-span-1 lg:sticky lg:top-20 h-fit">
            <Card className="shadow-sm border-border/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">{renderFilters()}</CardContent>
            </Card>
          </aside>

          {/* Right Column: Instruments Display */}
          <main className="lg:col-span-3">
            <div className="p-4 mb-4 border rounded-xl border-border/40 bg-surface-gradient">
              <h2 className="text-xl font-semibold text-foreground">
                {currentExchange?.label} Instruments
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedExchange === 'NFO'
                  ? `Browse ${instrumentType.toLowerCase()}s with advanced filtering`
                  : `Discover ${currentExchange?.description} instruments`}
              </p>
              {searchTerm && (
                <div className="mt-2">
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    Searching: "{searchTerm}"
                  </Badge>
                </div>
              )}
            </div>
            <Card className="shadow-sm border-border/40">
              <CardContent className="h-full p-0">
                {useMemo(
                  () => (
                    <Instrument
                      exchange={currentExchange?.instrumentExchange || 'NSE'}
                      searchTerm={searchTerm}
                      optionType={selectedExchange === 'NFO' ? optionType : ''}
                      strikePrice={
                        selectedExchange === 'NFO' ? strikePrice : null
                      }
                      expiryAfter={
                        selectedExchange === 'NFO' && expiryAfter
                          ? format(expiryAfter, 'yyyy-MM-dd')
                          : ''
                      }
                      expiryBefore={
                        selectedExchange === 'NFO' && expiryBefore
                          ? format(expiryBefore, 'yyyy-MM-dd')
                          : ''
                      }
                      instrumentType={
                        selectedExchange === 'NFO' ? instrumentType : undefined
                      }
                    />
                  ),
                  [
                    currentExchange?.instrumentExchange,
                    searchTerm,
                    selectedExchange,
                    optionType,
                    strikePrice,
                    expiryAfter,
                    expiryBefore,
                    instrumentType,
                  ]
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default InstrumentsPage;
