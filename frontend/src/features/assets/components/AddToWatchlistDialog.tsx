import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Check,
  Heart,
  Loader2,
  Plus,
  Search,
  Building2,
  Globe,
  Layers,
} from 'lucide-react';
import {
  useGetWatchListsQuery,
  useAddAssetToWatchListMutation,
  useCreateWatchListMutation,
} from '@/api/watchlistService';
import { Asset } from '@/types/common-types';
import { useIsMobile } from '@/hooks/useMobile';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { toast } from 'sonner';

interface AddToWatchlistDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const AddToWatchlistDialog: React.FC<AddToWatchlistDialogProps> = ({
  asset,
  open,
  onOpenChange,
}) => {
  const isMobile = useIsMobile();
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const requireAuth = useRequireAuth();
  const { data: watchlistsData, isLoading: loadingWatchlists } =
    useGetWatchListsQuery({});
  const [addAssetToWatchlist, { isLoading: isAdding }] =
    useAddAssetToWatchListMutation();
  const [createWatchList, { isLoading: isCreatingWatchlist }] =
    useCreateWatchListMutation();

  const watchlists = useMemo(
    () => watchlistsData?.results || [],
    [watchlistsData]
  );

  // Filter watchlists based on search query
  const filteredWatchlists = useMemo(() => {
    if (!searchQuery.trim()) return watchlists;
    return watchlists.filter(w =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [watchlists, searchQuery]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSelectedWatchlistId(null);
      setSearchQuery('');
    }, 300);
  };

  const handleCreateAndAdd = async () => {
    if (!asset || !searchQuery.trim()) return;
    if (!requireAuth('create watchlists')) return;

    try {
      const newWatchlist = await createWatchList({
        name: searchQuery,
        is_active: true,
      }).unwrap();

      try {
        await addAssetToWatchlist({
          watchlist_id: newWatchlist.data.id,
          asset_id: asset.id,
        }).unwrap();
        toast.success(`Created "${searchQuery}" and added ${asset.symbol}`);
        handleClose();
      } catch (addError) {
        console.error('Error adding asset to new watchlist:', addError);
        toast.warning(
          `Watchlist "${searchQuery}" created, but failed to add asset.`
        );
        handleClose();
      }
    } catch (createError) {
      console.error('Error creating watchlist:', createError);
      toast.error('Failed to create watchlist');
    }
  };

  const handleAdd = async () => {
    if (!asset || !selectedWatchlistId) return;
    if (!requireAuth('add assets to watchlists')) return;

    try {
      await addAssetToWatchlist({
        watchlist_id: selectedWatchlistId,
        asset_id: asset.id,
      }).unwrap();

      const watchlistName = watchlists.find(
        w => w.id === selectedWatchlistId
      )?.name;
      toast.success(`Added ${asset.symbol} to ${watchlistName}`);
      handleClose();
    } catch (error) {
      console.error('Error adding asset to watchlist:', error);
      toast.error('Failed to add to watchlist');
    }
  };

  const assetPreview = asset ? (
    <div className="flex items-start gap-4 p-4 mb-4 border rounded-lg bg-muted/40">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background shadow-sm shrink-0">
        {asset.asset_class === 'crypto' ? (
          <Globe className="w-5 h-5 text-orange-500" />
        ) : (
          <Building2 className="w-5 h-5 text-blue-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold tracking-tight">{asset.symbol}</h3>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-5 ${getAssetClassColor(asset.asset_class)}`}
          >
            {asset.asset_class.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <p className="text-sm truncate text-muted-foreground">{asset.name}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" /> {asset.exchange}
          </span>
        </div>
      </div>
    </div>
  ) : null;

  const watchlistList = (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
        <Input
          placeholder="Search or create watchlist..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>

      <ScrollArea className="h-[280px] -mx-1 pr-3">
        {loadingWatchlists ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="w-full h-14 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2 py-2">
            {/* Create New Option (if search doesn't match exactly) */}
            {searchQuery &&
              !watchlists.some(
                w => w.name.toLowerCase() === searchQuery.toLowerCase()
              ) && (
                <button
                  onClick={handleCreateAndAdd}
                  disabled={isCreatingWatchlist || isAdding}
                  className="flex items-center w-full gap-3 p-3 transition-colors border-2 border-dashed rounded-lg group border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10">
                    {isCreatingWatchlist ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">
                      Create "{searchQuery}"
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Create new watchlist and add asset
                    </p>
                  </div>
                </button>
              )}

            {/* Existing Watchlists */}
            {filteredWatchlists.map(watchlist => {
              const isSelected = selectedWatchlistId === watchlist.id;
              const hasAsset = watchlist.assets?.some(
                a => a.asset.id === asset?.id
              );

              return (
                <button
                  key={watchlist.id}
                  onClick={() =>
                    !hasAsset && setSelectedWatchlistId(watchlist.id)
                  }
                  disabled={hasAsset}
                  className={`relative flex items-center w-full gap-3 p-3 transition-all border rounded-lg group text-left
                    ${
                      hasAsset
                        ? 'opacity-60 cursor-not-allowed bg-muted/30 border-transparent'
                        : isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                >
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors
                    ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground group-hover:bg-background'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Heart className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-foreground">
                      {watchlist.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {hasAsset
                        ? 'Already added'
                        : `${watchlist.asset_count} asset${watchlist.asset_count !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Empty State */}
            {filteredWatchlists.length === 0 && !searchQuery && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 mb-2 rounded-full bg-muted/50">
                  <Heart className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium">No watchlists found</p>
                <p className="text-xs text-muted-foreground">
                  Start typing to create one
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const dialogContent = (
    <div className="flex flex-col h-full">
      {assetPreview}
      <div className="flex-1 min-h-0">
        <h4 className="mb-3 text-sm font-medium text-muted-foreground">
          Select Watchlist
        </h4>
        {watchlistList}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Add to Watchlist</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-hidden">{dialogContent}</div>
          <DrawerFooter className="pt-2">
            <Button
              onClick={handleAdd}
              disabled={!selectedWatchlistId || isAdding}
              className="w-full"
            >
              {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Asset
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
        </DialogHeader>
        {dialogContent}
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedWatchlistId || isAdding}
          >
            {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Asset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
