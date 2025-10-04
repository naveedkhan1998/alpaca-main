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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, AlertCircle } from 'lucide-react';
import { useGetWatchListByIdQuery } from '@/api/watchlistService';

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

  const navigate = useNavigate();

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
      <div className="overflow-hidden border rounded-md border-border/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Asset Class</TableHead>
              <TableHead>Exchange</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {watchlist.assets.map(watchlistAsset => (
              <TableRow
                key={watchlistAsset.id}
                onClick={() =>
                  navigate(`/graphs/${watchlistAsset.asset.id}`, {
                    state: { obj: watchlistAsset.asset },
                  })
                }
                className="cursor-pointer hover:bg-accent/10"
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
