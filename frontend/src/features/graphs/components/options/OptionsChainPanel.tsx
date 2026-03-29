/**
 * OptionsChainPanel.tsx
 *
 * A sheet panel that displays the options chain for an underlying equity.
 * Shows calls and puts grouped by expiration date, with greeks and quotes.
 * Clicking a row opens OptionBarsDialog to view the option's price history.
 */
import React, { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { TrendingUp, TrendingDown, ChevronDown, RefreshCw, AlertCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Asset, OptionSnapshot } from '@/types/common-types';
import { useGetOptionChainQuery } from '@/api/assetService';
import OptionBarsDialog from './OptionBarsDialog';

interface OptionsChainPanelProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type OptionType = 'call' | 'put';

interface OptionRow {
  symbol: string;
  snapshot: OptionSnapshot;
}

function fmt(val: number | string | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || val === '') return '—';
  const n = Number(val);
  if (isNaN(n)) return '—';
  return n.toFixed(decimals);
}

function fmtK(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '—';
  const n = Number(val);
  if (isNaN(n)) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

const OptionsChainPanel: React.FC<OptionsChainPanelProps> = ({
  asset,
  open,
  onOpenChange,
}) => {
  const today = useMemo(() => new Date(), []);

  const expiryRanges = useMemo(() => {
    const todayStr = format(today, 'yyyy-MM-dd');
    return [
      { label: '1 week', gte: todayStr, lte: format(addDays(today, 7), 'yyyy-MM-dd') },
      { label: '2 weeks', gte: todayStr, lte: format(addDays(today, 14), 'yyyy-MM-dd') },
      { label: '1 month', gte: todayStr, lte: format(addDays(today, 30), 'yyyy-MM-dd') },
      { label: '45 days', gte: todayStr, lte: format(addDays(today, 45), 'yyyy-MM-dd') },
      { label: '3 months', gte: todayStr, lte: format(addDays(today, 90), 'yyyy-MM-dd') },
      { label: '6 months', gte: todayStr, lte: format(addDays(today, 180), 'yyyy-MM-dd') },
    ];
  }, [today]);

  const defaultExpiryGte = expiryRanges[3].gte;
  const defaultExpiryLte = expiryRanges[3].lte;

  const [optionType, setOptionType] = useState<OptionType>('call');
  const [expiryGte, setExpiryGte] = useState(defaultExpiryGte);
  const [expiryLte, setExpiryLte] = useState(defaultExpiryLte);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isBarsOpen, setIsBarsOpen] = useState(false);

  const activeRangeLabel =
    expiryRanges.find(r => r.gte === expiryGte && r.lte === expiryLte)?.label ?? 'Custom';

  const { data, isFetching, isError, refetch } = useGetOptionChainQuery(
    {
      id: asset.id,
      expiration_date_gte: expiryGte,
      expiration_date_lte: expiryLte,
      type: optionType,
      limit: 200,
    },
    { skip: !open }
  );

  const rows: OptionRow[] = useMemo(() => {
    const snapshots = data?.data?.snapshots ?? {};
    return Object.entries(snapshots)
      .map(([symbol, snapshot]) => ({ symbol, snapshot }))
      .sort((a, b) => {
        const strikeA = Number(a.snapshot.details?.strikePrice ?? 0);
        const strikeB = Number(b.snapshot.details?.strikePrice ?? 0);
        return strikeA - strikeB;
      });
  }, [data]);

  const handleRowClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    setIsBarsOpen(true);
  };

  const handleRangeSelect = (range: (typeof expiryRanges)[0]) => {
    setExpiryGte(range.gte);
    setExpiryLte(range.lte);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[70vh] flex flex-col p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">
                Options Chain —{' '}
                <span className="text-primary">{asset.symbol}</span>
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              </Button>
            </div>

            {/* Filters row */}
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {/* Call / Put tabs */}
              <Tabs
                value={optionType}
                onValueChange={v => setOptionType(v as OptionType)}
              >
                <TabsList className="h-7">
                  <TabsTrigger value="call" className="h-5 px-3 text-xs">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Calls
                  </TabsTrigger>
                  <TabsTrigger value="put" className="h-5 px-3 text-xs">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Puts
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Expiry range dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 gap-1 text-xs">
                    Expiry: {activeRangeLabel}
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {expiryRanges.map(r => (
                    <DropdownMenuItem
                      key={r.label}
                      onClick={() => handleRangeSelect(r)}
                      className={cn(
                        'text-xs',
                        r.label === activeRangeLabel && 'bg-accent'
                      )}
                    >
                      {r.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {!isFetching && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {rows.length} contracts
                </span>
              )}
            </div>
          </SheetHeader>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {isError ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <AlertCircle className="w-6 h-6" />
                <p className="text-sm">Failed to load options chain</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-background border-b z-10">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      Strike
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      Last
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      Bid
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      Ask
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      IV
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      Δ Delta
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      Γ Gamma
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      Θ Theta
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      OI
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      Expiry
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isFetching
                    ? Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i} className="border-b">
                          {Array.from({ length: 10 }).map((_, j) => (
                            <td key={j} className="px-3 py-2">
                              <Skeleton className="h-3 w-12" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : rows.map(({ symbol, snapshot }) => {
                        const strike = Number(snapshot.details?.strikePrice ?? 0);
                        const last = snapshot.latestTrade?.price ?? null;
                        const bid = snapshot.latestQuote?.bidPrice ?? null;
                        const ask = snapshot.latestQuote?.askPrice ?? null;
                        const iv = snapshot.impliedVolatility;
                        const delta = snapshot.greeks?.delta ?? null;
                        const gamma = snapshot.greeks?.gamma ?? null;
                        const theta = snapshot.greeks?.theta ?? null;
                        const oi = snapshot.details?.openInterest ?? null;
                        const expiry = snapshot.details?.expirationDate ?? '';

                        const isCall = optionType === 'call';
                        const deltaColor =
                          delta !== null
                            ? isCall
                              ? 'text-emerald-500'
                              : 'text-red-500'
                            : '';

                        return (
                          <tr
                            key={symbol}
                            className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => handleRowClick(symbol)}
                          >
                            <td className="px-3 py-2 font-medium">
                              <div className="flex items-center gap-1.5">
                                ${fmt(strike, 0)}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] px-1 py-0 h-4',
                                    isCall
                                      ? 'border-emerald-500/50 text-emerald-500'
                                      : 'border-red-500/50 text-red-500'
                                  )}
                                >
                                  {isCall ? 'C' : 'P'}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {last !== null ? `$${fmt(last)}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                              {bid !== null ? `$${fmt(bid)}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                              {ask !== null ? `$${fmt(ask)}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {iv !== null ? `${fmt(iv * 100, 1)}%` : '—'}
                            </td>
                            <td className={cn('px-3 py-2 text-right font-mono', deltaColor)}>
                              {fmt(delta, 3)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                              {fmt(gamma, 4)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-red-400">
                              {fmt(theta, 3)}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {fmtK(oi)}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                              {expiry}
                            </td>
                          </tr>
                        );
                      })}
                  {!isFetching && rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                        No options found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {selectedSymbol && (
        <OptionBarsDialog
          symbol={selectedSymbol}
          open={isBarsOpen}
          onOpenChange={open => {
            setIsBarsOpen(open);
            if (!open) setSelectedSymbol(null);
          }}
        />
      )}
    </>
  );
};

export default OptionsChainPanel;
