export const fmt = (val: number | null | undefined) =>
  val != null ? val.toFixed(2) : '—';

export const fmtDollar = (val: number | null | undefined) =>
  val != null ? `$${val.toFixed(2)}` : '—';

export const fmtVol = (val: number | null | undefined): string => {
  if (val == null || val === 0) return '—';
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
  return val.toString();
};

export type SpreadTier =
  | 'tight'
  | 'normal'
  | 'wide'
  | 'very-wide'
  | 'extreme'
  | 'none';

export interface SpreadInfo {
  spread: number | null;
  pct: number | null;
  color: string;
  bg: string;
  label: string;
  tier: SpreadTier;
}

/**
 * Classify a bid-ask spread into severity tiers for colour coding. The palette is
 * deliberately neutral so it never clashes with the call/put colours.
 */
export const getSpreadInfo = (
  bid: number | null | undefined,
  ask: number | null | undefined
): SpreadInfo => {
  if (bid == null || ask == null || bid <= 0 || ask <= 0) {
    return {
      spread: null,
      pct: null,
      color: 'text-muted-foreground/40',
      bg: '',
      label: '—',
      tier: 'none',
    };
  }

  const spread = ask - bid;
  const mid = (ask + bid) / 2;
  const pct = mid > 0 ? (spread / mid) * 100 : 0;
  const label = spread.toFixed(2);

  if (pct < 3) {
    return {
      spread,
      pct,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
      label,
      tier: 'tight',
    };
  }
  if (pct < 10) {
    return {
      spread,
      pct,
      color: 'text-blue-400',
      bg: 'bg-blue-500/15',
      label,
      tier: 'normal',
    };
  }
  if (pct < 25) {
    return {
      spread,
      pct,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/15',
      label,
      tier: 'wide',
    };
  }
  if (pct < 50) {
    return {
      spread,
      pct,
      color: 'text-orange-500',
      bg: 'bg-orange-500/15',
      label,
      tier: 'very-wide',
    };
  }
  return {
    spread,
    pct,
    color: 'text-red-500',
    bg: 'bg-red-500/15',
    label,
    tier: 'extreme',
  };
};

export const SPREAD_LEGEND = [
  {
    tier: 'tight',
    pct: '<3%',
    color: 'bg-emerald-400',
    desc: 'Tight — liquid, easy fills',
  },
  { tier: 'normal', pct: '3–10%', color: 'bg-blue-400', desc: 'Normal' },
  {
    tier: 'wide',
    pct: '10–25%',
    color: 'bg-yellow-400',
    desc: 'Wide — less liquid, watch fills',
  },
  {
    tier: 'very-wide',
    pct: '25–50%',
    color: 'bg-orange-500',
    desc: 'Very wide — low liquidity',
  },
  {
    tier: 'extreme',
    pct: '>50%',
    color: 'bg-red-500',
    desc: 'Extreme — unusual, possible activity',
  },
];
