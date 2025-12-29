import React, { useState } from 'react';
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
import { Edit, Trash2, MoreVertical, AlertTriangle } from 'lucide-react';
import {
  useGetWatchListByIdQuery,
  useDeleteWatchListMutation,
} from '@/api/watchlistService';
import { WatchListDialog } from './WatchListDialog';
import { WatchListAssets } from './WatchListAssets';

interface WatchListDetailProps {
  watchlistId: number;
  onBack: () => void;
}

export const WatchListDetail: React.FC<WatchListDetailProps> = ({
  watchlistId,
  onBack,
}) => {
  const {
    data: watchlist,
    isLoading,
    error,
  } = useGetWatchListByIdQuery(watchlistId);
  const [deleteWatchList] = useDeleteWatchListMutation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (
      window.confirm('Delete this watchlist? This cannot be undone.')
    ) {
      try {
        await deleteWatchList(watchlistId).unwrap();
        onBack();
      } catch (error) {
        console.error('Error deleting watchlist:', error);
      }
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
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
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
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

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{watchlist.asset_count} assets</span>
        <span>Created {new Date(watchlist.created_at).toLocaleDateString()}</span>
      </div>

      {/* Assets */}
      <div className="pt-2">
        <h3 className="mb-3 text-sm font-medium">Assets</h3>
        <WatchListAssets watchlistId={watchlistId} />
      </div>

      <WatchListDialog
        watchlist={watchlist}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => setEditDialogOpen(false)}
      />
    </div>
  );
};
