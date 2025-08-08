const LoadingScreen = () => {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="flex items-center justify-center h-[100dvh] bg-gradient-to-br from-background via-background to-muted/20"
    >
      <div className="w-full max-w-md p-8 rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-xl">
        {/* Spinner */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 rounded-full border-chart-1/20 border-t-chart-1 animate-spin"></div>
            <div
              className="absolute inset-0 w-16 h-16 border-4 rounded-full border-chart-2/20 border-b-chart-2 animate-spin"
              style={{
                animationDirection: 'reverse',
                animationDuration: '1.5s',
              }}
            ></div>
            <span className="sr-only">Loading...</span>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="mt-6 text-center">
          <div className="text-xl font-bold text-transparent bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Loading chart data...
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Fetching the latest market data for analysis
          </div>
        </div>

        {/* Indeterminate bar */}
        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-muted/50">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3 animate-pulse"></div>
        </div>

        {/* Skeleton placeholders */}
        <div className="mt-6 space-y-3">
          <div className="h-24 w-full rounded-lg bg-muted/40 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-muted/40 animate-pulse" />
          <div className="h-20 w-full rounded-lg bg-muted/30 animate-pulse" />
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center mt-6 space-x-2">
          <div className="w-2 h-2 rounded-full bg-chart-1 animate-pulse"></div>
          <div
            className="w-2 h-2 rounded-full bg-chart-2 animate-pulse"
            style={{ animationDelay: '0.2s' }}
          ></div>
          <div
            className="w-2 h-2 rounded-full bg-chart-3 animate-pulse"
            style={{ animationDelay: '0.4s' }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
