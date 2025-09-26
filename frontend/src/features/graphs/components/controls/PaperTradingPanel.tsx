import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Target,
  Shield,
  DollarSign,
  Activity,
} from 'lucide-react';

import type { Asset } from '@/types/common-types';
import type {
  PaperTrade,
  PaperTradeDirection,
} from 'src/features/paperTrading/types';
import {
  useCancelPaperTradeMutation,
  useClosePaperTradeMutation,
  useCreatePaperTradeMutation,
  useDeletePaperTradeMutation,
  useGetPaperTradesQuery,
} from 'src/features/paperTrading/paperTradingApi';

import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/useToast';

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

const statusVariant: Record<
  string,
  'secondary' | 'destructive' | 'default' | 'outline'
> = {
  OPEN: 'default',
  CLOSED: 'secondary',
  CANCELLED: 'destructive',
};

const directionIcon: Record<PaperTradeDirection, React.ReactNode> = {
  LONG: <TrendingUp className="w-4 h-4" />,
  SHORT: <TrendingDown className="w-4 h-4" />,
};

const directionColors: Record<PaperTradeDirection, string> = {
  LONG: 'text-profit',
  SHORT: 'text-loss',
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

  const [createTrade, { isLoading: isCreating }] =
    useCreatePaperTradeMutation();
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
    setEntryPrice(currentPrice !== undefined ? currentPrice.toFixed(2) : '');
    setTargetPrice('');
    setStopLoss('');
    setTakeProfit('');
    setNotes('');
    setFormError(null);
    setEntryDirty(false);
  };

  const handleCreateTrade = async (event: React.FormEvent<HTMLFormElement>) => {
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
      });

      toast({
        title: 'Paper trade opened',
        description: `${direction === 'LONG' ? 'Long' : 'Short'} ${quantity} ${asset.symbol} @ ${entryPrice}`,
      });
      resetForm();
    } catch (error) {
      console.error('Failed to create paper trade', error);
      const detail = 'Unable to create paper trade.';
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
      });

      toast({
        title: 'Trade closed',
        description: `Closed trade at ${closingPrice}.`,
      });
      setClosingTradeId(null);
      setClosingPrice('');
      setClosingNotes('');
    } catch (error) {
      console.error('Failed to close paper trade', error);
      const detail = 'Unable to close trade.';
      toast({
        title: 'Unable to close trade',
        description: detail,
        variant: 'destructive',
      });
    }
  };

  const handleCancelTrade = async (id: number) => {
    try {
      await cancelTrade({ id });
      toast({
        title: 'Trade cancelled',
        description: 'Paper trade marked cancelled.',
      });
    } catch (error) {
      console.error('Failed to cancel trade', error);
      const detail = 'Unable to cancel trade.';
      toast({
        title: 'Unable to cancel trade',
        description: detail,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTrade = async (id: number) => {
    try {
      await deleteTrade(id);
      toast({
        title: 'Trade removed',
        description: 'Paper trade deleted.',
      });
    } catch (error) {
      console.error('Failed to delete trade', error);
      const detail = 'Unable to delete trade.';
      toast({
        title: 'Unable to delete trade',
        description: detail,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="border-2 shadow-xl glass-effect">
      <CardHeader className="pb-6 border-b border-trading-border">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-balance">
                Paper Trading
              </h3>
              <p className="text-sm font-normal text-muted-foreground">
                Simulate trades without real money
              </p>
            </div>
          </div>
          {asset ? (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="px-3 py-1 font-mono text-sm font-medium"
              >
                {asset.symbol}
              </Badge>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Live Price</div>
                <div className="font-mono text-sm font-semibold">
                  {currentPrice !== undefined
                    ? formatCurrency(currentPrice)
                    : '--'}
                </div>
              </div>
            </div>
          ) : null}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <h4 className="font-semibold text-pretty">New Trade</h4>
          </div>

          {!isAssetAvailable ? (
            <div className="p-6 text-center border-2 border-dashed rounded-xl border-muted-foreground/30">
              <div className="text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Select an asset from the watchlist to start paper trading
                </p>
              </div>
            </div>
          ) : null}

          <form className="space-y-6" onSubmit={handleCreateTrade}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label className="text-sm font-medium" htmlFor="direction">Direction</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(['LONG', 'SHORT'] as PaperTradeDirection[]).map(option => (
                    <Button
                      key={option}
                      type="button"
                      variant={direction === option ? 'default' : 'outline'}
                      className={cn(
                        'h-12 text-sm font-medium transition-all',
                        direction === option &&
                          option === 'LONG' &&
                          'bg-profit hover:bg-profit/90 ',
                        direction === option &&
                          option === 'SHORT' &&
                          'bg-loss hover:bg-loss/90 '
                      )}
                      onClick={() => setDirection(option)}
                      disabled={!isAssetAvailable}
                    >
                      <span className="flex items-center gap-2">
                        {directionIcon[option]}
                        {option === 'LONG' ? 'Long' : 'Short'}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="paper-quantity" className="text-sm font-medium">
                  Quantity
                </Label>
                <Input
                  id="paper-quantity"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={quantity}
                  onChange={event => setQuantity(event.target.value)}
                  className="h-12 font-mono text-sm"
                  required
                  disabled={!isAssetAvailable}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="paper-entry" className="text-sm font-medium">
                Entry Price
              </Label>
              <div className="flex gap-3">
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
                  className="h-12 font-mono text-sm"
                  required
                  disabled={!isAssetAvailable}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-4 text-sm bg-transparent whitespace-nowrap"
                  onClick={() => {
                    if (currentPrice !== undefined) {
                      setEntryPrice(currentPrice.toFixed(2));
                      setEntryDirty(true);
                    }
                  }}
                  disabled={!isAssetAvailable || currentPrice === undefined}
                >
                  Use Market
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Risk Management</Label>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="paper-target"
                    className="text-xs text-muted-foreground"
                  >
                    Target Price
                  </Label>
                  <Input
                    id="paper-target"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={targetPrice}
                    onChange={event => setTargetPrice(event.target.value)}
                    className="h-10 font-mono text-sm"
                    disabled={!isAssetAvailable}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="paper-stop"
                    className="text-xs text-muted-foreground"
                  >
                    Stop Loss
                  </Label>
                  <Input
                    id="paper-stop"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={stopLoss}
                    onChange={event => setStopLoss(event.target.value)}
                    className="h-10 font-mono text-sm"
                    disabled={!isAssetAvailable}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="paper-take-profit"
                    className="text-xs text-muted-foreground"
                  >
                    Take Profit
                  </Label>
                  <Input
                    id="paper-take-profit"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={takeProfit}
                    onChange={event => setTakeProfit(event.target.value)}
                    className="h-10 font-mono text-sm"
                    disabled={!isAssetAvailable}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="paper-notes" className="text-sm font-medium">
                Notes{' '}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="paper-notes"
                rows={3}
                value={notes}
                onChange={event => setNotes(event.target.value)}
                className="text-sm resize-none"
                disabled={!isAssetAvailable}
                placeholder="Add your trading notes or strategy..."
              />
            </div>

            {formError ? (
              <div className="p-3 border rounded-lg bg-destructive/10 border-destructive/20">
                <p className="text-sm text-destructive">{formError}</p>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={resetForm}>
                Reset
              </Button>
              <Button
                type="submit"
                className="px-6"
                disabled={isCreating || !isAssetAvailable}
              >
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Opening...
                  </span>
                ) : (
                  'Open Trade'
                )}
              </Button>
            </div>
          </form>
        </section>

        <Separator className="my-8" />

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-success/10">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <div>
                <h4 className="font-semibold">Open Positions</h4>
                <p className="text-xs text-muted-foreground">
                  {summary.openCount} active trades
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                Unrealized P&L
              </div>
              <div
                className={cn(
                  'text-lg font-mono font-bold',
                  summary.openPnL >= 0 ? 'profit-text' : 'loss-text'
                )}
              >
                {formatCurrency(summary.openPnL)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {!isFetching && openTrades.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed rounded-xl border-muted-foreground/30">
                <div className="text-muted-foreground">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No open paper trades yet</p>
                  <p className="mt-1 text-xs">Create your first trade above</p>
                </div>
              </div>
            ) : null}

            {openTrades.map(trade => (
              <article
                key={trade.id}
                className="p-6 space-y-4 transition-shadow border-2 shadow-sm trading-card rounded-xl hover:shadow-md"
              >
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={statusVariant[trade.status] ?? 'default'}
                      className="capitalize"
                    >
                      {trade.status.toLowerCase()}
                    </Badge>
                    <div
                      className={cn(
                        'flex items-center gap-2 font-semibold',
                        directionColors[trade.direction]
                      )}
                    >
                      {directionIcon[trade.direction]}
                      <span className="font-mono">
                        {trade.direction === 'LONG' ? 'LONG' : 'SHORT'}{' '}
                        {trade.quantity}
                      </span>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">
                      @ {formatCurrency(trade.entry_price)}
                    </span>
                  </div>
                </header>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Entry Value
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(trade.entry_cost)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Current Value
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(trade.current_value)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Unrealized P&L
                    </div>
                    <div
                      className={cn(
                        'font-mono font-bold',
                        Number(trade.unrealized_pl ?? 0) >= 0
                          ? 'profit-text'
                          : 'loss-text'
                      )}
                    >
                      {formatCurrency(trade.unrealized_pl)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Targets</div>
                    <div className="space-y-0.5">
                      <div className="font-mono text-xs">
                        TP:{' '}
                        {trade.take_profit
                          ? formatCurrency(trade.take_profit)
                          : '--'}
                      </div>
                      <div className="font-mono text-xs">
                        SL:{' '}
                        {trade.stop_loss
                          ? formatCurrency(trade.stop_loss)
                          : '--'}
                      </div>
                    </div>
                  </div>
                </div>

                {closingTradeId === trade.id ? (
                  <div className="pt-4 space-y-4 border-t border-trading-border">
                    <div className="space-y-3">
                      <Label
                        htmlFor={`close-price-${trade.id}`}
                        className="text-sm font-medium"
                      >
                        Exit Price
                      </Label>
                      <Input
                        id={`close-price-${trade.id}`}
                        type="number"
                        step="0.0001"
                        min="0"
                        value={closingPrice}
                        onChange={event => setClosingPrice(event.target.value)}
                        className="h-10 font-mono"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label
                        htmlFor={`close-notes-${trade.id}`}
                        className="text-sm font-medium"
                      >
                        Closing Notes{' '}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                      </Label>
                      <Textarea
                        id={`close-notes-${trade.id}`}
                        rows={2}
                        value={closingNotes}
                        onChange={event => setClosingNotes(event.target.value)}
                        className="text-sm resize-none"
                        placeholder="Why are you closing this trade?"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setClosingTradeId(null);
                          setClosingNotes('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleConfirmClose}
                        disabled={isClosing}
                      >
                        {isClosing ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />{' '}
                            Closing...
                          </span>
                        ) : (
                          'Confirm Close'
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => beginClosingTrade(trade)}
                    >
                      Close Trade
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
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

        <Separator className="my-8" />

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-muted">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-semibold">Trade History</h4>
                <p className="text-xs text-muted-foreground">
                  {closedTrades.length} completed trades
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Realized P&L</div>
              <div
                className={cn(
                  'text-lg font-mono font-bold',
                  summary.realizedPnL >= 0 ? 'profit-text' : 'loss-text'
                )}
              >
                {formatCurrency(summary.realizedPnL)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {closedTrades.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed rounded-xl border-muted-foreground/30">
                <div className="text-muted-foreground">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No completed trades yet</p>
                  <p className="mt-1 text-xs">Close trades to see them here</p>
                </div>
              </div>
            ) : null}

            {closedTrades.map(trade => (
              <article
                key={trade.id}
                className="p-6 space-y-4 transition-opacity border opacity-75 trading-card rounded-xl hover:opacity-100"
              >
                <header className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={statusVariant[trade.status] ?? 'default'}
                      className="capitalize"
                    >
                      {trade.status.toLowerCase()}
                    </Badge>
                    <div
                      className={cn(
                        'flex items-center gap-2 font-semibold',
                        directionColors[trade.direction]
                      )}
                    >
                      {directionIcon[trade.direction]}
                      <span className="font-mono">
                        {trade.direction === 'LONG' ? 'LONG' : 'SHORT'}{' '}
                        {trade.quantity}
                      </span>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">
                      {formatCurrency(trade.entry_price)} →{' '}
                      {trade.exit_price
                        ? formatCurrency(trade.exit_price)
                        : '--'}
                    </span>
                  </div>
                </header>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Entry Value
                    </div>
                    <div className="font-mono font-semibold">
                      {formatCurrency(trade.entry_cost)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Exit Value
                    </div>
                    <div className="font-mono font-semibold">
                      {trade.exit_price
                        ? formatCurrency(
                            Number(trade.exit_price) * Number(trade.quantity)
                          )
                        : '--'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Realized P&L
                    </div>
                    <div
                      className={cn(
                        'font-mono font-bold',
                        Number(trade.realized_pl ?? 0) >= 0
                          ? 'profit-text'
                          : 'loss-text'
                      )}
                    >
                      {trade.realized_pl
                        ? formatCurrency(trade.realized_pl)
                        : '--'}
                    </div>
                  </div>
                </div>

                {trade.notes ? (
                  <div className="pt-2 border-t border-trading-border">
                    <div className="mb-1 text-xs text-muted-foreground">
                      Notes:
                    </div>
                    <div className="text-sm">{trade.notes}</div>
                  </div>
                ) : null}

                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTrade(trade.id)}
                    disabled={isDeleting}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between pt-6 border-t border-trading-border">
          <div className="text-xs text-muted-foreground">
            Last updated:{' '}
            {lastUpdated ? lastUpdated.toLocaleTimeString() : '--'}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={!isAssetAvailable}
            className="text-xs"
          >
            Refresh Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaperTradingPanel;
