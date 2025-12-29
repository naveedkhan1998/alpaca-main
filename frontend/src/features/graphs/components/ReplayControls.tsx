import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  HiPlay,
  HiPause,
  HiRefresh,
  HiChevronLeft,
  HiChevronRight,
  HiChevronDoubleLeft,
  HiChevronDoubleRight,
  HiX,
} from 'react-icons/hi';

interface ReplayControlsProps {
  enabled: boolean;
  playing: boolean;
  currentStep: number;
  totalSteps: number;
  onToggle: (next: boolean) => void;
  onPlayPause: () => void;
  onRestart: () => void;
  onSeek: (value: number) => void;
  speed: number;
  onSpeedChange: (value: number) => void;
  animate?: boolean;
  onAnimateToggle?: (value: boolean) => void;
  currentLabel?: string;
  isLoadingMore?: boolean;
  className?: string;
  hasMoreHistorical?: boolean;
  onLoadMoreHistorical?: () => void;
  variant?: 'mobile' | 'popover' | 'inline';
}

const SPEED_PRESETS = [0.1, 0.25, 0.5, 1, 2, 4, 8, 16] as const;

const formatSpeedLabel = (speed: number) => {
  if (speed < 1) {
    return `${speed}×`;
  }
  return speed % 1 === 0 ? `${speed.toFixed(0)}×` : `${speed.toFixed(1)}×`;
};

