import React, { ChangeEvent, useState, useCallback, useMemo } from 'react';
import {
  Search,
  CalendarIcon,
  X,
  Filter,
  TrendingUp,
  BarChart3,
  Building2,
  Grid3x3,
  List,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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

type ViewMode = 'grid' | 'list';

const InstrumentsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedExchange, setSelectedExchange] = useState<string>('NSE');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

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

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedExchange === 'NFO') {
      if (optionType) count++;
      if (strikePrice !== null) count++;
      if (expiryAfter) count++;
      if (expiryBefore) count++;
    }
    return count;
  }, [
    searchTerm,
    selectedExchange,
    optionType,
    strikePrice,
    expiryAfter,
    expiryBefore,
  ]);

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
      header={
        <PageHeader>
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            <span>Instruments Explorer</span>
          </div>
        </PageHeader>
      }
      subheader={
        <PageSubHeader>
          {selectedExchange === 'NFO'
            ? `Search and subscribe to ${instrumentType.toLowerCase()}s with advanced filtering options`
            : 'Discover and subscribe to financial instruments across multiple exchanges'}
        </PageSubHeader>
      }
    >
      <PageContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Desktop Filters - Hidden on Mobile */}
          <aside className="hidden lg:block lg:col-span-1 lg:sticky lg:top-20 h-fit">
            <Card className="shadow-premium border-border/50 bg-gradient-to-br from-card/60 to-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="w-5 h-5 text-primary" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="ml-auto">
                      {activeFilterCount}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">{renderFilters()}</CardContent>
            </Card>
          </aside>

          {/* Right Column: Instruments Display */}
          <main className="lg:col-span-3">
            {/* Mobile Filter Button & View Toggle */}
            <div className="flex items-center gap-2 mb-4">
              <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex lg:hidden gap-2 bg-gradient-to-br from-card to-muted/30 border-border/50 shadow-sm"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="default" className="ml-1 h-5 px-1.5">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-primary" />
                      Filter Instruments
                    </SheetTitle>
                    <SheetDescription>
                      Refine your search with advanced filters
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">{renderFilters()}</div>
                </SheetContent>
              </Sheet>

              {/* View Mode Toggle */}
              <div className="hidden sm:flex gap-1 ml-auto p-1 rounded-lg bg-muted/30 border border-border/50">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="gap-2 h-8"
                >
                  <Grid3x3 className="w-4 h-4" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="gap-2 h-8"
                >
                  <List className="w-4 h-4" />
                  List
                </Button>
              </div>
            </div>

            {/* Header Section */}
            <div className="p-6 mb-4 border rounded-2xl border-border/50 bg-gradient-to-br from-card/60 to-muted/30 backdrop-blur-sm shadow-premium">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    {currentExchange?.label} Instruments
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedExchange === 'NFO'
                      ? `Browse ${instrumentType.toLowerCase()}s with advanced filtering`
                      : `Discover ${currentExchange?.description} instruments`}
                  </p>
                </div>
                <Badge
                  className={`${currentExchange?.color} text-white px-3 py-1`}
                >
                  {currentExchange?.label}
                </Badge>
              </div>
              {(searchTerm || activeFilterCount > 0) && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {searchTerm && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border-primary/30 gap-1.5"
                    >
                      <Search className="w-3 h-3" />"{searchTerm}"
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => setSearchTerm('')}
                      />
                    </Badge>
                  )}
                  {selectedExchange === 'NFO' && optionType && (
                    <Badge variant="secondary" className="gap-1.5">
                      {optionType === 'CE' ? '📞 Call' : '📉 Put'}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => setOptionType('')}
                      />
                    </Badge>
                  )}
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              )}
            </div>

            <Card className="shadow-premium border-border/50">
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
                      viewMode={viewMode}
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
                    viewMode,
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
