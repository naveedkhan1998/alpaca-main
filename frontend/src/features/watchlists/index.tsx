import React, { useState, useCallback } from 'react';
import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
  PageActions,
} from '@/components/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Calendar,
  Building2,
  MoreVertical,
  Loader2,
  AlertCircle,
  ChartBarIcon,
} from 'lucide-react';

import {
  useGetWatchListsQuery,
  useGetWatchListByIdQuery,
  useCreateWatchListMutation,
  useUpdateWatchListMutation,
  useDeleteWatchListMutation,
  useRemoveAssetFromWatchListMutation,
} from '@/api/watchlistService';
import { WatchList, CreateWatchListParams } from '@/types/common-types';
import { Link } from 'react-router-dom';

// Create/Edit Watchlist Dialog
const WatchListDialog: React.FC<{
  watchlist?: WatchList;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}> = ({ watchlist, open, onOpenChange, onSuccess }) => {
  const [formData, setFormData] = useState<CreateWatchListParams>({
    name: watchlist?.name || '',
    description: watchlist?.description || '',
    is_active: watchlist?.is_active ?? true,
  });

  const [createWatchList, { isLoading: isCreating }] =
    useCreateWatchListMutation();
  const [updateWatchList, { isLoading: isUpdating }] =
    useUpdateWatchListMutation();

  const isLoading = isCreating || isUpdating;
  const isEditing = !!watchlist;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await updateWatchList({ id: watchlist.id, data: formData }).unwrap();
      } else {
        await createWatchList(formData).unwrap();
      }

      onSuccess();
      onOpenChange(false);

      // Reset form if creating new
      if (!isEditing) {
        setFormData({ name: '', description: '', is_active: true });
      }
    } catch (error) {
      console.error('Error saving watchlist:', error);
    }
  };

  const handleChange = (
    field: keyof CreateWatchListParams,
    value: string | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Watchlist' : 'Create New Watchlist'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your watchlist details below.'
              : 'Create a new watchlist to organize your favorite assets.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Enter watchlist name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="Optional description"
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Watchlist
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Watchlist Assets Table
const WatchListAssets: React.FC<{
  watchlistId: number;
}> = ({ watchlistId }) => {
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
      <div className="overflow-hidden border rounded-md">
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
                    <Building2 className="w-4 h-4 text-primary" />
                    {watchlistAsset.asset.symbol}
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px]">
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
                      className="w-8 h-8"
                    >
                      <Link
                        to={`/graphs/${watchlistAsset.asset.id}`}
                        state={{ obj: watchlistAsset.asset }}
                      >
                        <ChartBarIcon className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveAsset(watchlistAsset.asset.id)}
                      disabled={isRemoving}
                    >
                      <Trash2 className="w-4 h-4" />
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

// Watchlist Detail View
const WatchListDetail: React.FC<{
  watchlistId: number;
  onBack: () => void;
}> = ({ watchlistId, onBack }) => {
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{watchlist.name}</CardTitle>
              {watchlist.description && (
                <p className="mt-1 text-muted-foreground">
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
                  <Button variant="ghost" size="sm">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Assets
              </p>
              <p className="text-2xl font-bold">{watchlist.asset_count}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Created
              </p>
              <p className="text-base">
                {new Date(watchlist.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Last Updated
              </p>
              <p className="text-base">
                {new Date(watchlist.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
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

// Watchlist List View
const WatchListsList: React.FC<{
  onWatchListSelect: (watchlist: WatchList) => void;
}> = ({ onWatchListSelect }) => {
  const { data, isLoading, error, refetch } = useGetWatchListsQuery({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const watchlists = data?.data || [];

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

// Main Watchlists Page
const WatchlistsPage: React.FC = () => {
  const [selectedWatchlist, setSelectedWatchlist] = useState<WatchList | null>(
    null
  );

  const handleWatchListSelect = useCallback((watchlist: WatchList) => {
    setSelectedWatchlist(watchlist);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedWatchlist(null);
  }, []);

  return (
    <PageLayout
      header={
        <PageHeader>
          <div className="flex items-center gap-3">Watchlists</div>
        </PageHeader>
      }
      subheader={
        <PageSubHeader>
          Organize and monitor your favorite assets with custom watchlists.
        </PageSubHeader>
      }
      actions={
        <PageActions>
          {selectedWatchlist && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Watchlists
            </Button>
          )}
        </PageActions>
      }
    >
      <PageContent>
        {selectedWatchlist ? (
          <WatchListDetail
            watchlistId={selectedWatchlist.id}
            onBack={handleBack}
          />
        ) : (
          <WatchListsList onWatchListSelect={handleWatchListSelect} />
        )}
      </PageContent>
    </PageLayout>
  );
};

export default WatchlistsPage;
