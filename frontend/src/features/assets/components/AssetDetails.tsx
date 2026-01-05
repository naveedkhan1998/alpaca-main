import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Heart,
  Check,
  X,
  AlertTriangle,
  Building2,
  Globe,
  Calendar,
  Activity,
  DollarSign,
  Layers,
  LucideIcon,
} from 'lucide-react';
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
            <Skeleton className="w-32 h-10" />
            <Skeleton className="w-64 h-6" />
          </div>
          <Skeleton className="w-40 h-10" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm border rounded-lg border-destructive/20 text-destructive bg-destructive/5">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-medium">Failed to load instrument details</span>
      </div>
    );
  }

  const getAssetClassColor = (assetClass: string) => {
    switch (assetClass) {
      case 'us_equity':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'us_option':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'crypto':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  const StatusItem = ({
    value,
    label,
    description,
  }: {
    value: boolean;
    label: string;
    description?: string;
  }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
      <div className="space-y-0.5">
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full ${
          value
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {value ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
      </div>
    </div>
  );

  const DetailRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: LucideIcon;
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold tracking-tight font-mono text-primary">
              {asset.symbol}
            </h1>
            <Badge
              variant="outline"
              className={`text-sm px-2.5 py-0.5 ${getAssetClassColor(asset.asset_class)}`}
            >
              {asset.asset_class.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge
              variant={asset.status === 'active' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {asset.status}
            </Badge>
          </div>
          <h2 className="text-xl text-muted-foreground font-medium">
            {asset.name}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            size="lg"
            className="gap-2 shadow-sm"
            onClick={() => setShowWatchlistDialog(true)}
          >
            <Heart className="w-5 h-5" />
            Add to Watchlist
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-primary" />
              Market Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <DetailRow
              icon={Building2}
              label="Exchange"
              value={asset.exchange}
            />
            <DetailRow
              icon={Globe}
              label="Asset Class"
              value={asset.asset_class.replace('_', ' ')}
            />
            <DetailRow
              icon={Layers}
              label="Symbol"
              value={<span className="font-mono">{asset.symbol}</span>}
            />
            <DetailRow
              icon={Calendar}
              label="Listed Date"
              value={
                asset.created_at
                  ? new Date(asset.created_at).toLocaleDateString()
                  : 'N/A'
              }
            />
          </CardContent>
        </Card>

        {/* Trading Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Check className="w-5 h-5 text-primary" />
              Trading Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusItem
              value={asset.tradable}
              label="Tradable"
              description="Available for trading"
            />
            <StatusItem
              value={asset.fractionable}
              label="Fractionable"
              description="Supports fractional shares"
            />
            <StatusItem
              value={asset.shortable}
              label="Shortable"
              description="Available for short selling"
            />
          </CardContent>
        </Card>

        {/* Margin Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-primary" />
              Margin Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {asset.marginable ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/50">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Marginable Status
                  </span>
                  <Badge variant="outline" className="bg-background">
                    Enabled
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Maintenance</span>
                    <span className="font-mono font-medium">
                      {asset.maintenance_margin_requirement
                        ? `${(asset.maintenance_margin_requirement * 100).toFixed(0)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(asset.maintenance_margin_requirement || 0) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 border rounded-lg bg-card">
                    <p className="text-xs text-muted-foreground mb-1">
                      Initial Long
                    </p>
                    <p className="text-lg font-bold font-mono">
                      {asset.margin_requirement_long || 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg bg-card">
                    <p className="text-xs text-muted-foreground mb-1">
                      Initial Short
                    </p>
                    <p className="text-lg font-bold font-mono">
                      {asset.margin_requirement_short || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <AlertTriangle className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm">Not available on margin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddToWatchlistDialog
        asset={asset}
        open={showWatchlistDialog}
        onOpenChange={setShowWatchlistDialog}
      />
    </div>
  );
};
