import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Check, X, AlertTriangle } from 'lucide-react';
import { useGetAssetByIdQuery } from '@/api/assetService';
import { AddToWatchlistDialog } from './AddToWatchlistDialog';

interface AssetDetailsProps {
  assetId: number;
}

export const AssetDetails: React.FC<AssetDetailsProps> = ({ assetId }) => {
  const { data: asset, isLoading, error } = useGetAssetByIdQuery(assetId);
  const [showWatchlistDialog, setShowWatchlistDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="w-24 h-8" />
            <Skeleton className="w-48 h-5" />
          </div>
          <Skeleton className="w-32 h-9" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="w-20 h-3" />
              <Skeleton className="w-16 h-5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm border rounded-lg text-destructive bg-destructive/5">
        <AlertTriangle className="w-4 h-4" />
        Failed to load instrument details
      </div>
    );
  }

  const getAssetClassColor = (assetClass: string) => {
    switch (assetClass) {
      case 'us_equity':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'us_option':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'crypto':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const StatusItem = ({ value, label }: { value: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {value ? (
        <Check className="w-4 h-4 text-success" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground" />
      )}
      <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  );

  const InfoItem = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="font-mono text-2xl font-semibold">{asset.symbol}</h2>
            <Badge
              variant="secondary"
              className={`text-xs ${getAssetClassColor(asset.asset_class)}`}
            >
              {asset.asset_class.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground">{asset.name}</p>
          <p className="text-sm text-muted-foreground">{asset.exchange}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowWatchlistDialog(true)}
        >
          <Heart className="w-4 h-4 mr-2" />
          Add to Watchlist
        </Button>
      </div>

      {/* Trading Status */}
      <div className="p-4 border rounded-lg">
        <h3 className="mb-3 text-sm font-medium">Trading Status</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatusItem value={asset.tradable} label="Tradable" />
          <StatusItem value={asset.marginable} label="Marginable" />
          <StatusItem value={asset.shortable} label="Shortable" />
          <StatusItem value={asset.easy_to_borrow} label="Easy to Borrow" />
          <StatusItem value={asset.fractionable} label="Fractionable" />
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <InfoItem
          label="Status"
          value={
            <Badge
              variant={asset.status === 'active' ? 'default' : 'secondary'}
            >
              {asset.status}
            </Badge>
          }
        />
        <InfoItem
          label="Asset Class"
          value={asset.asset_class.replace('_', ' ')}
        />
        <InfoItem label="Exchange" value={asset.exchange} />
      </div>

      {/* Margin Requirements */}
      {asset.maintenance_margin_requirement && (
        <div className="p-4 border rounded-lg">
          <h3 className="mb-3 text-sm font-medium">Margin Requirements</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <InfoItem
              label="Maintenance"
              value={`${(asset.maintenance_margin_requirement * 100).toFixed(1)}%`}
            />
            {asset.margin_requirement_long && (
              <InfoItem label="Long" value={asset.margin_requirement_long} />
            )}
            {asset.margin_requirement_short && (
              <InfoItem label="Short" value={asset.margin_requirement_short} />
            )}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Created: {new Date(asset.created_at).toLocaleDateString()}</span>
        <span>Updated: {new Date(asset.updated_at).toLocaleDateString()}</span>
      </div>

      <AddToWatchlistDialog
        asset={asset}
        open={showWatchlistDialog}
        onOpenChange={setShowWatchlistDialog}
      />
    </div>
  );
};
