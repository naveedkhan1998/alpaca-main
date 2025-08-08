import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Calendar } from 'lucide-react';
import { useGetAssetByIdQuery } from '@/api/assetService';

interface AssetDetailsProps {
  assetId: number;
}

export const AssetDetails: React.FC<AssetDetailsProps> = ({ assetId }) => {
  const { data: asset, isLoading, error } = useGetAssetByIdQuery(assetId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-48 h-7" />
            <Skeleton className="w-64 h-4" />
          </div>
        </div>
        <Skeleton className="w-full h-56 rounded-md" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <Alert>
        <AlertDescription>
          Failed to load asset details. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const detailsData = [
    { label: 'Symbol', value: asset.symbol },
    { label: 'Name', value: asset.name },
    {
      label: 'Asset Class',
      value: asset.asset_class.replace('_', ' ').toUpperCase(),
    },
    { label: 'Exchange', value: asset.exchange },
    { label: 'Status', value: asset.status.toUpperCase() },
    { label: 'Tradable', value: asset.tradable ? 'Yes' : 'No' },
    { label: 'Marginable', value: asset.marginable ? 'Yes' : 'No' },
    { label: 'Shortable', value: asset.shortable ? 'Yes' : 'No' },
    { label: 'Easy to Borrow', value: asset.easy_to_borrow ? 'Yes' : 'No' },
    { label: 'Fractionable', value: asset.fractionable ? 'Yes' : 'No' },
  ];

  const getAssetClassColor = (assetClass: string) => {
    switch (assetClass) {
      case 'us_equity':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'us_option':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'crypto':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl tracking-tight">
                {asset.symbol}
              </CardTitle>
              <p className="mt-1 text-muted-foreground">{asset.name}</p>
            </div>
            <Badge
              className={`${getAssetClassColor(asset.asset_class)} shadow-sm`}
            >
              {asset.asset_class.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {detailsData.map((item, index) => (
              <div key={index} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </p>
                <p className="text-base leading-snug">{item.value}</p>
              </div>
            ))}
          </div>

          {asset.maintenance_margin_requirement && (
            <>
              <Separator className="my-6" />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Margin Requirements</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Maintenance Margin
                    </p>
                    <p className="text-base">
                      {(asset.maintenance_margin_requirement * 100).toFixed(2)}%
                    </p>
                  </div>
                  {asset.margin_requirement_long && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Long Margin
                      </p>
                      <p className="text-base">
                        {asset.margin_requirement_long}
                      </p>
                    </div>
                  )}
                  {asset.margin_requirement_short && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Short Margin
                      </p>
                      <p className="text-base">
                        {asset.margin_requirement_short}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator className="my-6" />
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Created: {new Date(asset.created_at).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Updated: {new Date(asset.updated_at).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
