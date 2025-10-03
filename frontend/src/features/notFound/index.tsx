import { PageLayout, PageHeader, PageContent } from '@/components/PageLayout';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <PageLayout
      header={
        <PageHeader>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text">
            404 - Page Not Found
          </span>
        </PageHeader>
      }
    >
      <PageContent>
        <div className="flex flex-col items-center justify-center flex-1 min-h-[60dvh] space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Oops! Something&apos;s missing.
            </h2>
            <p className="text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </p>
          </div>
          <Button onClick={() => navigate(-1)} variant="default">
            Go Back
          </Button>
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default NotFoundPage;
