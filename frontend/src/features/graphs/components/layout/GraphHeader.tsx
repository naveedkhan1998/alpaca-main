import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Helmet } from '@dr.pogodin/react-helmet';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  MoreVertical,
  Download,
  Play,
  Pause,
  RotateCw,
  TrendingUp,
  TrendingDown,
  BarChart2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { getIsGuest } from 'src/features/auth/authSlice';
import {
  selectAutoRefresh,
  selectIsFullscreen,
  selectShowVolume,
  setAutoRefresh,
  setShowVolume,
} from '../../graphSlice';
import { Asset } from '@/types/common-types';
import { ModeToggle } from '@/components/ModeToggle';
import { useIsMobile } from '@/hooks/useMobile';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { cn } from '@/lib/utils';

interface GraphHeaderProps {
  obj: Asset;
  lastPrice?: number;
  previousClose?: number;
  handleDownload: () => void;
  refetch: () => void;
  toggleFullscreen: () => void;
  replayControls: {
    enabled: boolean;
    playing: boolean;
    currentStep: number;
    totalSteps: number;
    onToggle: (value: boolean) => void;
    onPlayPause: () => void;
    onRestart: () => void;
    onSeek: (value: number) => void;
    speed: number;
    onSpeedChange: (value: number) => void;
    currentLabel?: string;
    isLoadingMore?: boolean;
    hasMoreHistorical?: boolean;
    onLoadMoreHistorical?: () => void;
  };
}

const GraphHeader: React.FC<GraphHeaderProps> = ({
  obj,
  lastPrice,
  previousClose,
  handleDownload,
  refetch,
  toggleFullscreen,
  replayControls,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const autoRefresh = useAppSelector(selectAutoRefresh);
  const showVolume = useAppSelector(selectShowVolume);
  const isFullscreen = useAppSelector(selectIsFullscreen);
  const isMobile = useIsMobile();
  const isGuest = useAppSelector(getIsGuest);
  const requireAuth = useRequireAuth();
  const {
    enabled: replayEnabled,
    playing: replayPlaying,
    onToggle: toggleReplay,
    onPlayPause: playPauseReplay,
  } = replayControls;

  // Calculate price change
  const priceChange =
    lastPrice !== undefined && previousClose !== undefined
      ? lastPrice - previousClose
      : 0;
  const priceChangePercent =
    previousClose && previousClose !== 0
      ? (priceChange / previousClose) * 100
      : 0;
  const isPositive = priceChange >= 0;

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Helmet>
        <title>
          {obj?.symbol} {lastPrice ? `$${lastPrice.toFixed(2)}` : ''} - Alpaca
        </title>
      </Helmet>
      <div className="flex items-center h-14 px-4 gap-4">
        {/* Left Section - Navigation & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-8 h-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-4 min-w-0">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <h1 className="text-lg font-bold tracking-tight font-mono leading-none">
                  {obj?.symbol || 'Chart'}
                </h1>
                <span className="text-xs font-medium text-muted-foreground truncate hidden sm:inline-block max-w-[150px]">
                  {obj?.exchange}
                </span>
              </div>
              {!isMobile && obj?.name && (
                <p className="text-[10px] text-muted-foreground truncate max-w-[200px] leading-tight">
                  {obj.name}
                </p>
              )}
            </div>

            {/* Price Display */}
            {lastPrice !== undefined && (
              <div className="hidden sm:flex flex-col items-end border-l pl-4 border-border/50">
                <span
                  className={cn(
                    'text-lg font-bold font-mono leading-none tracking-tight',
                    isPositive ? 'text-success' : 'text-destructive'
                  )}
                >
                  ${lastPrice.toFixed(2)}
                </span>
                <div
                  className={cn(
                    'flex items-center gap-1 text-[10px] font-medium leading-tight',
                    isPositive ? 'text-success' : 'text-destructive'
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {priceChange > 0 ? '+' : ''}
                    {priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Section - Replay Quick Toggle */}
        <div className="flex items-center justify-center flex-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={replayEnabled ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 gap-2 transition-all',
                    replayEnabled &&
                      'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                  onClick={() => toggleReplay(!replayEnabled)}
                >
                  <Play
                    className={cn(
                      'w-3.5 h-3.5',
                      replayEnabled && 'fill-current'
                    )}
                  />
                  {!isMobile && (
                    <span className="text-xs font-medium">
                      {replayEnabled ? 'Replay Mode' : 'Replay'}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {replayEnabled ? 'Exit replay mode' : 'Start candle replay'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Quick play/pause when replay is active */}
          {replayEnabled && (
            <div className="flex items-center gap-1 ml-1 animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 hover:text-primary"
                onClick={playPauseReplay}
              >
                {replayPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Right Section - Other Controls */}
        <div className="flex items-center justify-end gap-1 shrink-0">
          <TooltipProvider>
            {!isMobile && (
              <div className="flex items-center gap-1 mr-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={autoRefresh ? 'default' : 'ghost'}
                      size="icon"
                      onClick={() => {
                        if (!requireAuth('enable live updates')) return;
                        dispatch(setAutoRefresh(!autoRefresh));
                      }}
                      className={cn(
                        'w-8 h-8 transition-colors',
                        autoRefresh
                          ? 'bg-success text-success-foreground hover:bg-success/90'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {autoRefresh ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {isGuest
                      ? 'Log in to enable live updates'
                      : autoRefresh
                        ? 'Pause Live Data'
                        : 'Enable Live Data'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={refetch}
                      className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Refresh</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFullscreen}
                      className="w-8 h-8 text-muted-foreground hover:text-foreground"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </TooltipProvider>

          <div className="h-4 w-px bg-border/50 hidden sm:block mx-1" />

          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => dispatch(setShowVolume(!showVolume))}
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                {showVolume ? 'Hide' : 'Show'} Volume
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default GraphHeader;
