import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { useGetWatchListByIdQuery } from '@/api/watchlistService';
import { Asset } from '@/types/common-types';

interface WatchListAssetsProps {
  watchlistId: number;
  onAssetSelect?: (asset: Asset) => void;
  selectedAssetId?: number;
}

export const WatchListAssets: React.FC<WatchListAssetsProps> = ({
  watchlistId,
  onAssetSelect,
  selectedAssetId,
}) => {
  const {
    data: watchlist,
    isLoading,
    error,
  } = useGetWatchListByIdQuery(watchlistId);

  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-10" />
        ))}
      </div>
    );
  }

  if (error || !watchlist) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm border rounded-lg text-destructive bg-destructive/5">
        <AlertTriangle className="w-4 h-4" />
        Failed to load assets
      </div>
    );
  }

  if (!watchlist.assets || watchlist.assets.length === 0) {
    return (
      <div className="py-6 text-sm text-center text-muted-foreground">
        No assets yet. Add from the Instruments page.
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

  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Class</TableHead>
            {!selectedAssetId && (
              <>
                <TableHead>Name</TableHead>

                <TableHead>Exchange</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {watchlist.assets.map(watchlistAsset => {
            const isSelected = selectedAssetId === watchlistAsset.asset.id;
            return (
              <TableRow
                key={watchlistAsset.id}
                onClick={() => {
                  if (onAssetSelect) {
                    onAssetSelect(watchlistAsset.asset);
                  } else {
                    navigate(`/graphs/${watchlistAsset.asset.id}`, {
                      state: { obj: watchlistAsset.asset },
                    });
                  }
                }}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'bg-muted border-l-2 border-l-primary' : ''
                }`}
              >
                <TableCell className="font-mono font-medium">
                  {watchlistAsset.asset.symbol}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getAssetClassColor(watchlistAsset.asset.asset_class)}`}
                  >
                    {watchlistAsset.asset.asset_class.replace('_', ' ')}
                  </Badge>
                </TableCell>
                {!selectedAssetId && (
                  <>
                    <TableCell className="max-w-[200px]">
                      <div
                        className="truncate"
                        title={watchlistAsset.asset.name}
                      >
                        {watchlistAsset.asset.name}
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {watchlistAsset.asset.exchange}
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
