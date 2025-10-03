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

import { Helmet } from 'react-helmet';
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
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Helmet>
        <title>{obj?.name} - Alpaca</title>
      </Helmet>
      <div
        className={`flex items-center justify-between ${isMobile ? 'h-14 px-2' : 'h-14 px-2'} mx-auto sm:px-6 lg:px-8`}
      >
        {/* Left Section - Navigation & Title */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="rounded-full"
                >
                  <HiArrowLeft className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Go back</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div>
            <h1
              className={`${
                isMobile ? 'text-base' : 'text-lg'
              } font-semibold text-foreground`}
            >
              {obj?.name || 'Chart'}
            </h1>
          </div>
        </div>

        {/* Right Section - Controls */}
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {!isMobile && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={autoRefresh ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={() => dispatch(setAutoRefresh(!autoRefresh))}
                      className="rounded-full"
                    >
                      {autoRefresh ? (
                        <HiPause className="w-5 h-5" />
                      ) : (
                        <HiPlay className="w-5 h-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {autoRefresh ? 'Pause Live' : 'Enable Live'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={refetch}
                      className="rounded-full"
                    >
                      <HiRefresh className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh Data</TooltipContent>
                </Tooltip>
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showControls ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => dispatch(setShowControls(!showControls))}
                  className="rounded-full"
                >
                  <HiCog className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Controls</TooltipContent>
            </Tooltip>
            {!isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="rounded-full"
                  >
                    {isFullscreen ? (
                      <HiX className="w-5 h-5" />
                    ) : (
                      <HiArrowsExpand className="w-5 h-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>

          {!isMobile && (
            <Separator orientation="vertical" className="h-6 mx-1" />
          )}

          {!isMobile && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <HiInformationCircle className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="space-y-1 text-xs">
                    <div className="font-medium ">Shortcuts</div>
                    <div className="text-muted-foreground">
                      <kbd className="px-1 py-0.5 rounded  mr-1">F</kbd>{' '}
                      Fullscreen
                    </div>
                    <div className="text-muted-foreground">
                      <kbd className="px-1 py-0.5 rounded  mr-1">V</kbd> Toggle
                      Volume
                    </div>
                    <div className="text-muted-foreground">
                      <kbd className="px-1 py-0.5 rounded  mr-1">C</kbd> Toggle
                      Controls
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <HiDotsVertical className="w-5 h-5" />
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
