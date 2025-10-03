import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import type { Instrument as InstrumentType } from '@/types/common-types';
import { Spinner } from '@/components/ui/spinner';
import {
  useGetInstrumentsQuery,
  useGetSubscribedInstrumentsQuery,
  useSubscribeInstrumentMutation,
} from '@/api/instrumentService';
import InstrumentItem from './InstrumentItem';

// Types
interface Props {
  exchange: string;
  searchTerm: string;
  optionType: string;
  strikePrice: number | null;
  expiryAfter: string;
  expiryBefore: string;
  instrumentType?: 'OPTION' | 'FUTURE';
  viewMode?: 'grid' | 'list';
}

// Constants
const SEARCH_DEBOUNCE_DELAY = 500;

const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const Instrument: React.FC<Props> = ({
  exchange,
  searchTerm,
  optionType,
  strikePrice,
  expiryAfter,
  expiryBefore,
  instrumentType,
  viewMode = 'grid',
}) => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [debouncedOptionType, setDebouncedOptionType] = useState(optionType);
  const [debouncedStrikePrice, setDebouncedStrikePrice] = useState(strikePrice);
  const [debouncedExpiryAfter, setDebouncedExpiryAfter] = useState(expiryAfter);
  const [debouncedExpiryBefore, setDebouncedExpiryBefore] =
    useState(expiryBefore);
  const [debouncedInstrumentType, setDebouncedInstrumentType] =
    useState(instrumentType);
  const [subscribingIds, setSubscribingIds] = useState<number[]>([]);

  const [subscribeInstrument] = useSubscribeInstrumentMutation();
  const { refetch } = useGetSubscribedInstrumentsQuery();

  const queryParams = useMemo(
    () => ({
      exchange,
      search: debouncedSearchTerm,
      optionType: debouncedOptionType,
      strikePrice: debouncedStrikePrice,
      expiryAfter: debouncedExpiryAfter,
      expiryBefore: debouncedExpiryBefore,
      instrumentType: debouncedInstrumentType,
    }),
    [
      exchange,
      debouncedSearchTerm,
      debouncedOptionType,
      debouncedStrikePrice,
      debouncedExpiryAfter,
      debouncedExpiryBefore,
      debouncedInstrumentType,
    ]
  );

  const shouldSkipQuery = useMemo(() => {
    return exchange !== 'FON'
      ? debouncedSearchTerm.length < 3
      : debouncedSearchTerm.length < 3 &&
          !debouncedOptionType &&
          !debouncedStrikePrice &&
          !debouncedExpiryAfter &&
          !debouncedExpiryBefore &&
          !debouncedInstrumentType;
  }, [
    exchange,
    debouncedSearchTerm,
    debouncedOptionType,
    debouncedStrikePrice,
    debouncedExpiryAfter,
    debouncedExpiryBefore,
    debouncedInstrumentType,
  ]);

  const { data, isLoading, isError } = useGetInstrumentsQuery(queryParams, {
    skip: shouldSkipQuery,
  });

  const instruments = useMemo(
    () => [...(data?.data || [])].reverse(),
    [data?.data]
  );
  const instrumentsCount = instruments.length;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setDebouncedOptionType(optionType);
      setDebouncedStrikePrice(strikePrice);
      setDebouncedExpiryAfter(expiryAfter);
      setDebouncedExpiryBefore(expiryBefore);
      setDebouncedInstrumentType(instrumentType);
    }, SEARCH_DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [
    searchTerm,
    optionType,
    strikePrice,
    expiryAfter,
    expiryBefore,
    instrumentType,
  ]);

  const handleSubscribe = useCallback(
    async (id: number, duration: number) => {
      setSubscribingIds(prev => [...prev, id]);
      try {
        await subscribeInstrument({ id, duration }).unwrap();
        await refetch();
        toast.success('Instrument Subscribed');
      } catch {
        toast.error('Failed to subscribe to instrument');
      } finally {
        setSubscribingIds(prev => prev.filter(subId => subId !== id));
      }
    },
    [subscribeInstrument, refetch]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full rounded-lg bg-muted/50">
        <Spinner className="w-12 h-12 text-primary" />
        <p className="mt-4 text-lg font-medium text-foreground">
          Loading instruments...
        </p>
        <p className="text-sm text-muted-foreground">
          Please wait while we fetch the latest data.
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center rounded-lg bg-destructive/5">
        <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-destructive/10">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-destructive">
          Error Loading Instruments
        </h3>
        <p className="max-w-md text-sm text-muted-foreground">
          We encountered an issue while fetching instruments. Please try
          refreshing or contact support.
        </p>
      </div>
    );
  }

  if (instrumentsCount === 0) {
    return (
      <motion.div
        {...fadeIn}
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-muted">
          <span className="text-4xl">
            <Search />
          </span>
        </div>
        <h3 className="mb-2 text-xl font-semibold text-foreground">
          No Instruments Found
        </h3>
        <p className="max-w-md text-muted-foreground">
          Try adjusting your search or filter criteria to find what you're
          looking for.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-3 text-sm border-b text-muted-foreground bg-muted/30 border-border">
        <div className="flex items-center justify-between">
          <span>Displaying {instrumentsCount} instruments</span>
          <span className="text-xs">Ready to subscribe</span>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-muted/20">
        <div
          className={cn(
            'grid gap-4',
            viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3'
              : 'grid-cols-1'
          )}
        >
          {instruments.map((instrument: InstrumentType) => (
            <InstrumentItem
              key={instrument.id}
              instrument={instrument}
              onSubscribe={handleSubscribe}
              isSubscribing={subscribingIds.includes(instrument.id)}
              viewMode={viewMode}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Instrument;
