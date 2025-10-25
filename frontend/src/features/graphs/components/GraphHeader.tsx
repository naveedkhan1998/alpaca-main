import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { Helmet } from 'react-helmet-async';
import {
  HiArrowLeft,
  HiArrowsExpand,
  HiChartBar,
  HiColorSwatch,
  HiDotsVertical,
  HiDownload,
  HiPause,
  HiPlay,
  HiRefresh,
  HiX,
} from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  selectAutoRefresh,
  selectIsFullscreen,
  selectShowVolume,
  setAutoRefresh,
  setShowVolume,
} from '../graphSlice';
import { Asset } from '@/types/common-types';
import { ModeToggle } from '@/components/ModeToggle';
import { useIsMobile } from '@/hooks/useMobile';
import ReplayControls from './ReplayControls';
import { useMemo } from 'react';

interface GraphHeaderProps {
  obj: Asset;
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
  const {
    enabled: replayEnabled,
    playing: replayPlaying,
    currentStep: replayCurrentStep,
    totalSteps: replayTotalSteps,
    onToggle: toggleReplay,
    onPlayPause: playPauseReplay,
    onRestart: restartReplay,
    onSeek: seekReplay,
    speed: replaySpeed,
    onSpeedChange: changeReplaySpeed,
    currentLabel: replayCurrentLabel,
    isLoadingMore: replayIsLoadingMore,
    hasMoreHistorical: replayHasMoreHistorical,
    onLoadMoreHistorical: replayLoadMoreHistorical,
  } = replayControls;

  const replayTriggerButton = useMemo(() => {
    const commonClasses = `relative h-9 w-9 rounded-full border transition-all ${
      replayEnabled
        ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
        : 'border-border/40 bg-card/95 text-muted-foreground hover:text-foreground'
    }`;

    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label={
          replayEnabled ? 'Disable candle replay' : 'Enable candle replay'
        }
        className={commonClasses}
        onClick={() => toggleReplay(!replayEnabled)}
      >
        <HiPlay
          className={`w-4 h-4 ${
            replayPlaying ? 'text-primary animate-pulse' : ''
          }`}
        />
        {replayPlaying ? (
          <span className="absolute top-1 right-1 inline-flex h-2.5 w-2.5 rounded-full bg-primary/80 animate-ping" />
        ) : replayEnabled ? (
          <span className="absolute top-1 right-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary/70" />
        ) : null}
      </Button>
    );
  }, [replayEnabled, replayPlaying, toggleReplay]);

  const replayControlsContent = (
    <ReplayControls
      variant="popover"
      enabled={replayEnabled}
      playing={replayPlaying}
      currentStep={replayCurrentStep}
      totalSteps={replayTotalSteps}
      onToggle={toggleReplay}
      onPlayPause={playPauseReplay}
      onRestart={restartReplay}
      onSeek={seekReplay}
      speed={replaySpeed}
      onSpeedChange={changeReplaySpeed}
      currentLabel={replayCurrentLabel}
      isLoadingMore={replayIsLoadingMore}
      hasMoreHistorical={replayHasMoreHistorical}
      onLoadMoreHistorical={replayLoadMoreHistorical}
    />
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/90 shadow-sm">
      <Helmet>
        <title>{obj?.name} - Alpaca</title>
      </Helmet>
      <div
        className={`flex items-center ${isMobile ? 'h-16 px-3' : 'h-16 px-4'} mx-auto sm:px-6 lg:px-8`}
      >
        {/* Left Section - Navigation & Title */}
        <div className="flex items-center flex-1 gap-3">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="transition-colors rounded-lg hover:bg-muted/80"
                >
                  <HiArrowLeft className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Go back
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2">
            <div>
              <h1
                className={`${
                  isMobile ? 'text-base' : 'text-lg'
                } font-bold text-foreground tracking-tight`}
              >
                {obj?.symbol || 'Chart'}
              </h1>
              {!isMobile && obj?.name && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {obj.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center Section - Replay Controls */}
        <div className="flex items-center justify-center flex-1">
          {isMobile ? (
            // Mobile: Just toggle replay, overlay shows at bottom
            replayTriggerButton
          ) : (
            // Desktop: Show replay controls with hover card
            <HoverCard>
              <HoverCardTrigger asChild>
                {replayEnabled ? (
                  <div className="flex items-center gap-2 px-3 py-2 transition-colors border rounded-lg cursor-pointer bg-primary/10 border-primary/20 hover:bg-primary/15">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">
                      {replayCurrentStep}/{replayTotalSteps}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        playPauseReplay();
                      }}
                      className="w-6 h-6 p-0 hover:bg-primary/20 text-primary"
                    >
                      {replayPlaying ? (
                        <HiPause className="w-3 h-3" />
                      ) : (
                        <HiPlay className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        toggleReplay(false);
                      }}
                      className="w-6 h-6 p-0 ml-1 hover:bg-primary/20 text-primary"
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  replayTriggerButton
                )}
              </HoverCardTrigger>
              <HoverCardContent
                side="bottom"
                align="center"
                className="p-0 border rounded-xl shadow-2xl backdrop-blur w-[min(420px,calc(100vw-2rem))]"
              >
                {replayControlsContent}
              </HoverCardContent>
            </HoverCard>
          )}
        </div>

        {/* Right Section - Other Controls */}
        <div className="flex items-center justify-end flex-1 gap-1">
          <TooltipProvider>
            {!isMobile && (
              <div className="flex items-center gap-1 mr-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={autoRefresh ? 'default' : 'ghost'}
                      size="icon"
                      onClick={() => dispatch(setAutoRefresh(!autoRefresh))}
                      className={`rounded-lg transition-all ${
                        autoRefresh
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md'
                          : 'hover:bg-muted/80'
                      }`}
                    >
                      {autoRefresh ? (
                        <HiPause className="w-4 h-4" />
                      ) : (
                        <HiPlay className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {autoRefresh ? 'Pause Live Data' : 'Enable Live Data'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={refetch}
                      className="transition-colors rounded-lg hover:bg-muted/80"
                    >
                      <HiRefresh className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    Refresh Data
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            <Separator orientation="vertical" className="h-6 mx-1" />

            {!isMobile && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleFullscreen}
                      className="transition-colors rounded-lg hover:bg-muted/80"
                    >
                      {isFullscreen ? (
                        <HiX className="w-4 h-4" />
                      ) : (
                        <HiArrowsExpand className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  </TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1" />
              </>
            )}
          </TooltipProvider>

          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="transition-colors rounded-lg hover:bg-muted/80"
              >
                <HiDotsVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => dispatch(setShowVolume(!showVolume))}
              >
                <HiChartBar className="w-4 h-4 mr-2" />
                <span>{showVolume ? 'Hide' : 'Show'} Volume</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <HiDownload className="w-4 h-4 mr-2" />
                <span>Export as CSV</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <HiColorSwatch className="w-4 h-4 mr-2" />
                <span>Customize Theme</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default GraphHeader;
