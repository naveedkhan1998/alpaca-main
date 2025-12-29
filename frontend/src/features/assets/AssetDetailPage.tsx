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

  return (
    <PageLayout
      header={<PageHeader>Instrument Details</PageHeader>}
      subheader={<PageSubHeader>View instrument information</PageSubHeader>}
      actions={
        <PageActions>
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
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
