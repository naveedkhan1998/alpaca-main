import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { OptionContract } from '@/types/common-types';
import OptionMiniChart from './OptionMiniChart';
import { fmtDollar, getSpreadInfo } from '../../lib/optionFormat';

interface OptionContractDialogProps {
  assetId: number;
  contract: OptionContract | null;
  currentPrice?: number;
  isDarkMode: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OptionContractDialog: React.FC<OptionContractDialogProps> = ({
  assetId,
  contract,
  currentPrice,
  isDarkMode,
  open,
  onOpenChange,
}) => {
  if (!contract) return null;

  const isCall = contract.option_type === 'call';
  const isITM =
    currentPrice != null &&
    (isCall ? contract.strike < currentPrice : contract.strike > currentPrice);
  const spread = getSpreadInfo(contract.bid, contract.ask);
  const mark =
    contract.bid != null && contract.ask != null
      ? (contract.bid + contract.ask) / 2
      : null;
  const volume = contract.volume ?? 0;
  const openInterest = contract.open_interest ?? 0;
  const volOiRatio = openInterest > 0 ? volume / openInterest : null;
  const moneyness =
    currentPrice != null && currentPrice > 0
      ? ((contract.strike - currentPrice) / currentPrice) * 100
      : null;

  const snapshot = [
    { label: 'Last', value: fmtDollar(contract.last_price) },
    {
      label: 'Bid',
      value: fmtDollar(contract.bid),
      accent: 'text-emerald-500 dark:text-emerald-400',
    },
    {
      label: 'Ask',
      value: fmtDollar(contract.ask),
      accent: 'text-rose-500 dark:text-rose-400',
    },
    { label: 'Mark', value: fmtDollar(mark) },
    {
      label: 'Volume',
      value: volume ? volume.toLocaleString() : '—',
      accent: 'text-amber-500',
    },
    {
      label: 'Open Int',
      value: openInterest ? openInterest.toLocaleString() : '—',
    },
  ];

  const greeks = [
    {
      label: 'Delta',
      value: contract.delta != null ? contract.delta.toFixed(3) : '—',
      color: (contract.delta ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500',
    },
    {
      label: 'Gamma',
      value: contract.gamma != null ? contract.gamma.toFixed(4) : '—',
      color: 'text-sky-400',
    },
    {
      label: 'Theta',
      value: contract.theta != null ? contract.theta.toFixed(3) : '—',
      color: 'text-amber-500',
    },
    {
      label: 'IV',
      value:
        contract.implied_volatility != null
          ? `${(contract.implied_volatility * 100).toFixed(1)}%`
          : '—',
      color: 'text-purple-400',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto gap-0 p-0 rounded-xl border border-border/80 bg-card/95 backdrop-blur-md">
        <DialogHeader className="px-4 py-3 border-b border-border/40 bg-muted/20 space-y-1 text-left">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-sm font-mono font-bold uppercase tracking-wider">
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${
                isCall
                  ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30 dark:text-emerald-400'
                  : 'bg-purple-500/15 text-purple-500 border-purple-500/30 dark:text-purple-300'
              }`}
            >
              {contract.option_type.toUpperCase()}
            </Badge>
            <span className="tabular-nums">
              {contract.underlying} ${contract.strike.toFixed(2)}
            </span>
            {isITM && (
              <Badge
                variant="outline"
                className="text-[9px] h-4 px-1 uppercase font-bold text-amber-500 border-amber-500/40 bg-amber-500/10"
              >
                ITM
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="font-mono text-[10px] uppercase tracking-wider">
            {contract.symbol} • Expires {contract.expiration}
            {moneyness != null
              ? ` • ${moneyness >= 0 ? '+' : ''}${moneyness.toFixed(1)}% from spot`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
            <div className="px-3 py-2 border-b border-border/40 bg-muted/20 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                Price history
              </span>
              <Badge
                variant="secondary"
                className="text-[8px] h-4 bg-amber-500/10 text-amber-500 border-amber-500/20 px-1.5 rounded-md"
              >
                15m delayed
              </Badge>
            </div>
            <OptionMiniChart
              assetId={assetId}
              symbol={contract.symbol}
              isDarkMode={isDarkMode}
              height={240}
              type={contract.option_type}
            />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {snapshot.map(({ label, value, accent }) => (
              <div
                key={label}
                className="rounded-xl border border-border/60 bg-background/60 p-2.5 text-center"
              >
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                  {label}
                </div>
                <div
                  className={`text-xs font-mono font-bold tabular-nums ${accent ?? 'text-foreground'}`}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              className={`flex items-center justify-between rounded-xl border border-border/60 p-2.5 ${spread.bg}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${spread.color.replace('text-', 'bg-')}`}
                />
                <div>
                  <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                    Bid-ask spread
                  </div>
                  <div
                    className={`text-xs font-mono font-bold tabular-nums ${spread.color}`}
                  >
                    {spread.spread != null ? `$${spread.label}` : '—'}
                  </div>
                </div>
              </div>
              {spread.pct != null && (
                <div className="text-right">
                  <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                    Spread %
                  </div>
                  <div
                    className={`text-xs font-mono font-bold tabular-nums ${spread.color}`}
                  >
                    {spread.pct.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>

            <div
              className={`flex items-center justify-between rounded-xl border border-border/60 p-2.5 ${
                volOiRatio != null && volOiRatio > 1.5
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-background/60'
              }`}
            >
              <div>
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                  Vol / OI ratio
                </div>
                <div className="text-xs font-mono font-bold tabular-nums text-foreground">
                  {volOiRatio != null ? `${volOiRatio.toFixed(2)}x` : '—'}
                </div>
              </div>
              <div className="text-right text-[9.5px] font-mono text-muted-foreground">
                <div>Vol: {volume ? volume.toLocaleString() : '—'}</div>
                <div>
                  OI: {openInterest ? openInterest.toLocaleString() : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {greeks.map(({ label, value, color }) => (
              <div
                key={label}
                className="px-2 py-2 text-center border border-border/50 rounded-lg bg-muted/20"
              >
                <div className="text-[8px] font-mono font-bold uppercase tracking-widest text-muted-foreground/70 mb-0.5">
                  {label}
                </div>
                <div
                  className={`text-[10.5px] font-mono font-bold tabular-nums ${color}`}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[9px] font-mono text-center text-muted-foreground/70 uppercase tracking-wider">
            Information only — this app does not support options trading.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OptionContractDialog;
