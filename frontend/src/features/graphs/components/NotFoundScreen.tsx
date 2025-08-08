import { Button } from '@/components/ui/button';
import { HiArrowLeft, HiChartBar, HiRefresh } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

const NotFoundScreen = () => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center h-[100dvh] bg-gradient-to-br from-background via-background to-muted/20">
      <div
        role="region"
        aria-labelledby="nf-title"
        className="w-full max-w-md p-8 text-center rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-xl"
      >
        <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-chart-1/10 to-chart-1/20">
          <HiChartBar className="w-10 h-10 text-chart-1" />
        </div>
        <h1
          id="nf-title"
          className="text-xl font-bold text-transparent bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
        >
          No Data Available
        </h1>
        <div className="mt-2 text-sm text-muted-foreground">
          Please select an instrument to view detailed charts
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-1">
            <span className="opacity-90">
              • Pick a symbol from your watchlist
            </span>
            <span className="opacity-90">• Try a different timeframe</span>
            <span className="opacity-90">• Refresh the page</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mt-6">
          <Button onClick={() => navigate(-1)} className="action-button">
            <HiArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button variant="ghost" onClick={() => window.location.reload()}>
            <HiRefresh className="w-4 h-4 mr-2" />
            Reload
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundScreen;
