import React, { useCallback, useMemo, useState } from 'react';

import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
  PageActions,
} from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Plus,
  Search,
  Calendar,
  Building2,
  AlertCircle,
} from 'lucide-react';
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
      header={
        <PageHeader>
          <div className="flex items-center gap-3">
            Watchlists
            {!!watchlists.length && (
              <Badge variant="secondary" className="ml-1">
                {watchlists.length}
              </Badge>
            )}
          </div>
        </PageHeader>
      }
      subheader={
        <PageSubHeader>
          Organize and monitor assets with custom lists. Filter, search, and jump to charts quickly.
        </PageSubHeader>
      }
      actions={
        <PageActions>
          {selectedWatchlist && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Watchlist
          </Button>
        </PageActions>
      }
    >
      <PageContent>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-12">
          {/* Sidebar (List) */}
          <div
            className={`md:col-span-5 lg:col-span-4 ${selectedWatchlist ? 'hidden md:block' : 'block'}`}
          >
            <Card className="border-border/40">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold sm:text-lg">Your Watchlists</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="relative">
                  <Search className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-muted-foreground" />
                  <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search watchlists…" className="h-9 pl-9" />
                </div>
                <div className="inline-flex rounded-md border border-border/50 p-0.5 bg-card/60">
                  <Button type="button" variant={showActiveOnly ? 'ghost' : 'secondary'} size="sm" className="h-8" onClick={() => setShowActiveOnly(false)}>All</Button>
                  <Button type="button" variant={showActiveOnly ? 'secondary' : 'ghost'} size="sm" className="h-8" onClick={() => setShowActiveOnly(true)}>Active</Button>
                </div>

                {/* List body */}
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-full h-16 rounded-md animate-pulse bg-muted/40" />
                    ))}
                  </div>
                ) : error ? (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Failed to load watchlists. Please try again.
                    </AlertDescription>
                  </Alert>
                ) : filtered.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="text-sm text-muted-foreground">No watchlists found.</div>
                    <div className="mt-3">
                      <Button onClick={() => setCreateOpen(true)} size="sm">
                        <Plus className="w-4 h-4 mr-2" /> Create your first list
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(w => {
                      const isActive = selectedWatchlist?.id === w.id;
                      return (
                        <button
                          key={w.id}
                          onClick={() => handleWatchListSelect(w)}
                          className={`w-full rounded-md border px-3 py-3 text-left transition-colors hover:shadow-sm ${
                            isActive
                              ? 'border-primary/30 bg-primary/5'
                              : 'border-border/40 hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                  {w.name}
                                </span>
                                <Badge
                                  variant={
                                    w.is_active ? 'default' : 'secondary'
                                  }
                                  className="h-5 px-1.5 text-[10px]"
                                >
                                  {w.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              {w.description && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                  {w.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs shrink-0 text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                <span>{w.asset_count}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                  {new Date(w.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Mobile create button (shown at bottom) */}
                <div className="pt-2 md:hidden">
                  <Button
                    className="w-full"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Watchlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detail Pane */}
          <div className={`md:col-span-7 lg:col-span-8 ${selectedWatchlist ? 'block' : 'hidden md:block'}`}>
            {selectedWatchlist ? (
              <WatchListDetail
                watchlistId={selectedWatchlist.id}
                onBack={handleBack}
              />
            ) : (
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">
                    Select a watchlist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Choose a watchlist from the left to view its assets and
                    details. Or create a new watchlist to start organizing your
                    instruments.
                  </p>
                  <div className="mt-4">
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Watchlist
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