const ReplayControls: React.FC<ReplayControlsProps> = ({
  enabled,
  playing,
  currentStep,
  totalSteps,
  onToggle,
  onPlayPause,
  onRestart,
  onSeek,
  speed,
  onSpeedChange,
  animate = false,
  onAnimateToggle,
  currentLabel,
  isLoadingMore = false,
  className,
  variant = 'mobile',
}) => {
  const sliderValue = React.useMemo(
    () => (totalSteps > 0 ? Math.min(Math.max(currentStep, 1), totalSteps) : 0),
    [currentStep, totalSteps]
  );

  const disableReplayControls = totalSteps <= 1;

  // Inline variant - compact horizontal bar for desktop (shown below toolbar)
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border/50',
          className
        )}
      >
        {/* Replay indicator */}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
            Replay
          </span>
        </div>

        <div className="w-px h-4 bg-border/50" />

        {/* Play/Pause */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={playing ? 'default' : 'ghost'}
                onClick={onPlayPause}
                disabled={disableReplayControls}
                className="rounded-full h-7 w-7"
              >
                {playing ? (
                  <HiPause className="w-3.5 h-3.5" />
                ) : (
                  <HiPlay className="w-3.5 h-3.5 ml-0.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {playing ? 'Pause' : 'Play'} (Space)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Restart */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={onRestart}
                disabled={disableReplayControls}
                className="rounded-full h-7 w-7"
              >
                <HiRefresh className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Restart (R)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-px h-4 bg-border/50" />

        {/* Step Navigation */}
        <div className="flex items-center gap-0.5">
          {/* Back 10 steps */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSeek(Math.max(1, sliderValue - 10))}
                  disabled={disableReplayControls || sliderValue <= 1}
                  className="h-7 w-7"
                >
                  <HiChevronDoubleLeft className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Back 10 steps
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Back 1 step */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSeek(Math.max(1, sliderValue - 1))}
                  disabled={disableReplayControls || sliderValue <= 1}
                  className="h-7 w-7"
                >
                  <HiChevronLeft className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Back 1 step (←)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Forward 1 step */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSeek(Math.min(totalSteps, sliderValue + 1))}
                  disabled={disableReplayControls || sliderValue >= totalSteps}
                  className="h-7 w-7"
                >
                  <HiChevronRight className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Forward 1 step (→)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Forward 10 steps */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onSeek(Math.min(totalSteps, sliderValue + 10))}
                  disabled={disableReplayControls || sliderValue >= totalSteps}
                  className="h-7 w-7"
                >
                  <HiChevronDoubleRight className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Forward 10 steps
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="w-px h-4 bg-border/50" />

        {/* Progress Slider */}
        <div className="flex items-center gap-2 flex-1 min-w-[100px] max-w-[400px]">
          <span className="text-xs font-mono text-muted-foreground min-w-[2rem] text-right tabular-nums">
            {sliderValue}
          </span>
          <Slider
            min={1}
            max={Math.max(totalSteps, 1)}
            step={1}
            value={sliderValue > 0 ? [sliderValue] : [1]}
            onValueChange={values => onSeek(values[0])}
            disabled={disableReplayControls}
            className="flex-1"
          />
          <span className="text-xs font-mono text-muted-foreground min-w-[2rem] tabular-nums">
            {totalSteps}
          </span>
        </div>

        {/* Speed Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={disableReplayControls}
              className="h-7 px-2 text-xs font-mono min-w-[44px]"
            >
              {formatSpeedLabel(speed)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-[80px]">
            {SPEED_PRESETS.map(preset => (
              <DropdownMenuItem
                key={preset}
                onClick={() => onSpeedChange(preset)}
                className={cn(
                  'justify-center font-mono text-xs',
                  speed === preset && 'bg-accent'
                )}
              >
                {formatSpeedLabel(preset)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Animate Toggle */}
        {onAnimateToggle && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={animate}
                    onCheckedChange={onAnimateToggle}
                    disabled={disableReplayControls}
                    className="h-4 w-7 data-[state=checked]:bg-primary"
                  />
                  <span className="hidden text-xs text-muted-foreground lg:inline">
                    Animate
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Animate candle formation
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Loading indicator */}
        {isLoadingMore && (
          <div className="flex items-center gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}

        {/* Close */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onToggle(false)}
                className="rounded-full h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <HiX className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Exit Replay (Esc)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Mobile variant - compact fixed bar at bottom of chart (not a modal/drawer)
  if (variant === 'mobile') {
    return (
      <div
        className={cn(
          'flex flex-col gap-2 p-3 bg-background/95 backdrop-blur-sm border-t border-border',
          className
        )}
      >
        {/* Progress Row */}
        <div className="flex items-center gap-3">
          {/* Step counter */}
          <span className="font-mono text-xs text-muted-foreground tabular-nums min-w-[4rem]">
            {sliderValue}/{totalSteps}
          </span>

          {/* Slider */}
          <div className="flex-1">
            <Slider
              min={1}
              max={Math.max(totalSteps, 1)}
              step={1}
              value={sliderValue > 0 ? [sliderValue] : [1]}
              onValueChange={values => onSeek(values[0])}
              disabled={disableReplayControls}
              className="cursor-pointer"
            />
          </div>

          {/* Speed dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={disableReplayControls}
                className="h-8 px-2 text-xs font-mono min-w-[40px]"
              >
                {formatSpeedLabel(speed)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[70px]">
              {SPEED_PRESETS.map(preset => (
                <DropdownMenuItem
                  key={preset}
                  onClick={() => onSpeedChange(preset)}
                  className={cn(
                    'justify-center font-mono text-xs',
                    speed === preset && 'bg-accent'
                  )}
                >
                  {formatSpeedLabel(preset)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Animate Toggle */}
          {onAnimateToggle && (
            <div className="flex items-center gap-1">
              <Switch
                checked={animate}
                onCheckedChange={onAnimateToggle}
                disabled={disableReplayControls}
                className="h-5 w-9 data-[state=checked]:bg-primary"
              />
            </div>
          )}
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          {/* Left: Step controls */}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onSeek(Math.max(1, sliderValue - 10))}
              disabled={disableReplayControls || sliderValue <= 1}
              className="h-9 w-9"
            >
              <HiChevronDoubleLeft className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onSeek(Math.max(1, sliderValue - 1))}
              disabled={disableReplayControls || sliderValue <= 1}
              className="h-9 w-9"
            >
              <HiChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Center: Play/Pause & Restart */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={onRestart}
              disabled={disableReplayControls}
              className="h-9 w-9"
            >
              <HiRefresh className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={playing ? 'default' : 'secondary'}
              onClick={onPlayPause}
              disabled={disableReplayControls}
              className="rounded-full shadow h-11 w-11"
            >
              {playing ? (
                <HiPause className="w-5 h-5" />
              ) : (
                <HiPlay className="w-5 h-5 ml-0.5" />
              )}
            </Button>
            {isLoadingMore ? (
              <div className="flex items-center justify-center h-9 w-9">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onToggle(false)}
                className="h-9 w-9 text-muted-foreground"
              >
                <HiX className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Right: Step controls */}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onSeek(Math.min(totalSteps, sliderValue + 1))}
              disabled={disableReplayControls || sliderValue >= totalSteps}
              className="h-9 w-9"
            >
              <HiChevronRight className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onSeek(Math.min(totalSteps, sliderValue + 10))}
              disabled={disableReplayControls || sliderValue >= totalSteps}
              className="h-9 w-9"
            >
              <HiChevronDoubleRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Popover variant - for desktop header dropdown
  return (
    <div className={cn('p-3 space-y-3', className)}>
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            aria-label="Toggle candle replay"
          />
          <span className="text-sm font-medium">Replay Mode</span>
        </div>
        {enabled && (
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {sliderValue}/{totalSteps}
          </span>
        )}
      </div>

      {enabled && (
        <>
          {/* Progress Slider */}
          <div className="space-y-1.5">
            <Slider
              min={1}
              max={Math.max(totalSteps, 1)}
              step={1}
              value={sliderValue > 0 ? [sliderValue] : [1]}
              onValueChange={values => onSeek(values[0])}
              disabled={disableReplayControls}
              className="cursor-pointer"
            />
            {currentLabel && (
              <p className="text-xs text-center truncate text-muted-foreground">
                {currentLabel}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            {/* Playback Controls */}
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={onRestart}
                disabled={disableReplayControls}
                className="w-8 h-8"
              >
                <HiRefresh className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onSeek(Math.max(1, sliderValue - 1))}
                disabled={disableReplayControls || sliderValue <= 1}
                className="w-8 h-8"
              >
                <HiChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant={playing ? 'default' : 'secondary'}
                onClick={onPlayPause}
                disabled={disableReplayControls}
                className="h-9 w-9"
              >
                {playing ? (
                  <HiPause className="w-4 h-4" />
                ) : (
                  <HiPlay className="w-4 h-4 ml-0.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onSeek(Math.min(totalSteps, sliderValue + 1))}
                disabled={disableReplayControls || sliderValue >= totalSteps}
                className="w-8 h-8"
              >
                <HiChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Speed Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disableReplayControls}
                  className="h-8 px-2 font-mono text-xs"
                >
                  {formatSpeedLabel(speed)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[80px]">
                {SPEED_PRESETS.map(preset => (
                  <DropdownMenuItem
                    key={preset}
                    onClick={() => onSpeedChange(preset)}
                    className={cn(
                      'justify-center font-mono text-xs',
                      speed === preset && 'bg-accent'
                    )}
                  >
                    {formatSpeedLabel(preset)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Animate Toggle */}
          {onAnimateToggle && (
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Animate candle formation</span>
              <Switch
                checked={animate}
                onCheckedChange={onAnimateToggle}
                disabled={disableReplayControls}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          )}

          {/* Loading Indicator */}
          {isLoadingMore && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <span>Loading...</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReplayControls;
