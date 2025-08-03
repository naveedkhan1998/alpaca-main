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
import { AssetTable } from './components/AssetTable';
import { AssetDetails } from './components/AssetDetails';
import { setSelectedAsset } from './assetSlice';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';

const AssetsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const selectedAsset = useAppSelector(state => state.asset.selectedAsset);

  const handleBack = useCallback(() => {
    dispatch(setSelectedAsset(null));
  }, [dispatch]);

  return (
    <PageLayout
      header={
        <PageHeader>
          <div className="flex items-center gap-3">Assets</div>
        </PageHeader>
      }
      subheader={
        <PageSubHeader>
          Browse and search through available trading assets with advanced
          filtering and sorting capabilities.
        </PageSubHeader>
      }
      actions={
        <PageActions>
          {selectedAsset && (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
        </PageActions>
      }
    >
      <PageContent>
        <div className="space-y-8">
          {selectedAsset ? (
            <AssetDetails assetId={selectedAsset.id} />
          ) : (
            <AssetTable />
          )}
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default AssetsPage;
