import React, { useCallback } from 'react';

import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
  PageActions,
} from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { WatchListsList } from './components/WatchListsList';
import { WatchListDetail } from './components/WatchListDetail';
import { setSelectedWatchlist } from './watchlistSlice';

import { WatchList } from '@/types/common-types';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';

export const WatchlistsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const selectedWatchlist = useAppSelector(
    state => state.watchlist.selectedWatchlist
  );

  const handleWatchListSelect = useCallback(
    (watchlist: WatchList) => {
      dispatch(setSelectedWatchlist(watchlist));
    },
    [dispatch]
  );

  const handleBack = useCallback(() => {
    dispatch(setSelectedWatchlist(null));
  }, [dispatch]);

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
