import { Loader2 } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex flex-col items-center justify-center h-[100dvh] bg-background"
    >
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      <p className="mt-4 text-sm text-muted-foreground">
        Loading chart data...
      </p>
    </div>
  );
};

export default LoadingScreen;
