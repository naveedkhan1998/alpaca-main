import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Heart,
  TrendingUp,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSearchAssetsOptimizedQuery } from '@/api/assetService';
import { AddToWatchlistDialog } from '../../features/assets/components/AddToWatchlistDialog';
import { Asset } from '@/types/common-types';
import { useDebounce } from '@/hooks/useDebounce';
import { useRequireAuth } from '@/hooks/useRequireAuth';

interface AssetSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile?: boolean;
}

const getAssetClassColor = (assetClass: string) => {
  switch (assetClass) {
    case 'us_equity':
      return {
        badge:
          'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        gradient: 'from-blue-500 to-indigo-500',
      };
    case 'us_option':
      return {
        badge:
          'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        gradient: 'from-purple-500 to-fuchsia-500',
      };
    case 'crypto':
      return {
        badge:
          'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        gradient: 'from-orange-500 to-amber-500',
      };
    default:
      return {
        badge:
          'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800',
        gradient: 'from-gray-500 to-slate-500',
      };
  }
};

const AssetSearchItem: React.FC<{
  asset: Asset;
  onAddToWatchlist: (asset: Asset) => void;
}> = ({ asset, onAddToWatchlist }) => {
  const config = getAssetClassColor(asset.asset_class);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative group"
    >
      <div className="flex items-center justify-between p-3 transition-all rounded-lg cursor-pointer hover:bg-muted/50">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold truncate">{asset.symbol}</h4>
            <Badge variant="secondary" className={`${config.badge} text-xs`}>
              {asset.asset_class.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {asset.name}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{asset.exchange}</span>
            {asset.tradable && (
              <Badge variant="outline" className="text-[10px] h-4">
                Tradable
              </Badge>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={e => {
            e.stopPropagation();
            onAddToWatchlist(asset);
          }}
          className="gap-2 transition-colors hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <Heart className="w-4 h-4" />
          <span className="hidden sm:inline">Add to Watchlist</span>
        </Button>
      </div>

      {/* Gradient border on hover */}
      <div className="absolute inset-0 transition-opacity duration-300 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 -z-10">
        <div
          className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-10 rounded-lg`}
        />
      </div>
    </motion.div>
  );
};

export const AssetSearch: React.FC<AssetSearchProps> = ({
  open,
  onOpenChange,
  isMobile = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showWatchlistDialog, setShowWatchlistDialog] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const requireAuth = useRequireAuth();

  const { data, isLoading, isFetching, error } = useSearchAssetsOptimizedQuery(
    {
      q: debouncedSearch,
      limit: 20,
    },
    {
      skip: !debouncedSearch || debouncedSearch.length < 2,
    }
  );

  const assets = data?.results || [];
  const errorStatus =
    error && typeof error === 'object' && 'status' in error
      ? (error as { status?: number }).status
      : undefined;
  const errorMessage =
    errorStatus === 429
      ? 'Rate limit reached. Please wait a moment or log in for higher limits.'
      : 'Unable to load search results. Please try again.';

  const handleAddToWatchlist = useCallback(
    (asset: Asset) => {
      if (!requireAuth('add assets to watchlists')) return;
      setSelectedAsset(asset);
      setShowWatchlistDialog(true);
    },
    [requireAuth]
  );

  const handleClose = useCallback(() => {
    setSearchQuery('');
    onOpenChange(false);
  }, [onOpenChange]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, handleClose]);

  const content = (
    <div className="flex flex-col ">
      {/* Search Input */}
      <div className="relative px-4 py-3">
        <Search className="absolute w-5 h-5 -translate-y-1/2 pointer-events-none left-7 top-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search assets by symbol or name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="h-12 pl-12 text-base border-border/60 focus:border-primary/50"
          autoFocus
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute w-8 h-8 -translate-y-1/2 right-6 top-1/2"
            onClick={() => setSearchQuery('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Results */}
      <ScrollArea className="flex-1 px-4 max-h-[70dvh]">
        <div className="pb-4 space-y-1">
          {!searchQuery || searchQuery.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-muted/50">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Start typing to search assets
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Search by symbol, name, or exchange
              </p>
            </div>
          ) : isLoading || isFetching ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 mb-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Searching assets...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-destructive/10">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {errorStatus === 429 ? 'Rate limit reached' : 'Search error'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {errorMessage}
              </p>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-muted/50">
                <TrendingUp className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No assets found
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Try a different search term
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-1">
                <p className="px-3 py-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                  {assets.length} {assets.length === 1 ? 'Result' : 'Results'}
                </p>
                {assets.map(asset => (
                  <AssetSearchItem
                    key={asset.id}
                    asset={asset}
                    onAddToWatchlist={handleAddToWatchlist}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      {!isMobile && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 text-xs border-t text-muted-foreground bg-muted/20">
          <kbd className="px-2 py-1 font-mono text-[10px] font-semibold rounded bg-muted ring-1 ring-border">
            Ctrl
          </kbd>
          <span>+</span>
          <kbd className="px-2 py-1 font-mono text-[10px] font-semibold rounded bg-muted ring-1 ring-border">
            K
          </kbd>
          <span>to open</span>
          <span className="mx-2">•</span>
          <kbd className="px-2 py-1 font-mono text-[10px] font-semibold rounded bg-muted ring-1 ring-border">
            ESC
          </kbd>
          <span>to close</span>
        </div>
      )}
    </div>
  );

  // Desktop Dialog
  if (!isMobile) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl p-0 gap-0 max-h-[85dvh]">
            <DialogHeader className="px-4 pt-4 pb-0">
              <DialogTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Quick Asset Search
              </DialogTitle>
            </DialogHeader>
            {content}
          </DialogContent>
        </Dialog>

        <AddToWatchlistDialog
          asset={selectedAsset}
          open={showWatchlistDialog}
          onOpenChange={setShowWatchlistDialog}
        />
      </>
    );
  }

  // Mobile Drawer
  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[90dvh] p-0">
          <DrawerHeader className="px-4 pb-0">
            <DrawerTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Quick Asset Search
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>

      <AddToWatchlistDialog
        asset={selectedAsset}
        open={showWatchlistDialog}
        onOpenChange={setShowWatchlistDialog}
      />
    </>
  );
};

export default AssetSearch;
