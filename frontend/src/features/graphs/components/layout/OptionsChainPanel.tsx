import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crosshair, Info, Loader2, RefreshCw, X } from 'lucide-react';
import {
  useGetAssetOptionExpirationsQuery,
  useGetAssetOptionsChainQuery,
} from '@/api/assetService';
import type { OptionContract } from '@/types/common-types';
import OptionContractDialog from './OptionContractDialog';
import OptionMiniChart from './OptionMiniChart';
import {
  SPREAD_LEGEND,
  fmt,
  fmtDollar,
  fmtVol,
  getSpreadInfo,
} from '../../lib/optionFormat';

type ChainViewMode = 'dense' | 'price' | 'greeks' | 'volume';
type OptionTypeFilter = 'all' | 'call' | 'put';
type StrikeRange = 'all' | 'atm5' | 'atm10' | 'itm' | 'otm';

interface OptionsChainPanelProps {
  assetId: number;
  symbol: string;
  currentPrice?: number;
  isDarkMode: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

interface ChainCell {
  key: string;
  node: React.ReactNode;
  bg?: string;
  title?: string;
}

const VIEW_MODES: { id: ChainViewMode; label: string }[] = [
  { id: 'dense', label: 'Dense' },
  { id: 'price', label: 'Price' },
  { id: 'greeks', label: 'Greeks' },
  { id: 'volume', label: 'Vol' },
];

const STRIKE_RANGES: { id: StrikeRange; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'atm5', label: '±5' },
  { id: 'atm10', label: '±10' },
  { id: 'itm', label: 'ITM' },
  { id: 'otm', label: 'OTM' },
];

const CALL_HEADERS: Record<ChainViewMode, string[]> = {
  price: ['Spd', 'Bid', 'Ask', 'Last'],
  dense: ['Vol', 'Bid', 'Ask', 'Last'],
  greeks: ['Spd', 'IV %', 'Theta', 'Delta'],
  volume: ['OI', 'Vol/OI', 'Vol', 'Last'],
};

const ivPct = (contract: OptionContract) =>
  contract.implied_volatility != null
    ? `${(contract.implied_volatility * 100).toFixed(0)}%`
    : '—';

const volOi = (contract: OptionContract) => {
  const volume = contract.volume ?? 0;
  const openInterest = contract.open_interest ?? 0;
  return openInterest > 0 ? `${(volume / openInterest).toFixed(1)}x` : '—';
};

const SpreadBadge: React.FC<{ contract?: OptionContract }> = ({ contract }) => {
  const info = getSpreadInfo(contract?.bid, contract?.ask);
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-bold tabular-nums ${info.color}`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 ${info.color.replace('text-', 'bg-')}`}
      />
      {info.pct != null ? `${info.pct.toFixed(0)}%` : '—'}
    </span>
  );
};

const SpotPriceBannerRow: React.FC<{ spotPrice: number }> = ({ spotPrice }) => (
  <tr>
    <td colSpan={9} className="p-0">
      <div className="flex items-center justify-between px-3 py-1 bg-amber-500/10 border-y border-amber-500/30 font-mono text-[10px]">
        <span className="font-bold text-emerald-500 dark:text-emerald-400 text-[9px] uppercase tracking-wider">
          CALLS ITM ↑
        </span>
        <div className="flex items-center gap-1.5 font-bold text-amber-500 uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>SPOT ${spotPrice.toFixed(2)}</span>
        </div>
        <span className="font-bold text-purple-400 dark:text-purple-300 text-[9px] uppercase tracking-wider">
          PUTS ITM ↓
        </span>
      </div>
    </td>
  </tr>
);

