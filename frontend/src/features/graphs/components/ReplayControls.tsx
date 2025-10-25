import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  HiPlay,
  HiPause,
  HiRefresh,
  HiLightningBolt,
  HiChevronLeft,
  HiChevronRight,
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
  currentLabel?: string;
  isLoadingMore?: boolean;
  className?: string;
  hasMoreHistorical?: boolean;
  onLoadMoreHistorical?: () => void;
  variant?: 'overlay' | 'popover';
}

const SPEED_PRESETS = [0.5, 1, 2, 4, 8] as const;

const formatSpeedLabel = (speed: number) =>
  speed % 1 === 0 ? `${speed.toFixed(0)}x` : `${speed.toFixed(1)}x`;

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
  currentLabel,
  isLoadingMore = false,
  className,
  hasMoreHistorical = false,
  onLoadMoreHistorical,
  variant = 'overlay',
}) => {
  const sliderValue = React.useMemo(
    () => (totalSteps > 0 ? Math.min(Math.max(currentStep, 1), totalSteps) : 0),
    [currentStep, totalSteps]
  );

  const progressPercent = React.useMemo(() => {
    if (totalSteps <= 0) return 0;
    return Math.min(
      100,
      Math.max(0, Math.round((sliderValue / totalSteps) * 100))
    );
  }, [sliderValue, totalSteps]);

  const disableReplayControls = totalSteps <= 1;

  const containerClasses =
    variant === 'overlay'
      ? 'pointer-events-auto w-full max-w-[calc(100vw-2rem)] mx-auto rounded-2xl border border-border/60 bg-card backdrop-blur-xl px-4 py-3 shadow-2xl transition-all duration-300'
      : 'pointer-events-auto w-full rounded-xl border border-border/50 bg-card/95 px-3 py-3 shadow-xl backdrop-blur-sm transition-all duration-200';

  return (
    <div className={cn(containerClasses, className)}>
      {variant === 'overlay' ? (
        // Mobile Overlay - Compact Design
        <div className="space-y-3">
          {/* Compact Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-foreground">
                Candle Replay
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {sliderValue} / {totalSteps}
            </div>
          </div>

          {/* Progress Bar - Touch Friendly */}
          <div className="space-y-1">
            <div
              className="cursor-pointer"
              onClick={e => {
                if (totalSteps > 0) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const percentage = clickX / rect.width;
                  const newStep = Math.round(percentage * totalSteps);
                  onSeek(Math.max(1, Math.min(totalSteps, newStep)));
                }
              }}
            >
              <Progress value={progressPercent} className="h-4" />
            </div>
            {currentLabel && (
              <div className="text-xs text-center truncate text-muted-foreground">
                {currentLabel}
              </div>
            )}
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSeek(Math.max(1, sliderValue - 10))}
              disabled={disableReplayControls || sliderValue <= 1}
              className="w-8 h-8 rounded-full"
            >
              <HiChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              size="lg"
              variant={playing ? 'default' : 'secondary'}
              onClick={onPlayPause}
              disabled={disableReplayControls}
              className="w-10 h-10 rounded-full shadow-lg"
            >
              {playing ? (
                <HiPause className="w-5 h-5" />
              ) : (
                <HiPlay className="w-5 h-5 ml-0.5" />
              )}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSeek(Math.min(totalSteps, sliderValue + 10))}
              disabled={disableReplayControls || sliderValue >= totalSteps}
              className="w-8 h-8 rounded-full"
            >
              <HiChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Speed Controls - Compact */}
          <div className="flex items-center justify-center gap-1">
            {SPEED_PRESETS.slice(0, 4).map(preset => (
              <Button
                key={preset}
                size="sm"
                variant={speed === preset ? 'default' : 'ghost'}
                className={cn(
                  'h-7 px-2 text-xs font-medium rounded-full transition-all',
                  speed === preset
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => onSpeedChange(preset)}
                disabled={disableReplayControls}
              >
                {formatSpeedLabel(preset)}
              </Button>
            ))}
          </div>

          {/* Close Button */}
          <div className="flex justify-center pt-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onToggle(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <span className="text-xs">Close</span>
            </Button>
          </div>
        </div>
      ) : (
        // Desktop Tooltip - Clean Design
        <div className="space-y-3">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={enabled}
                onCheckedChange={onToggle}
                aria-label="Toggle candle replay"
                className="data-[state=checked]:bg-primary/90"
              />
              <span className="text-sm font-medium text-foreground">
                Candle Replay
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {sliderValue} / {totalSteps}
            </div>
          </div>

          {/* Progress Bar */}
          {enabled && (
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-2" />
              {currentLabel && (
                <div className="text-xs text-center truncate text-muted-foreground">
                  {currentLabel}
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          {enabled && (
            <div className="space-y-3">
              {/* Main Controls */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onRestart}
                  disabled={totalSteps === 0}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <HiRefresh className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant={playing ? 'default' : 'secondary'}
                  onClick={onPlayPause}
                  disabled={disableReplayControls}
                  className="px-4"
                >
                  {playing ? (
                    <>
                      <HiPause className="w-4 h-4 mr-1" />
                      Pause
                    </>
                  ) : (
                    <>
                      <HiPlay className="w-4 h-4 mr-1" />
                      Play
                    </>
                  )}
                </Button>

                {hasMoreHistorical && onLoadMoreHistorical && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onLoadMoreHistorical}
                    disabled={isLoadingMore}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <HiLightningBolt className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Seek Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSeek(Math.max(1, sliderValue - 1))}
                  disabled={disableReplayControls || sliderValue <= 1}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <HiChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex-1 min-w-0">
                  <Slider
                    min={1}
                    max={Math.max(totalSteps, 1)}
                    step={1}
                    value={sliderValue > 0 ? [sliderValue] : [1]}
                    onValueChange={values => onSeek(values[0])}
                    disabled={disableReplayControls}
                    aria-label="Replay progress"
                    className="cursor-pointer"
                  />
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSeek(Math.min(totalSteps, sliderValue + 1))}
                  disabled={disableReplayControls || sliderValue >= totalSteps}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <HiChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Speed Controls */}
              <div className="flex items-center justify-center gap-1">
                <span className="mr-2 text-xs text-muted-foreground">
                  Speed:
                </span>
                {SPEED_PRESETS.map(preset => (
                  <Button
                    key={preset}
                    size="sm"
                    variant={speed === preset ? 'default' : 'ghost'}
                    className={cn(
                      'h-7 px-2 text-xs font-medium',
                      speed === preset
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => onSpeedChange(preset)}
                    disabled={disableReplayControls}
                  >
                    {formatSpeedLabel(preset)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoadingMore && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-primary">
              <div className="flex gap-1">
                <div
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              <span className="text-xs">Loading...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReplayControls;
