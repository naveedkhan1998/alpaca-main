/**
 * Shared colour mapping for asset badges.
 *
 * Everything here resolves to design tokens so badges stay inside the
 * Terminal Amber palette. The most common class (us_equity) is deliberately
 * neutral — colour is reserved for the things worth noticing.
 */

export const getAssetClassColor = (assetClass?: string): string => {
  switch (assetClass) {
    case 'us_equity':
      return 'bg-foreground/[0.06] text-foreground/80 border-foreground/10 dark:bg-foreground/[0.08]';
    case 'us_option':
      return 'bg-accent/10 text-accent border-accent/25';
    case 'crypto':
      return 'bg-primary/10 text-primary border-primary/25';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const getAssetClassLabel = (assetClass?: string): string =>
  (assetClass || '').replace(/_/g, ' ');

export const assetAttrBadge = {
  marginable:
    'bg-foreground/[0.06] text-foreground/70 border-foreground/15 dark:bg-foreground/10',
  shortable: 'bg-accent/10 text-accent border-accent/25',
  fractionable: 'bg-success/10 text-success border-success/25',
} as const;

export const getStatusBadgeClass = (tradable?: boolean): string =>
  tradable
    ? 'bg-success/10 text-success border-success/25'
    : 'bg-muted text-muted-foreground border-border';
