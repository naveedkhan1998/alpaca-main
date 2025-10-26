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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Building2, Heart, Loader2, Plus } from 'lucide-react';
import {
  useGetWatchListsQuery,
  useAddAssetToWatchListMutation,
} from '@/api/watchlistService';
import { Asset } from '@/types/common-types';
import { useIsMobile } from '@/hooks/useMobile';

interface AddToWatchlistDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddToWatchlistDialog: React.FC<AddToWatchlistDialogProps> = ({
  asset,
  open,
  onOpenChange,
}) => {
  const isMobile = useIsMobile();
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(
    null
  );
  const { data: watchlistsData, isLoading: loadingWatchlists } =
    useGetWatchListsQuery({});
  const [addAssetToWatchlist, { isLoading: isAdding }] =
    useAddAssetToWatchListMutation();

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

  const AssetInfo = () => (
    asset && (
      <div className={isMobile ? "px-4 pb-4" : "px-6 pb-4"}>
        <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30 border-border/50">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold">{asset.symbol}</span>
              <Badge className={`${getAssetClassColor(asset.asset_class)} border text-xs px-2 py-0.5`}>
                {asset.asset_class.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm truncate text-muted-foreground">{asset.name}</p>
            <p className="text-xs text-muted-foreground">{asset.exchange}</p>
          </div>
        </div>
      </div>
    )
  );

  const WatchlistSelector = () => (
    <div className={isMobile ? "px-4 py-4" : "px-6 py-4"}>
      {loadingWatchlists ? (
        <div className="space-y-3">
          <Skeleton className="w-24 h-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-12" />
          ))}
        </div>
      ) : watchlists.length === 0 ? (
        <div className="py-8 text-center">
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50">
            <Heart className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">No watchlists yet</h3>
          <p className="max-w-sm mx-auto text-sm text-muted-foreground">
            Create your first watchlist to start tracking your favorite assets.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">Select Watchlist</label>
          <Select
            value={selectedWatchlistId?.toString() || ''}
            onValueChange={value => setSelectedWatchlistId(parseInt(value))}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Choose a watchlist..." />
            </SelectTrigger>
            <SelectContent>
              {watchlists.map(watchlist => (
                <SelectItem
                  key={watchlist.id}
                  value={watchlist.id.toString()}
                  className="py-3"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                        <Heart className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="font-medium">{watchlist.name}</span>
                        <p className="text-xs text-muted-foreground">
                          {watchlist.asset_count} asset{watchlist.asset_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const ActionButtons = () => (
    <div className={isMobile ? "flex gap-3 px-4 pb-4" : "flex gap-3"}>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isAdding}
        className={isMobile ? "flex-1 h-10" : "flex-1 h-10"}
      >
        Cancel
      </Button>
      <Button
        onClick={handleAddToWatchlist}
        disabled={!selectedWatchlistId || isAdding || watchlists.length === 0}
        className={isMobile ? "flex-1 h-10 gap-2" : "flex-1 h-10 gap-2"}
      >
        {isAdding ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        Add to Watchlist
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="px-4 pt-6 pb-4 text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DrawerTitle className="text-xl font-bold">Add to Watchlist</DrawerTitle>
                <DrawerDescription className="text-muted-foreground">
                  Choose a watchlist to add this asset to
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <AssetInfo />

          <Separator />

          <WatchlistSelector />

          <Separator />

          <DrawerFooter className="pt-2">
            <ActionButtons />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Add to Watchlist</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Choose a watchlist to add this asset to
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <AssetInfo />

        <Separator />

        <WatchlistSelector />

        <Separator />

        <DialogFooter className="gap-3 px-6 py-4">
          <ActionButtons />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
