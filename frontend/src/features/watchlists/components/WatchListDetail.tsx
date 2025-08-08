import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Edit, Trash2, MoreVertical, AlertCircle } from 'lucide-react';
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
      window.confirm(
        'Are you sure you want to delete this watchlist? This action cannot be undone.'
      )
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
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-8 h-8" />
          <div className="flex-1 space-y-2">
            <Skeleton className="w-48 h-8" />
            <Skeleton className="w-64 h-4" />
          </div>
        </div>
        <Skeleton className="w-full h-64" />
      </div>
    );
  }

  if (error || !watchlist) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Failed to load watchlist details. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="text-xl sm:text-2xl font-semibold truncate">
                {watchlist.name}
              </CardTitle>
              {watchlist.description && (
                <p className="mt-1 text-sm text-muted-foreground truncate">
                  {watchlist.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={watchlist.is_active ? 'default' : 'secondary'}>
                {watchlist.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assets</p>
              <p className="text-xl sm:text-2xl font-bold">{watchlist.asset_count}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Created</p>
              <p className="text-sm sm:text-base">
                {new Date(watchlist.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
              <p className="text-sm sm:text-base">
                {new Date(watchlist.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Assets ({watchlist.asset_count})</CardTitle>
        </CardHeader>
        <CardContent>
          <WatchListAssets watchlistId={watchlistId} />
        </CardContent>
      </Card>

      <WatchListDialog
        watchlist={watchlist}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => setEditDialogOpen(false)}
      />
    </div>
  );
};
