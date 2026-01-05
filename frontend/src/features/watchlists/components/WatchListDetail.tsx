import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Edit,
  Trash2,
  MoreVertical,
  AlertTriangle,
  Plus,
  BarChart2,
  X,
} from 'lucide-react';
import {
  useGetWatchListByIdQuery,
  useDeleteWatchListMutation,
  useAddAssetToWatchListMutation,
} from '@/api/watchlistService';
import { WatchListDialog } from './WatchListDialog';
import { WatchListAssets } from './WatchListAssets';
import { WatchlistChart } from './WatchlistChart';
import { AssetSearch } from '@/components/AssetSearch';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Asset } from '@/types/common-types';
import { useIsMobile } from '@/hooks/useMobile';
import { toast } from 'sonner';

interface WatchListDetailProps {
  watchlistId: number;
  onBack: () => void;
}

export const WatchListDetail: React.FC<WatchListDetailProps> = ({
  watchlistId,
  onBack,
}) => {
  const requireAuth = useRequireAuth();
  const isMobile = useIsMobile();
  const {
    data: watchlist,
    isLoading,
    error,
  } = useGetWatchListByIdQuery(watchlistId);
  const [deleteWatchList] = useDeleteWatchListMutation();
  const [addAssetToWatchlist] = useAddAssetToWatchListMutation();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    setSelectedAsset(null);
  }, [watchlistId]);

  const existingAssetIds = useMemo(() => {
    if (!watchlist?.assets) return new Set<number>();
    return new Set(watchlist.assets.map(a => a.asset.id));
  }, [watchlist]);

  const handleDelete = async () => {
    if (!requireAuth('delete watchlists')) return;

    if (window.confirm('Delete this watchlist? This cannot be undone.')) {
      try {
        await deleteWatchList(watchlistId).unwrap();
        onBack();
      } catch (error) {
        console.error('Error deleting watchlist:', error);
      }
    }
  };

  const handleAddAsset = async (asset: Asset) => {
    try {
      await addAssetToWatchlist({
        watchlist_id: watchlistId,
        asset_id: asset.id,
      }).unwrap();
      toast.success(`Added ${asset.symbol} to ${watchlist?.name}`);
      setAddAssetOpen(false);
    } catch (error) {
      console.error('Error adding asset:', error);
      toast.error('Failed to add asset to watchlist');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-32 h-4" />
          </div>
          <Skeleton className="w-8 h-8" />
        </div>
        <Skeleton className="w-full h-48" />
      </div>
    );
  }

  if (error || !watchlist) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm border rounded-lg text-destructive bg-destructive/5">
        <AlertTriangle className="w-4 h-4" />
        Failed to load watchlist
      </div>
    );
  }

  const hasAssets = watchlist.assets && watchlist.assets.length > 0;

  return (
    <div className="flex flex-col h-full p-4 space-y-4 border rounded-lg">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold truncate">{watchlist.name}</h2>
            {!watchlist.is_active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          {watchlist.description && (
            <p className="text-sm truncate text-muted-foreground">
              {watchlist.description}
            </p>
          )}
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            <span>{watchlist.asset_count} assets</span>
            <span>
              Created {new Date(watchlist.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!requireAuth('add assets to watchlists')) return;
              setAddAssetOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (!requireAuth('edit watchlists')) return;
                  setEditDialogOpen(true);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Area */}
      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Asset List - Takes full width if no asset selected, or partial if selected */}
        {hasAssets ? (
          <div
            className={`${selectedAsset ? 'xl:col-span-5 hidden xl:block' : 'xl:col-span-12'} overflow-y-auto border rounded-md`}
          >
            <div className="p-2 text-xs text-center border-b bg-muted/20 text-muted-foreground">
              Select an asset to view chart
            </div>
            <WatchListAssets
              watchlistId={watchlistId}
              onAssetSelect={setSelectedAsset}
              selectedAssetId={selectedAsset?.id}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-10 border border-dashed rounded-md xl:col-span-12 bg-muted/10">
            <div className="p-4 mb-4 rounded-full bg-muted/30">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Watchlist is empty</h3>
            <p className="max-w-sm mb-6 text-sm text-center text-muted-foreground">
              Start tracking markets by adding assets to this watchlist.
            </p>
            <Button onClick={() => setAddAssetOpen(true)}>
              Add Your First Asset
            </Button>
          </div>
        )}

        {/* Chart Area (Desktop: Right Side, Mobile: Replaces List when selected) */}
        {selectedAsset ? (
          <div
            className={`xl:col-span-7 flex flex-col gap-2 ${isMobile ? 'col-span-1 fixed inset-0 z-50 bg-background p-4' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedAsset(null)}
                  className="-ml-2"
                >
                  <X className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    {selectedAsset.symbol}
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal"
                    >
                      {selectedAsset.asset_class}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedAsset.name}
                  </div>
                </div>
              </div>
              {/* Link to full graph page */}
              <Button variant="secondary" size="sm" asChild>
                <Link to={`/graphs/${selectedAsset.id}`}>
                  <BarChart2 className="w-4 h-4 mr-2" />
                  Full Chart
                </Link>
              </Button>
            </div>
            <div className="flex-1 min-h-[300px] border rounded-lg overflow-hidden relative">
              <WatchlistChart assetId={selectedAsset.id} />
            </div>
          </div>
        ) : (
          /* Desktop Empty State for Chart Area */
          hasAssets && <></>
        )}
      </div>

      <WatchListDialog
        watchlist={watchlist}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => setEditDialogOpen(false)}
      />

      <AssetSearch
        open={addAssetOpen}
        onOpenChange={setAddAssetOpen}
        isMobile={isMobile}
        onAssetSelect={handleAddAsset}
        actionLabel={`Add to ${watchlist.name}`}
        existingAssetIds={existingAssetIds}
      />
    </div>
  );
};
