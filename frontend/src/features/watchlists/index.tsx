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
import { useRequireAuth } from '@/hooks/useRequireAuth';

export const WatchlistsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const selectedWatchlist = useAppSelector(
    state => state.watchlist.selectedWatchlist
  );
  const { data, isLoading, error, refetch } = useGetWatchListsQuery({});
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const requireAuth = useRequireAuth();

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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-7 text-[12px] px-2"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
            </Button>
          )}
          <Button
            size="sm"
            className="h-7 text-[12px] px-2.5 bg-primary/90 hover:bg-primary"
            onClick={() => {
              if (!requireAuth('create watchlists')) return;
              setCreateOpen(true);
            }}
          >
            <Plus className="w-3 h-3 mr-1" /> New
          </Button>
        </PageActions>
      }
    >
      <PageContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          {/* Sidebar (List) */}
          <div
            className={`md:col-span-5 lg:col-span-4 ${selectedWatchlist ? 'hidden md:block' : 'block'}`}
          >
            <div className="p-3 border rounded bg-card border-border/60">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Your Watchlists
                </h3>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute w-3 h-3 -translate-y-1/2 pointer-events-none left-2.5 top-1/2 text-muted-foreground/60" />
                  <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search…"
                    className="h-7 pl-7 text-[12px] bg-background/50 border-border/50 focus:border-primary/40"
                  />
                </div>
                <div className="flex gap-0.5">
                  <Button
                    type="button"
                    variant={showActiveOnly ? 'ghost' : 'secondary'}
                    size="sm"
                    onClick={() => setShowActiveOnly(false)}
                    className="h-6 text-[11px] px-2"
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    variant={showActiveOnly ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setShowActiveOnly(true)}
                    className="h-6 text-[11px] px-2"
                  >
                    Active
                  </Button>
                </div>

                {/* List body */}
                {isLoading ? (
                  <div className="space-y-1.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-full h-10 rounded animate-pulse bg-muted/30"
                      />
                    ))}
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-1.5 p-2 text-[11px] border rounded text-destructive bg-destructive/5 border-destructive/20">
                    <AlertTriangle className="w-3 h-3" />
                    Failed to load watchlists
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-6 text-center text-[12px] text-muted-foreground/60">
                    No watchlists found
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filtered.map(w => {
                      const isSelected = selectedWatchlist?.id === w.id;
                      return (
                        <button
                          key={w.id}
                          onClick={() => handleWatchListSelect(w)}
                          className={`w-full rounded px-2.5 py-1.5 text-left transition-all duration-100 ${
                            isSelected
                              ? 'bg-primary/10 text-foreground border-l-2 border-primary'
                              : 'hover:bg-muted/40 border-l-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[12px] font-medium truncate block">
                                {w.name}
                              </span>
                              {w.description && (
                                <p className="line-clamp-1 text-[10px] text-muted-foreground/60">
                                  {w.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] shrink-0">
                              <span className="font-mono text-muted-foreground/50">
                                {w.asset_count}
                              </span>
                              {!w.is_active && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] h-4 px-1"
                                >
                                  Off
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
              <div className="flex items-center justify-center p-8 border rounded bg-card/50 border-border/40 min-h-[200px]">
                <p className="text-[12px] text-muted-foreground/50 font-mono">
                  Select a watchlist to view details
                </p>
              </div>
            )}
          </div>
        </div>

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
