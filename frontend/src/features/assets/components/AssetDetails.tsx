import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Building2, Heart, Calendar, Shield, TrendingUp, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="w-32 h-6" />
                <Skeleton className="w-48 h-4" />
              </div>
              <Skeleton className="w-24 h-8" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="w-20 h-3" />
                  <Skeleton className="w-24 h-5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <Alert className="border-destructive/50 bg-destructive/5">
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription className="text-destructive dark:text-destructive-foreground">
          Failed to load asset details. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const getAssetClassColor = (assetClass: string) => {
    switch (assetClass) {
      case 'us_equity':
        return 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 dark:from-blue-900/20 dark:to-blue-800/20 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'us_option':
        return 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 dark:from-purple-900/20 dark:to-purple-800/20 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'crypto':
        return 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 dark:from-orange-900/20 dark:to-orange-800/20 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 dark:from-gray-900/20 dark:to-gray-800/20 dark:text-gray-300 border-gray-200 dark:border-gray-800';
    }
  };

  const StatusBadge = ({ value, label }: { value: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {value ? (
        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
      ) : (
        <XCircle className="w-4 h-4 text-muted-foreground" />
      )}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <CardTitle className="text-2xl font-bold tracking-tight">
                    {asset.symbol}
                  </CardTitle>
                  <Badge className={`${getAssetClassColor(asset.asset_class)} border shadow-sm font-medium px-3 py-1`}>
                    {asset.asset_class.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <p className="text-muted-foreground font-medium">{asset.name}</p>
                <p className="text-sm text-muted-foreground">{asset.exchange}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowWatchlistDialog(true)}
              variant="outline"
              size="sm"
              className="gap-2 h-10 border-input/50 hover:bg-accent/50 hover:text-red-500 hover:border-red-500/50 transition-colors"
            >
              <Heart className="w-4 h-4" />
              Add to Watchlist
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Trading Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Trading Status
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatusBadge value={asset.tradable} label="Tradable" />
              <StatusBadge value={asset.marginable} label="Marginable" />
              <StatusBadge value={asset.shortable} label="Shortable" />
              <StatusBadge value={asset.easy_to_borrow} label="Easy to Borrow" />
              <StatusBadge value={asset.fractionable} label="Fractionable" />
            </div>
          </div>

          <Separator />

          {/* Asset Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Asset Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={asset.status === 'active' ? 'default' : 'secondary'} className="w-fit">
                  {asset.status.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Asset Class</p>
                <p className="text-sm font-medium">{asset.asset_class.replace('_', ' ').toUpperCase()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Exchange</p>
                <p className="text-sm font-medium">{asset.exchange}</p>
              </div>
            </div>
          </div>

          {/* Margin Requirements */}
          {asset.maintenance_margin_requirement && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Margin Requirements
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Maintenance Margin</p>
                    <p className="text-lg font-bold">
                      {(asset.maintenance_margin_requirement * 100).toFixed(2)}%
                    </p>
                  </div>
                  {asset.margin_requirement_long && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Long Margin</p>
                      <p className="text-lg font-bold">{asset.margin_requirement_long}</p>
                    </div>
                  )}
                  {asset.margin_requirement_short && (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Short Margin</p>
                      <p className="text-lg font-bold">{asset.margin_requirement_short}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Timestamps */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Created: {new Date(asset.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Updated: {new Date(asset.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AddToWatchlistDialog
        asset={asset}
        open={showWatchlistDialog}
        onOpenChange={setShowWatchlistDialog}
      />
    </div>
  );
};
