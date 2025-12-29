import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Building2, Calendar, AlertCircle } from 'lucide-react';
import { useGetWatchListsQuery } from '@/api/watchlistService';
import { WatchList } from '@/types/common-types';
import { WatchListDialog } from './WatchListDialog';

interface WatchListsListProps {
  onWatchListSelect: (watchlist: WatchList) => void;
}

export const WatchListsList: React.FC<WatchListsListProps> = ({
  onWatchListSelect,
}) => {
  const { data, isLoading, error, refetch } = useGetWatchListsQuery({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const watchlists = data?.results || [];

  const handleCreateSuccess = useCallback(() => {
    setCreateDialogOpen(false);
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border/40">
            <CardHeader>
              <Skeleton className="w-40 h-6" />
              <Skeleton className="w-3/4 h-4" />
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Skeleton className="w-20 h-8" />
              <Skeleton className="w-24 h-4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Failed to load watchlists. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (watchlists.length === 0) {
    return (
      <div className="py-12 text-center">
        <Building2 className="w-16 h-16 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No watchlists yet</h3>
        <p className="mt-2 text-muted-foreground">
          Create your first watchlist to start organizing your favorite assets.
        </p>
        <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Watchlist
        </Button>
        <WatchListDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={handleCreateSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold sm:text-lg text-foreground">
          Your Watchlists
          <span className="ml-2 text-sm text-muted-foreground">
            ({watchlists.length})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Watchlist
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {watchlists.map(watchlist => (
          <Card
            key={watchlist.id}
            className="transition-colors cursor-pointer hover:bg-muted/40 border-border/40"
            onClick={() => onWatchListSelect(watchlist)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold sm:text-lg">
                  {watchlist.name}
                </CardTitle>
                <Badge variant={watchlist.is_active ? 'default' : 'secondary'}>
                  {watchlist.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {watchlist.description && (
                <p className="text-sm line-clamp-2 text-muted-foreground">
                  {watchlist.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>{watchlist.asset_count} assets</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(watchlist.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <WatchListDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};
