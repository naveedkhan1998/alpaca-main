import React from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Trash2, AlertCircle, ChartBarIcon } from 'lucide-react';
import {
  useGetWatchListByIdQuery,
  useRemoveAssetFromWatchListMutation,
} from '@/api/watchlistService';

interface WatchListAssetsProps {
  watchlistId: number;
}

export const WatchListAssets: React.FC<WatchListAssetsProps> = ({
  watchlistId,
}) => {
  const {
    data: watchlist,
    isLoading,
    error,
  } = useGetWatchListByIdQuery(watchlistId);
  const [removeAsset, { isLoading: isRemoving }] =
    useRemoveAssetFromWatchListMutation();

  const handleRemoveAsset = async (assetId: number) => {
    if (
      window.confirm(
        'Are you sure you want to remove this asset from the watchlist?'
      )
    ) {
      try {
        await removeAsset({
          watchlist_id: watchlistId,
          asset_id: assetId,
        }).unwrap();
      } catch (error) {
        console.error('Error removing asset:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-20 h-6" />
            <Skeleton className="w-16 h-4" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !watchlist) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Failed to load watchlist assets. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!watchlist.assets || watchlist.assets.length === 0) {
    return (
      <div className="py-8 text-center">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="mt-2 text-lg font-semibold">No assets yet</h3>
        <p className="text-muted-foreground">
          Add assets to this watchlist from the Assets page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border border-border/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Asset Class</TableHead>
              <TableHead>Exchange</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {watchlist.assets.map(watchlistAsset => (
              <TableRow key={watchlistAsset.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    {watchlistAsset.asset.symbol}
                  </div>
                </TableCell>
                <TableCell className="max-w-[240px]">
                  <div className="truncate" title={watchlistAsset.asset.name}>
                    {watchlistAsset.asset.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {watchlistAsset.asset.asset_class
                      .replace('_', ' ')
                      .toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{watchlistAsset.asset.exchange}</TableCell>
                <TableCell>
                  {new Date(watchlistAsset.added_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Link
                        to={`/graphs/${watchlistAsset.asset.id}`}
                        state={{ obj: watchlistAsset.asset }}
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveAsset(watchlistAsset.asset.id)}
                      disabled={isRemoving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
