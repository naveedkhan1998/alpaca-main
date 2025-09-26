import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';

import type { Asset } from '@/types/common-types';
import {
  useCancelPaperTradeMutation,
  useClosePaperTradeMutation,
  useCreatePaperTradeMutation,
  useDeletePaperTradeMutation,
  useGetPaperTradesQuery,
} from 'src/features/paperTrading/paperTradingApi';
import type {
  PaperTrade,
  PaperTradeDirection,
} from 'src/features/paperTrading/types';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface PaperTradingPanelProps {
  asset?: Asset;
  currentPrice?: number;
  enabled?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const formatCurrency = (value?: string | number | null) => {
  if (value === null || value === undefined) return '--';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numeric)) return '--';
  return currencyFormatter.format(numeric);
};

const statusVariant: Record<string, 'secondary' | 'destructive' | 'default'> = {
  OPEN: 'secondary',
  CLOSED: 'default',
  CANCELLED: 'destructive',
};

const directionIcon: Record<PaperTradeDirection, React.ReactNode> = {
  LONG: <TrendingUp className="w-3.5 h-3.5" />,
  SHORT: <TrendingDown className="w-3.5 h-3.5" />,
};

const PaperTradingPanel: React.FC<PaperTradingPanelProps> = ({
  asset,
  currentPrice,
  enabled = true,
}) => {
  const { toast } = useToast();
  const [direction, setDirection] = useState<PaperTradeDirection>('LONG');
  const [quantity, setQuantity] = useState('1');
  const [entryPrice, setEntryPrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [closingTradeId, setClosingTradeId] = useState<number | null>(null);
  const [closingPrice, setClosingPrice] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [entryDirty, setEntryDirty] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isAssetAvailable = Boolean(asset);

  useEffect(() => {
    if (currentPrice !== undefined && !entryDirty) {
      setEntryPrice(currentPrice.toFixed(2));
    }
  }, [currentPrice, entryDirty]);

  useEffect(() => {
    if (!asset) {
      setEntryPrice('');
      setTargetPrice('');
      setStopLoss('');
      setTakeProfit('');
      setNotes('');
      setFormError(null);
    }
  }, [asset]);

  useEffect(() => {
    setClosingTradeId(null);
    setClosingPrice('');
    setClosingNotes('');
  }, [asset?.id]);

  const {
    data: trades,
    isFetching,
    refetch,
  } = useGetPaperTradesQuery(
    asset
      ? {
          assetId: asset.id,
          currentPrice,
        }
      : undefined,
    {
      skip: !asset || !enabled,
    }
  );

  useEffect(() => {
    if (trades) {
      setLastUpdated(new Date());
    }
  }, [trades]);

  const [createTrade, { isLoading: isCreating }] = useCreatePaperTradeMutation();
  const [closeTrade, { isLoading: isClosing }] = useClosePaperTradeMutation();
  const [cancelTrade, { isLoading: isCancelling }] =
    useCancelPaperTradeMutation();
  const [deleteTrade, { isLoading: isDeleting }] =
    useDeletePaperTradeMutation();

  const openTrades = useMemo(
    () => trades?.filter(trade => trade.status === 'OPEN') ?? [],
    [trades]
  );

  const closedTrades = useMemo(
    () => trades?.filter(trade => trade.status !== 'OPEN') ?? [],
    [trades]
  );

  const summary = useMemo(() => {
    if (!trades || trades.length === 0) {
      return { openCount: 0, openPnL: 0, closedCount: 0, realizedPnL: 0 };
    }

    return trades.reduce(
      (acc, trade) => {
        if (trade.status === 'OPEN') {
          acc.openCount += 1;
          const unrealized = Number(trade.unrealized_pl ?? 0);
          if (!Number.isNaN(unrealized)) {
            acc.openPnL += unrealized;
          }
        } else if (trade.status === 'CLOSED') {
          acc.closedCount += 1;
          const realized = Number(trade.realized_pl ?? 0);
          if (!Number.isNaN(realized)) {
            acc.realizedPnL += realized;
          }
        }
        return acc;
      },
      { openCount: 0, openPnL: 0, closedCount: 0, realizedPnL: 0 }
    );
  }, [trades]);

  const resetForm = () => {
    setDirection('LONG');
    setQuantity('1');
    setEntryPrice(
      currentPrice !== undefined ? currentPrice.toFixed(2) : ''
    );
    setTargetPrice('');
    setStopLoss('');
    setTakeProfit('');
    setNotes('');
    setFormError(null);
    setEntryDirty(false);
  };

  const handleCreateTrade = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (!asset) {
      setFormError('Select an asset to open a paper trade.');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setFormError('Quantity must be greater than zero.');
      return;
    }
    if (!entryPrice || Number(entryPrice) <= 0) {
      setFormError('Entry price must be greater than zero.');
      return;
    }

    try {
      await createTrade({
        asset: asset.id,
        direction,
        quantity,
        entry_price: entryPrice,
        target_price: targetPrice || undefined,
        stop_loss: stopLoss || undefined,
        take_profit: takeProfit || undefined,
        notes: notes || undefined,
      }).unwrap();

      toast({
        title: 'Paper trade opened',
        description: `${direction === 'LONG' ? 'Long' : 'Short'} ${quantity} ${asset.symbol} @ ${entryPrice}`,
      });
      resetForm();
    } catch (error) {
      console.error('Failed to create paper trade', error);
      const detail =
        (error as { data?: { detail?: string } }).data?.detail ??
        'Unable to create paper trade.';
      setFormError(detail);
      toast({
        title: 'Unable to open trade',
        description: detail,
        variant: 'destructive',
      });
    }
  };

  const beginClosingTrade = (trade: PaperTrade) => {
    setClosingTradeId(trade.id);
    setClosingPrice(
      currentPrice !== undefined ? currentPrice.toFixed(2) : trade.entry_price
    );
    setClosingNotes('');
  };

  const handleConfirmClose = async () => {
    if (!closingTradeId) return;
    if (!closingPrice || Number(closingPrice) <= 0) {
      toast({
        title: 'Exit price required',
        description: 'Provide a valid exit price to close the trade.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await closeTrade({
        id: closingTradeId,
        exit_price: closingPrice,
        notes: closingNotes || undefined,
      }).unwrap();

      toast({
        title: 'Trade closed',
        description: `Closed trade at ${closingPrice}.`,
      });
      setClosingTradeId(null);
      setClosingPrice('');
      setClosingNotes('');
    } catch (error) {
      console.error('Failed to close paper trade', error);
      const detail =
        (error as { data?: { detail?: string } }).data?.detail ??
        'Unable to close trade.';
      toast({
        title: 'Unable to close trade',
        description: detail,
        variant: 'destructive',
      });
    }
  };

  const handleCancelTrade = async (id: number) => {
    try {
      await cancelTrade({ id }).unwrap();
      toast({
        title: 'Trade cancelled',
        description: 'Paper trade marked cancelled.',
      });
    } catch (error) {
      console.error('Failed to cancel trade', error);
      const detail =
        (error as { data?: { detail?: string } }).data?.detail ??
        'Unable to cancel trade.';
      toast({
        title: 'Unable to cancel trade',
        description: detail,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTrade = async (id: number) => {
    try {
      await deleteTrade(id).unwrap();
      toast({
        title: 'Trade removed',
        description: 'Paper trade deleted.',
      });
    } catch (error) {
      console.error('Failed to delete trade', error);
      const detail =
        (error as { data?: { detail?: string } }).data?.detail ??
        'Unable to delete trade.';
      toast({
        title: 'Unable to delete trade',
        description: detail,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="shadow-sm border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Paper Trading</span>
          {asset ? (
            <Badge variant="outline" className="text-xs uppercase">
              {asset.symbol}
            </Badge>
          ) : null}
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          Simulate entries and track virtual P&amp;L without sending real orders.
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <section>
          <header className="flex items-center justify-between mb-3">
            <div className="text-xs font-medium text-muted-foreground">
              New Trade
            </div>
            <div className="text-xs text-muted-foreground">
              Live price: {currentPrice !== undefined ? formatCurrency(currentPrice) : '--'}
            </div>
          </header>

          {!isAssetAvailable ? (
            <div className="mb-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Select an asset from the watchlist to start paper trading.
            </div>
          ) : null}

          <form className="grid gap-3" onSubmit={handleCreateTrade}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="paper-direction" className="text-xs">
                  Direction
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['LONG', 'SHORT'] as PaperTradeDirection[]).map(option => (
                    <Button
                      key={option}
                      type="button"
                      variant={direction === option ? 'secondary' : 'outline'}
                      className="h-8 text-xs"
                      onClick={() => setDirection(option)}
                      disabled={!isAssetAvailable}
                    >
                      <span className="flex items-center gap-1.5">
                        {directionIcon[option]}
                        {option === 'LONG' ? 'Long' : 'Short'}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="paper-quantity" className="text-xs">
                  Quantity
                </Label>
                <Input
                  id="paper-quantity"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={quantity}
                  onChange={event => setQuantity(event.target.value)}
                  className="h-8 text-xs"
                  required
                  disabled={!isAssetAvailable}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="paper-entry" className="text-xs">
                Entry price
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="paper-entry"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={entryPrice}
                  onChange={event => {
                    setEntryPrice(event.target.value);
                    setEntryDirty(true);
                  }}
                  className="h-8 text-xs"
                  required
                  disabled={!isAssetAvailable}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    if (currentPrice !== undefined) {
                      setEntryPrice(currentPrice.toFixed(2));
                      setEntryDirty(true);
                    }
                  }}
                  disabled={!isAssetAvailable || currentPrice === undefined}
                >
                  Use market
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="paper-target" className="text-xs">
                  Target
                </Label>
                <Input
                  id="paper-target"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={targetPrice}
                  onChange={event => setTargetPrice(event.target.value)}
                  className="h-8 text-xs"
                  disabled={!isAssetAvailable}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="paper-stop" className="text-xs">
                  Stop loss
                </Label>
                <Input
                  id="paper-stop"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={stopLoss}
                  onChange={event => setStopLoss(event.target.value)}
                  className="h-8 text-xs"
                  disabled={!isAssetAvailable}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="paper-take-profit" className="text-xs">
                  Take profit
                </Label>
                <Input
                  id="paper-take-profit"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={takeProfit}
                  onChange={event => setTakeProfit(event.target.value)}
                  className="h-8 text-xs"
                  disabled={!isAssetAvailable}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="paper-notes" className="text-xs">
                Notes (optional)
              </Label>
              <Textarea
                id="paper-notes"
                rows={2}
                value={notes}
                onChange={event => setNotes(event.target.value)}
                className="text-xs"
                disabled={!isAssetAvailable}
              />
            </div>

            {formError ? (
              <div className="text-xs text-destructive">{formError}</div>
            ) : null}

            <div className="flex items-center gap-2 justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Reset
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating || !isAssetAvailable}
              >
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening...
                  </span>
                ) : (
                  'Open trade'
                )}
              </Button>
            </div>
          </form>
        </section>

        <Separator />

        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">
              Open Trades ({summary.openCount})
            </div>
            <div className="text-xs text-muted-foreground">
              Unrealized P&amp;L: {formatCurrency(summary.openPnL)}
            </div>
          </header>
          <div className="space-y-3">
            {isFetching ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading trades...
              </div>
            ) : null}
            {!isFetching && openTrades.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                No open paper trades yet.
              </div>
            ) : null}
            {openTrades.map(trade => (
              <article
                key={trade.id}
                className="rounded-lg border border-border/60 bg-card/70 p-4 text-xs space-y-3"
              >
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[trade.status] ?? 'default'}>
                      {trade.status.toLowerCase()}
                    </Badge>
                    <span className="font-semibold uppercase">
                      {trade.direction === 'LONG' ? 'Long' : 'Short'} {trade.quantity}
                    </span>
                    <span className="text-muted-foreground">
                      @ {formatCurrency(trade.entry_price)}
                    </span>
                  </div>
                </header>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Entry value</span>
                    <span>{formatCurrency(trade.entry_cost)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Current value</span>
                    <span>{formatCurrency(trade.current_value)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Unrealized P&amp;L</span>
                    <span
                      className={cn(
                        Number(trade.unrealized_pl ?? 0) >= 0
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      )}
                    >
                      {formatCurrency(trade.unrealized_pl)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Targets</span>
                    <span>
                      {trade.take_profit
                        ? `TP ${formatCurrency(trade.take_profit)}`
                        : 'TP --'}
                    </span>
                    <span>
                      {trade.stop_loss
                        ? `SL ${formatCurrency(trade.stop_loss)}`
                        : 'SL --'}
                    </span>
                  </div>
                </div>

                {closingTradeId === trade.id ? (
                  <div className="grid gap-2">
                    <Separator />
                    <div className="grid gap-1.5">
                      <Label htmlFor={`close-price-${trade.id}`} className="text-xs">
                        Exit price
                      </Label>
                      <Input
                        id={`close-price-${trade.id}`}
                        type="number"
                        step="0.0001"
                        min="0"
                        value={closingPrice}
                        onChange={event => setClosingPrice(event.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor={`close-notes-${trade.id}`} className="text-xs">
                        Notes (optional)
                      </Label>
                      <Textarea
                        id={`close-notes-${trade.id}`}
                        rows={2}
                        value={closingNotes}
                        onChange={event => setClosingNotes(event.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setClosingTradeId(null);
                          setClosingNotes('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirmClose}
                        disabled={isClosing}
                      >
                        {isClosing ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Closing...
                          </span>
                        ) : (
                          'Confirm close'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => beginClosingTrade(trade)}
                    >
                      Close trade
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelTrade(trade.id)}
                      disabled={isCancelling}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <div className="text-xs font-medium text-muted-foreground">
              Closed &amp; Cancelled ({closedTrades.length})
            </div>
            <div className="text-xs text-muted-foreground">
              Realized P&amp;L: {formatCurrency(summary.realizedPnL)}
            </div>
          </header>
          <div className="space-y-3">
            {closedTrades.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                Close trades to see them here.
              </div>
            ) : null}
            {closedTrades.map(trade => (
              <article
                key={trade.id}
                className="rounded-lg border border-border/60 bg-card/70 p-4 text-xs space-y-3"
              >
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[trade.status] ?? 'default'}>
                      {trade.status.toLowerCase()}
                    </Badge>
                    <span className="font-semibold uppercase">
                      {trade.direction === 'LONG' ? 'Long' : 'Short'} {trade.quantity}
                    </span>
                    <span className="text-muted-foreground">
                      Entry {formatCurrency(trade.entry_price)} ? Exit{' '}
                      {trade.exit_price ? formatCurrency(trade.exit_price) : '--'}
                    </span>
                  </div>
                </header>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Entry value</span>
                    <span>{formatCurrency(trade.entry_cost)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Exit value</span>
                    <span>
                      {trade.exit_price
                        ? formatCurrency(Number(trade.exit_price) * Number(trade.quantity))
                        : '--'}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground">Realized P&amp;L</span>
                    <span
                      className={cn(
                        Number(trade.realized_pl ?? 0) >= 0
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      )}
                    >
                      {trade.realized_pl
                        ? formatCurrency(trade.realized_pl)
                        : '--'}
                    </span>
                  </div>
                </div>
                {trade.notes ? (
                  <div className="text-muted-foreground">
                    Notes: <span className="text-foreground">{trade.notes}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTrade(trade.id)}
                    disabled={isDeleting}
                  >
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Updated {lastUpdated ? lastUpdated.toLocaleTimeString() : '--'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => refetch()}
            disabled={!isAssetAvailable}
          >
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaperTradingPanel;


