import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

const ErrorScreen = () => {
  return (
    <div className="flex items-center justify-center h-[100dvh] bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-destructive/10">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>

        <h1 className="mt-4 text-lg font-semibold">Connection Error</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Unable to load chart data. Check your connection and try again.
        </p>

        <div className="flex flex-col gap-2 mt-6">
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;
