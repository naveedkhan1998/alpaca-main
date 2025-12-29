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

import { Helmet } from 'react-helmet-async';
import {
  HiArrowLeft,
  HiArrowsExpand,
  HiChartBar,
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
    onToggle: toggleReplay,
    onPlayPause: playPauseReplay,
  } = replayControls;

  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <Helmet>
        <title>{obj?.name} - Alpaca</title>
      </Helmet>
      <div className={`flex items-center h-14 px-4`}>
        {/* Left Section - Navigation & Title */}
        <div className="flex items-center flex-1 gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-8 h-8"
          >
            <HiArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <h1 className="text-sm font-semibold font-mono">
              {obj?.symbol || 'Chart'}
            </h1>
            {!isMobile && obj?.name && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {obj.name}
              </p>
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
                  className="h-8 gap-2"
                  onClick={() => toggleReplay(!replayEnabled)}
                >
                  <HiPlay className={`w-4 h-4 ${replayEnabled ? 'text-primary' : ''}`} />
                  {!isMobile && (
                    <span className="text-xs">
                      {replayEnabled ? 'Replay On' : 'Replay'}
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
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 ml-1"
              onClick={playPauseReplay}
            >
              {replayPlaying ? (
                <HiPause className="w-4 h-4 text-primary" />
              ) : (
                <HiPlay className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {/* Right Section - Other Controls */}
        <div className="flex items-center justify-end flex-1 gap-1">
          <TooltipProvider>
            {!isMobile && (
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={autoRefresh ? 'default' : 'ghost'}
                      size="icon"
                      onClick={() => dispatch(setAutoRefresh(!autoRefresh))}
                      className="w-8 h-8"
                    >
                      {autoRefresh ? (
                        <HiPause className="w-4 h-4" />
                      ) : (
                        <HiPlay className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {autoRefresh ? 'Pause Live' : 'Enable Live'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={refetch}
                      className="w-8 h-8"
                    >
                      <HiRefresh className="w-4 h-4" />
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
                      className="w-8 h-8"
                    >
                      {isFullscreen ? (
                        <HiX className="w-4 h-4" />
                      ) : (
                        <HiArrowsExpand className="w-4 h-4" />
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

          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <HiDotsVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => dispatch(setShowVolume(!showVolume))}
              >
                <HiChartBar className="w-4 h-4 mr-2" />
                {showVolume ? 'Hide' : 'Show'} Volume
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}>
                <HiDownload className="w-4 h-4 mr-2" />
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
