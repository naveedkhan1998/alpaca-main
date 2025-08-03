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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-full h-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="w-16 h-8" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Watchlists</h2>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Watchlist
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {watchlists.map(watchlist => (
          <Card
            key={watchlist.id}
            className="transition-colors cursor-pointer hover:bg-muted/50"
            onClick={() => onWatchListSelect(watchlist)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{watchlist.name}</CardTitle>
                <Badge variant={watchlist.is_active ? 'default' : 'secondary'}>
                  {watchlist.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {watchlist.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {watchlist.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{watchlist.asset_count} assets</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
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