const buildCells = (
  contract: OptionContract | undefined,
  mode: ChainViewMode,
  isCall: boolean
): ChainCell[] => {
  const spreadInfo = getSpreadInfo(contract?.bid, contract?.ask);
  const toneClass = isCall
    ? 'text-emerald-500 dark:text-emerald-400'
    : 'text-purple-400 dark:text-purple-300';

  const muted = (value: string) => (
    <span className="text-muted-foreground/80">{value}</span>
  );
  const strong = (value: string) => (
    <span className={`font-bold ${toneClass}`}>{value}</span>
  );

  const spreadCell: ChainCell = {
    key: 'spd',
    node: <SpreadBadge contract={contract} />,
    bg: spreadInfo.bg,
    title:
      spreadInfo.pct != null
        ? `$${spreadInfo.label} spread (${spreadInfo.pct.toFixed(1)}%)`
        : undefined,
  };

  let cells: ChainCell[];
  switch (mode) {
    case 'price':
      cells = [
        spreadCell,
        { key: 'bid', node: muted(fmt(contract?.bid)) },
        { key: 'ask', node: muted(fmt(contract?.ask)) },
        { key: 'last', node: strong(fmtDollar(contract?.last_price)) },
      ];
      break;
    case 'greeks':
      cells = [
        spreadCell,
        { key: 'iv', node: muted(contract ? ivPct(contract) : '—') },
        { key: 'theta', node: muted(fmt(contract?.theta)) },
        { key: 'delta', node: strong(fmt(contract?.delta)) },
      ];
      break;
    case 'volume':
      cells = [
        { key: 'oi', node: muted(fmtVol(contract?.open_interest)) },
        { key: 'voloi', node: muted(contract ? volOi(contract) : '—') },
        { key: 'vol', node: muted(fmtVol(contract?.volume)) },
        { key: 'last', node: strong(fmtDollar(contract?.last_price)) },
      ];
      break;
    default:
      cells = [
        { key: 'vol', node: muted(fmtVol(contract?.volume)) },
        { key: 'bid', node: muted(fmt(contract?.bid)) },
        { key: 'ask', node: muted(fmt(contract?.ask)) },
        { key: 'last', node: strong(fmtDollar(contract?.last_price)) },
      ];
  }

  return isCall ? cells : [...cells].reverse();
};

