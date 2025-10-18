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
  HiCog,
  HiColorSwatch,
  HiDotsVertical,
  HiDownload,
  HiPause,
  HiPlay,
  HiRefresh,
  HiTrendingUp,
  HiX,
  HiInformationCircle,
} from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  selectAutoRefresh,
  selectIsFullscreen,
  selectShowControls,
  selectShowVolume,
  setAutoRefresh,
  setShowControls,
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
}

const GraphHeader: React.FC<GraphHeaderProps> = ({
  obj,
  handleDownload,
  refetch,
  toggleFullscreen,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const autoRefresh = useAppSelector(selectAutoRefresh);
  const showVolume = useAppSelector(selectShowVolume);
  const showControls = useAppSelector(selectShowControls);
  const isFullscreen = useAppSelector(selectIsFullscreen);
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/90 shadow-sm">
      <Helmet>
        <title>{obj?.name} - Alpaca</title>
      </Helmet>
      <div
        className={`flex items-center justify-between ${isMobile ? 'h-16 px-3' : 'h-16 px-4'} mx-auto sm:px-6 lg:px-8`}
      >
        {/* Left Section - Navigation & Title */}
        <div className="flex items-center gap-3">
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
            {autoRefresh && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <div className="relative">
                  <div className="absolute w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                </div>
                {!isMobile && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Live
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section - Controls */}
        <div className="flex items-center gap-1">
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

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showControls ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => dispatch(setShowControls(!showControls))}
                  className={`rounded-lg transition-all ${
                    showControls
                      ? 'bg-primary/15 text-primary hover:bg-primary/20'
                      : 'hover:bg-muted/80'
                  }`}
                >
                  <HiCog className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {showControls ? 'Hide Controls' : 'Show Controls'}
              </TooltipContent>
            </Tooltip>

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

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg hover:bg-muted/80"
                    >
                      <HiInformationCircle className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-foreground">
                        Keyboard Shortcuts
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Fullscreen
                          </span>
                          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
                            F
                          </kbd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Toggle Volume
                          </span>
                          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
                            V
                          </kbd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            Toggle Controls
                          </span>
                          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
                            C
                          </kbd>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem onSelect={e => e.preventDefault()}>
                      <HiTrendingUp className="w-4 h-4 mr-2" />
                      <span>Add Indicator</span>
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Coming soon!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
