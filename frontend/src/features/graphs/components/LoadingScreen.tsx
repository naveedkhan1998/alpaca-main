const LoadingScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 rounded-full border-chart-1/20 border-t-chart-1 animate-spin"></div>
          <div
            className="absolute inset-0 w-16 h-16 border-4 rounded-full border-chart-2/20 border-b-chart-2 animate-spin"
            style={{
              animationDirection: 'reverse',
              animationDuration: '1.5s',
            }}
          ></div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-transparent bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Loading chart data...
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Fetching the latest market data for analysis
          </div>
          <div className="flex items-center justify-center mt-4 space-x-2">
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
    </div>
  );
};

export default LoadingScreen;
