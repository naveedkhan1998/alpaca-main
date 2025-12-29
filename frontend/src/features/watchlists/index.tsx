import React, { useCallback, useMemo, useState } from 'react';

import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
  PageActions,
} from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Search, AlertTriangle } from 'lucide-react';
import { WatchListDetail } from './components/WatchListDetail';
import { WatchListDialog } from './components/WatchListDialog';
import { setSelectedWatchlist } from './watchlistSlice';

import { WatchList } from '@/types/common-types';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { useGetWatchListsQuery } from '@/api/watchlistService';

export const WatchlistsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const selectedWatchlist = useAppSelector(
    state => state.watchlist.selectedWatchlist
  );
  const { data, isLoading, error, refetch } = useGetWatchListsQuery({});
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const handleWatchListSelect = useCallback(
    (watchlist: WatchList) => {
      dispatch(setSelectedWatchlist(watchlist));
    },
    [dispatch]
  );

  const handleBack = useCallback(() => {
    dispatch(setSelectedWatchlist(null));
  }, [dispatch]);

  const watchlists = useMemo(() => data?.results || [], [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return watchlists.filter((w: WatchList) => {
      if (showActiveOnly && !w.is_active) return false;
      if (!q) return true;
      const hay = `${w.name} ${w.description ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [watchlists, query, showActiveOnly]);

  return (
    <PageLayout
      header={<PageHeader>Watchlists</PageHeader>}
      subheader={
        <PageSubHeader>Organize and monitor your instruments</PageSubHeader>
      }
      actions={
        <PageActions>
          {selectedWatchlist && (
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New
          </Button>
        </PageActions>
      }
    >
      <PageContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Sidebar (List) */}
          <div
            className={`md:col-span-5 lg:col-span-4 ${selectedWatchlist ? 'hidden md:block' : 'block'}`}
          >
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Your Watchlists</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search…"
                    className="h-9 pl-9"
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant={showActiveOnly ? 'ghost' : 'secondary'}
                    size="sm"
                    onClick={() => setShowActiveOnly(false)}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    variant={showActiveOnly ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setShowActiveOnly(true)}
                  >
                    Active
                  </Button>
                </div>

                {/* List body */}
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-full rounded-md h-14 animate-pulse bg-muted/40"
                      />
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-2 p-3 text-sm border rounded-lg text-destructive bg-destructive/5">
                    <AlertTriangle className="w-4 h-4" />
                    Failed to load watchlists
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-8 text-sm text-center text-muted-foreground">
                    No watchlists found
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filtered.map(w => {
                      const isSelected = selectedWatchlist?.id === w.id;
                      return (
                        <button
                          key={w.id}
                          onClick={() => handleWatchListSelect(w)}
                          className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-accent text-accent-foreground'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="block text-sm font-medium truncate">
                                {w.name}
                              </span>
                              {w.description && (
                                <p className="text-xs line-clamp-1 text-muted-foreground">
                                  {w.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs shrink-0 text-muted-foreground">
                              <span>{w.asset_count} assets</span>
                              {!w.is_active && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detail Pane */}
          <div
            className={`md:col-span-7 lg:col-span-8 ${selectedWatchlist ? 'block' : 'hidden md:block'}`}
          >
            {selectedWatchlist ? (
              <WatchListDetail
                watchlistId={selectedWatchlist.id}
                onBack={handleBack}
              />
            ) : (
              <div className="p-6 text-center border rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Select a watchlist to view details
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Dialog */}
        <WatchListDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => {
            setCreateOpen(false);
            refetch();
          }}
        />
      </PageContent>
    </PageLayout>
  );
};

export default WatchlistsPage;
