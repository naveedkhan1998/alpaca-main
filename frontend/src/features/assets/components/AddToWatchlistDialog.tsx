import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useGetWatchListsQuery, useAddAssetToWatchListMutation } from '@/api/watchlistService';
import { Asset } from '@/types/common-types';

interface AddToWatchlistDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddToWatchlistDialog: React.FC<AddToWatchlistDialogProps> = ({ asset, open, onOpenChange }) => {
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(null);
  const { data: watchlistsData, isLoading: loadingWatchlists } = useGetWatchListsQuery({});
  const [addAssetToWatchlist, { isLoading: isAdding }] = useAddAssetToWatchListMutation();

  const watchlists = watchlistsData?.results || [];

  const handleAddToWatchlist = async () => {
    if (!asset || !selectedWatchlistId) return;

    try {
      await addAssetToWatchlist({
        watchlist_id: selectedWatchlistId,
        asset_id: asset.id,
      }).unwrap();

      onOpenChange(false);
      setSelectedWatchlistId(null);
    } catch (error) {
      console.error('Error adding asset to watchlist:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
          <DialogDescription>Add {asset?.symbol} to one of your watchlists.</DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {loadingWatchlists ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-12" />
              ))}
            </div>
          ) : watchlists.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-muted-foreground">You don't have any watchlists yet. Create one first to add assets.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Watchlist</label>
              <Select
                value={selectedWatchlistId?.toString() || ''}
                onValueChange={value => setSelectedWatchlistId(parseInt(value))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Choose a watchlist" />
                </SelectTrigger>
                <SelectContent>
                  {watchlists.map(watchlist => (
                    <SelectItem key={watchlist.id} value={watchlist.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span>{watchlist.name}</span>
                        <Badge variant="secondary" className="ml-2">
                          {watchlist.asset_count} assets
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleAddToWatchlist} disabled={!selectedWatchlistId || isAdding}>
            {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add to Watchlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
