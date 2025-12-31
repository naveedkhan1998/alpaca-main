import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import {
  useCreateWatchListMutation,
  useUpdateWatchListMutation,
} from '@/api/watchlistService';
import { WatchList, CreateWatchListParams } from '@/types/common-types';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface WatchListDialogProps {
  watchlist?: WatchList;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const WatchListDialog: React.FC<WatchListDialogProps> = ({
  watchlist,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const requireAuth = useRequireAuth();
  const [formData, setFormData] = useState<CreateWatchListParams>({
    name: '',
    description: '',
    is_active: true,
  });

  const [createWatchList, { isLoading: isCreating }] =
    useCreateWatchListMutation();
  const [updateWatchList, { isLoading: isUpdating }] =
    useUpdateWatchListMutation();

  const isLoading = isCreating || isUpdating;
  const isEditing = !!watchlist;

  useEffect(() => {
    if (open) {
      setFormData({
        name: watchlist?.name || '',
        description: watchlist?.description || '',
        is_active: watchlist?.is_active ?? true,
      });
    }
  }, [open, watchlist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth(isEditing ? 'update watchlists' : 'create watchlists')) {
      return;
    }

    try {
      if (isEditing) {
        await updateWatchList({ id: watchlist.id, data: formData }).unwrap();
      } else {
        await createWatchList(formData).unwrap();
      }

      onSuccess();
      onOpenChange(false);
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
      <DialogContent className="sm:max-w-[460px]">
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
                className="min-h-[88px]"
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
