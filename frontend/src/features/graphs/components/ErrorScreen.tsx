import { Button } from '@/components/ui/button';
import { HiRefresh, HiX, HiArrowLeft } from 'react-icons/hi';

const ErrorScreen = () => {
  return (
    <div className="flex items-center justify-center h-[100dvh] bg-gradient-to-br from-background via-background to-destructive/10 px-4">
      <div
        role="alert"
        aria-live="assertive"
        className="w-full max-w-md p-6 border shadow-xl rounded-2xl border-destructive/20 bg-card/75 supports-[backdrop-filter]:bg-card/60 backdrop-blur"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center w-20 h-20 border rounded-full bg-gradient-to-br from-destructive/10 to-destructive/20 border-destructive/20">
            <HiX className="w-10 h-10 text-destructive" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold text-destructive">
              Connection Error
            </h1>
            <p className="text-sm text-muted-foreground">
              Unable to fetch chart data. Please check your connection and try
              again.
            </p>
          </div>

          <div className="w-full pt-2">
            <div className="flex flex-col w-full gap-2 sm:flex-row">
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70"
              >
                <HiRefresh className="w-4 h-4 mr-2" aria-hidden="true" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex-1"
              >
                <HiArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
                Go Back
              </Button>
            </div>
          </div>

          <div className="w-full p-3 mt-4 text-xs border rounded-lg border-destructive/20 bg-destructive/5 text-muted-foreground">
            • Verify your internet connection
            <br />• If on VPN or corporate network, ensure access to the API is
            allowed
            <br />• Wait a moment and retry in case of temporary outages
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;
