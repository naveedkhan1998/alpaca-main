import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
  PageActions,
} from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Heart, AlertTriangle } from 'lucide-react';
import { AssetDetails } from './components/AssetDetails';
import { useGetAssetByIdQuery } from '@/api/assetService';
import { AddToWatchlistDialog } from './components/AddToWatchlistDialog';

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showWatchlistDialog, setShowWatchlistDialog] = useState(false);

  // Parse ID safely
  const assetId = id ? parseInt(id) : undefined;

  const {
    data: asset,
    isLoading,
    error,
  } = useGetAssetByIdQuery(assetId ?? 0, {
    skip: !assetId,
  });

  const handleBack = () => {
    navigate('/instruments');
  };

  const getAssetClassColor = (assetClass: string) => {
    switch (assetClass) {
      case 'us_equity':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'us_option':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'crypto':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  // --- Render Logic ---

  if (!assetId) {
    return (
      <PageLayout
        title="Not Found"
        header={<PageHeader>Not Found</PageHeader>}
        subheader={<PageSubHeader>Invalid instrument ID</PageSubHeader>}
      >
        <PageContent>
          <div className="py-8 text-center">
            <Button variant="outline" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  let title = 'Instrument';
  let headerContent: React.ReactNode = (
    <div className="space-y-2">
      <Skeleton className="w-32 h-8" />
      <Skeleton className="w-48 h-5" />
    </div>
  );
  let subheaderContent: React.ReactNode = null;
  let actionsContent: React.ReactNode = (
    <PageActions>
      <Button variant="outline" size="sm" disabled>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
    </PageActions>
  );
  let mainContent: React.ReactNode = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );

  if (error || (!isLoading && !asset)) {
    title = 'Error';
    headerContent = <PageHeader>Error</PageHeader>;
    subheaderContent = (
      <PageSubHeader>Failed to load instrument details</PageSubHeader>
    );
    actionsContent = (
      <PageActions>
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </PageActions>
    );
    mainContent = (
      <div className="flex items-center gap-2 p-6 text-sm border rounded-lg border-destructive/20 text-destructive bg-destructive/5">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-medium">
          Could not retrieve asset information. Please try again later.
        </span>
      </div>
    );
  } else if (asset) {
    title = asset.symbol;
    headerContent = (
      <PageHeader>
        <div className="flex items-center gap-3">
          <span className="font-mono text-3xl font-bold tracking-tight">
            {asset.symbol}
          </span>
          <Badge
            variant="outline"
            className={`text-sm px-2.5 py-0.5 ${getAssetClassColor(asset.asset_class)}`}
          >
            {asset.asset_class.replace('_', ' ').toUpperCase()}
          </Badge>
          <Badge
            variant={asset.status === 'active' ? 'default' : 'secondary'}
            className="capitalize"
          >
            {asset.status}
          </Badge>
        </div>
      </PageHeader>
    );
    subheaderContent = (
      <PageSubHeader className="text-base">{asset.name}</PageSubHeader>
    );
    actionsContent = (
      <PageActions>
        <Button variant="outline" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          size="sm"
          onClick={() => setShowWatchlistDialog(true)}
          className="gap-2"
        >
          <Heart className="w-4 h-4" />
          Add to Watchlist
        </Button>
      </PageActions>
    );
    mainContent = (
      <>
        <AssetDetails asset={asset} />
        <AddToWatchlistDialog
          asset={asset}
          open={showWatchlistDialog}
          onOpenChange={setShowWatchlistDialog}
        />
      </>
    );
  }

  return (
    <PageLayout
      title={title}
      header={headerContent}
      subheader={subheaderContent}
      actions={actionsContent}
    >
      <PageContent>{mainContent}</PageContent>
    </PageLayout>
  );
};

export default AssetDetailPage;
