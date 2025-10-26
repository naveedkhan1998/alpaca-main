import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
  PageActions,
} from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AssetDetails } from './components/AssetDetails';

export const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/instruments');
  };

  if (!id) {
    return (
      <PageLayout
        header={<PageHeader>Asset Not Found</PageHeader>}
        subheader={<PageSubHeader>Invalid asset ID provided.</PageSubHeader>}
      >
        <PageContent>
          <div className="text-center py-8">
            <Button onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assets
            </Button>
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      header={<PageHeader>Asset Details</PageHeader>}
      subheader={
        <PageSubHeader>
          View detailed information about this trading instrument.
        </PageSubHeader>
      }
      actions={
        <PageActions>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Assets
          </Button>
        </PageActions>
      }
    >
      <PageContent>
        <AssetDetails assetId={parseInt(id)} />
      </PageContent>
    </PageLayout>
  );
};

export default AssetDetailPage;