const OptionsChainPanel: React.FC<OptionsChainPanelProps> = ({
  assetId,
  symbol,
  currentPrice,
  isDarkMode,
  isMobile = false,
  onClose,
}) => {
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [optionTypeFilter, setOptionTypeFilter] =
    useState<OptionTypeFilter>('all');
  const [chainViewMode, setChainViewMode] = useState<ChainViewMode>('dense');
  const [strikeRange, setStrikeRange] = useState<StrikeRange>('all');
  const [expandedStrike, setExpandedStrike] = useState<number | null>(null);
  const [hoveredContract, setHoveredContract] = useState<string | null>(null);
  const [spreadInfoOpen, setSpreadInfoOpen] = useState(false);
  const [selectedContract, setSelectedContract] =
    useState<OptionContract | null>(null);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);

  const atmRowRef = useRef<HTMLTableRowElement>(null);

  const { data: expirationsData, isFetching: isExpirationsFetching } =
    useGetAssetOptionExpirationsQuery(assetId, { skip: !assetId });

  const availableExpiries = useMemo(
    () => expirationsData?.expirations ?? [],
    [expirationsData]
  );

  useEffect(() => {
    if (
      availableExpiries.length > 0 &&
      !availableExpiries.includes(selectedExpiry)
    ) {
      setSelectedExpiry(availableExpiries[0]);
    }
  }, [availableExpiries, selectedExpiry]);

  const {
    data: chainData,
    isFetching: isChainFetching,
    refetch: refetchChain,
  } = useGetAssetOptionsChainQuery(
    { id: assetId, expiration: selectedExpiry },
    { skip: !assetId || !selectedExpiry }
  );

  const filteredContracts = useMemo(() => {
    const contracts = chainData?.contracts ?? [];
    if (optionTypeFilter === 'all') return contracts;
    return contracts.filter(c => c.option_type === optionTypeFilter);
  }, [chainData, optionTypeFilter]);

  const chainByStrike = useMemo(() => {
    const map = new Map<
      number,
      { call?: OptionContract; put?: OptionContract }
    >();
    for (const contract of filteredContracts) {
      const entry = map.get(contract.strike) ?? {};
      if (contract.option_type === 'call') entry.call = contract;
      else entry.put = contract;
      map.set(contract.strike, entry);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredContracts]);

  const atmStrike = useMemo(() => {
    if (currentPrice == null || chainByStrike.length === 0) return null;
    return chainByStrike.reduce(
      (closest, [strike]) =>
        Math.abs(strike - currentPrice) < Math.abs(closest - currentPrice)
          ? strike
          : closest,
      chainByStrike[0][0]
    );
  }, [currentPrice, chainByStrike]);

  const displayedChain = useMemo(() => {
    if (!chainByStrike.length) return [];
    if (strikeRange === 'all') return chainByStrike;

    if (strikeRange === 'itm' || strikeRange === 'otm') {
      if (currentPrice == null) return chainByStrike;
      return chainByStrike.filter(([strike]) =>
        strikeRange === 'itm' ? strike <= currentPrice : strike > currentPrice
      );
    }

    if (atmStrike == null) return chainByStrike;
    const count = strikeRange === 'atm5' ? 5 : 10;
    const atmIndex = chainByStrike.findIndex(([s]) => s === atmStrike);
    if (atmIndex === -1) return chainByStrike;
    return chainByStrike.slice(
      Math.max(0, atmIndex - count),
      Math.min(chainByStrike.length, atmIndex + count + 1)
    );
  }, [chainByStrike, strikeRange, atmStrike, currentPrice]);

  const scrollToAtm = React.useCallback(() => {
    atmRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(scrollToAtm);
    return () => cancelAnimationFrame(frame);
  }, [atmStrike, displayedChain, chainViewMode, scrollToAtm]);

  const openContract = (contract?: OptionContract) => {
    if (!contract) return;
    setSelectedContract(contract);
    setContractDialogOpen(true);
  };

  const isLoading = isChainFetching && !chainData;
  const callHeaders = CALL_HEADERS[chainViewMode];
  const putHeaders = [...callHeaders].reverse();

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold tracking-tight truncate">
            {symbol}
          </h3>
          {currentPrice != null && (
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              ${currentPrice.toFixed(2)}
            </span>
          )}
          {!isMobile && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 border-border/60 text-muted-foreground"
            >
              Info only
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Recenter on ATM"
            onClick={scrollToAtm}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Refresh chain"
            onClick={() => refetchChain()}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isChainFetching ? 'animate-spin' : ''}`}
            />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Close options"
              onClick={onClose}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-muted/10 font-mono text-[10px] ${
          isMobile
            ? 'flex-nowrap overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : 'flex-wrap'
        }`}
      >
        <Select
          value={selectedExpiry}
          onValueChange={setSelectedExpiry}
          disabled={availableExpiries.length === 0}
        >
          <SelectTrigger className="h-6 px-2 text-[10px] font-mono font-bold border-border/60 rounded-md bg-background w-[118px] shrink-0">
            <SelectValue
              placeholder={isExpirationsFetching ? 'Loading…' : 'Expiry'}
            />
          </SelectTrigger>
          <SelectContent className="rounded-md border-border/60">
            {availableExpiries.map(expiry => (
              <SelectItem
                key={expiry}
                value={expiry}
                className="text-[10.5px] font-mono"
              >
                {expiry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex h-6 shrink-0 rounded-md border border-border/60 p-0.5 bg-background">
          {(['all', 'call', 'put'] as const).map(type => (
            <button
              key={type}
              onClick={() => setOptionTypeFilter(type)}
              className={`px-2 rounded text-[9.5px] uppercase font-semibold cursor-pointer transition-colors ${
                optionTypeFilter === type
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex h-6 shrink-0 rounded-md border border-border/60 p-0.5 bg-background">
          {VIEW_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setChainViewMode(mode.id)}
              className={`px-2 rounded text-[9.5px] uppercase font-semibold cursor-pointer transition-colors ${
                chainViewMode === mode.id
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="flex h-6 shrink-0 rounded-md border border-border/60 p-0.5 bg-background">
          {STRIKE_RANGES.map(range => (
            <button
              key={range.id}
              onClick={() => setStrikeRange(range.id)}
              className={`px-2 rounded text-[9.5px] uppercase font-semibold cursor-pointer transition-colors ${
                strikeRange === range.id
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 shrink-0 ${isMobile ? '' : 'ml-auto'}`}
          title="Spread legend"
          onClick={() => setSpreadInfoOpen(true)}
        >
          <Info className="w-3 h-3" />
        </Button>
      </div>

      {/* Chain */}
      <div className="flex-1 min-h-0 overflow-auto overscroll-contain">
        {isLoading ? (
          <div className="px-4 py-3 space-y-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-2 animate-pulse"
              >
                <div className="flex-1 h-6 rounded-lg bg-muted/40" />
                <div className="w-16 h-6 rounded-lg bg-muted/60" />
                <div className="flex-1 h-6 rounded-lg bg-muted/40" />
              </div>
            ))}
          </div>
        ) : displayedChain.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-xs font-mono text-muted-foreground">
            {isChainFetching && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            {availableExpiries.length === 0
              ? 'No option contracts available'
              : 'No contracts matching current filters'}
          </div>
        ) : (
          <table
            className={`w-full tabular-nums border-collapse ${
              isMobile ? 'min-w-[560px] text-[10px]' : 'text-[11px]'
            }`}
          >
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40">
              <tr className="border-b border-border/20 bg-muted/10">
                <th
                  colSpan={4}
                  className="py-1.5 text-center text-[10px] font-mono font-extrabold text-emerald-500 tracking-wider border-r border-border/20"
                >
                  CALLS DECK{' '}
                  <span className="text-[8.5px] font-normal opacity-80">
                    (ITM ↑)
                  </span>
                </th>
                <th className="bg-background" />
                <th
                  colSpan={4}
                  className="py-1.5 text-center text-[10px] font-mono font-extrabold text-purple-400 dark:text-purple-300 tracking-wider border-l border-border/20"
                >
                  PUTS DECK{' '}
                  <span className="text-[8.5px] font-normal opacity-80">
                    (ITM ↓)
                  </span>
                </th>
              </tr>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                {callHeaders.map((header, index) => (
                  <th
                    key={`call-${header}-${index}`}
                    className="py-2 px-1.5 text-right font-semibold text-emerald-500/90"
                  >
                    {header}
                  </th>
                ))}
                <th className="py-2 px-2 text-center font-black text-foreground bg-muted/30 w-24 border-x border-border/30">
                  Strike
                </th>
                {putHeaders.map((header, index) => (
                  <th
                    key={`put-${header}-${index}`}
                    className="py-2 px-1.5 text-left font-semibold text-purple-400 dark:text-purple-300"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedChain.map(([strike, { call, put }], index) => {
                const nextStrike = displayedChain[index + 1]?.[0];
                const isAtm = atmStrike === strike;
                const isExpanded = expandedStrike === strike;
                const isItmCall = currentPrice != null && strike < currentPrice;
                const isItmPut = currentPrice != null && strike > currentPrice;

                const callBg =
                  hoveredContract === call?.symbol
                    ? 'bg-emerald-500/15 dark:bg-emerald-500/20'
                    : isItmCall
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/12'
                      : 'hover:bg-muted/40';
                const putBg =
                  hoveredContract === put?.symbol
                    ? 'bg-purple-500/15 dark:bg-purple-500/20'
                    : isItmPut
                      ? 'bg-purple-500/10 dark:bg-purple-500/12'
                      : 'hover:bg-muted/40';

                const showBannerBefore =
                  currentPrice != null && index === 0 && currentPrice < strike;
                const showBannerAfter =
                  currentPrice != null &&
                  strike <= currentPrice &&
                  (nextStrike == null || currentPrice < nextStrike);

                const renderSide = (
                  contract: OptionContract | undefined,
                  isCall: boolean
                ) =>
                  buildCells(contract, chainViewMode, isCall).map(cell => (
                    <td
                      key={`${isCall ? 'call' : 'put'}-${cell.key}`}
                      title={cell.title}
                      className={`py-1.5 px-1.5 font-mono transition-colors ${
                        isCall ? 'text-right' : 'text-left'
                      } ${contract ? 'cursor-pointer' : ''} ${
                        cell.bg || (isCall ? callBg : putBg)
                      }`}
                      onClick={() => openContract(contract)}
                      onMouseEnter={() =>
                        contract && setHoveredContract(contract.symbol)
                      }
                      onMouseLeave={() => setHoveredContract(null)}
                    >
                      {cell.node}
                    </td>
                  ));

                return (
                  <React.Fragment key={strike}>
                    {showBannerBefore && (
                      <SpotPriceBannerRow spotPrice={currentPrice} />
                    )}
                    <tr
                      ref={isAtm ? atmRowRef : undefined}
                      className={`border-b border-border/20 transition-colors ${
                        isAtm
                          ? 'bg-amber-500/10'
                          : isExpanded
                            ? 'bg-primary/5'
                            : ''
                      }`}
                    >
                      {renderSide(call, true)}

                      <td
                        className={`py-1.5 px-2 text-center font-mono font-bold text-[11px] cursor-pointer select-none border-x border-border/30 transition-all ${
                          isAtm
                            ? 'text-amber-500 bg-amber-500/20 font-black'
                            : isExpanded
                              ? 'text-primary bg-primary/20'
                              : 'text-foreground/90 bg-muted/40 hover:bg-muted/70'
                        }`}
                        title="Toggle inline price charts"
                        onClick={() =>
                          setExpandedStrike(isExpanded ? null : strike)
                        }
                      >
                        <div className="flex flex-col items-center">
                          <span>
                            ${strike.toFixed(strike % 1 === 0 ? 0 : 2)}
                          </span>
                          {currentPrice != null && (
                            <span className="text-[8px] opacity-60 font-normal">
                              {(
                                ((strike - currentPrice) / currentPrice) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          )}
                        </div>
                      </td>

                      {renderSide(put, false)}
                    </tr>

                    {isExpanded && (
                      <tr className="bg-muted/15 border-b border-border/40">
                        <td colSpan={9} className="p-2.5">
                          <div className="flex flex-col xl:flex-row gap-3">
                            {call && (
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5 px-1">
                                  <span className="text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-wider">
                                    Call ${strike.toFixed(2)}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[8.5px] font-mono h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-1.5"
                                  >
                                    CALL
                                  </Badge>
                                </div>
                                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
                                  <OptionMiniChart
                                    assetId={assetId}
                                    symbol={call.symbol}
                                    isDarkMode={isDarkMode}
                                    height={150}
                                    type="call"
                                  />
                                </div>
                              </div>
                            )}
                            {put && (
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1.5 px-1">
                                  <span className="text-[10px] font-mono font-bold text-purple-400 dark:text-purple-300 uppercase tracking-wider">
                                    Put ${strike.toFixed(2)}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[8.5px] font-mono h-4 bg-purple-500/10 text-purple-400 border-purple-500/20 px-1.5"
                                  >
                                    PUT
                                  </Badge>
                                </div>
                                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
                                  <OptionMiniChart
                                    assetId={assetId}
                                    symbol={put.symbol}
                                    isDarkMode={isDarkMode}
                                    height={150}
                                    type="put"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                    {showBannerAfter && (
                      <SpotPriceBannerRow spotPrice={currentPrice} />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <OptionContractDialog
        assetId={assetId}
        contract={selectedContract}
        currentPrice={currentPrice}
        isDarkMode={isDarkMode}
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
      />

      <Dialog open={spreadInfoOpen} onOpenChange={setSpreadInfoOpen}>
        <DialogContent className="sm:max-w-[400px] gap-0 p-0 overflow-hidden rounded-xl border border-border/80 bg-card">
          <DialogHeader className="p-4 border-b bg-muted/10 text-left">
            <DialogTitle className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2">
              <Info className="w-4 h-4" />
              Bid-ask spread legend
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-2.5">
            {SPREAD_LEGEND.map(entry => (
              <div key={entry.tier} className="flex items-center gap-2.5">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${entry.color}`}
                />
                <span className="text-[11px] font-mono font-bold w-16 tabular-nums">
                  {entry.pct}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {entry.desc}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OptionsChainPanel;
