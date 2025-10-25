import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  HiAdjustments,
  HiChartSquareBar,
  HiLightningBolt,
  HiPlay,
} from 'react-icons/hi';

interface SettingsPanelProps {
  showVolume: boolean;
  onShowVolumeChange: (value: boolean) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  replayEnabled: boolean;
  onReplayToggle: (value: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  showVolume,
  onShowVolumeChange,
  autoRefresh,
  onAutoRefreshChange,
  replayEnabled,
  onReplayToggle,
}) => {
  return (
    <Card className="overflow-hidden shadow-md border-border/40 bg-gradient-to-br from-card via-card to-muted/10 backdrop-blur-sm">
      <CardHeader className="px-4 py-3 border-b bg-gradient-to-r from-muted/40 via-muted/20 to-transparent border-border/30">
        <CardTitle className="flex items-center gap-2.5 text-sm">
          <div className="flex items-center justify-center w-8 h-8 border rounded-lg shadow-sm bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/20">
            <HiAdjustments className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-foreground">
            Chart Settings
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between p-3 transition-all border border-transparent rounded-lg bg-muted/30 hover:border-border/50">
          <Label
            htmlFor="show-volume"
            className="flex items-center flex-1 min-w-0 gap-2.5 text-xs font-semibold cursor-pointer text-foreground"
          >
            <HiChartSquareBar className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>Show Volume Chart</span>
          </Label>
          <Switch
            id="show-volume"
            checked={showVolume}
            onCheckedChange={onShowVolumeChange}
            className="shrink-0"
          />
        </div>
        <div className="flex items-center justify-between p-3 transition-all border border-transparent rounded-lg bg-muted/30 hover:border-border/50">
          <Label
            htmlFor="candle-replay"
            className="flex items-center flex-1 min-w-0 gap-2.5 text-xs font-semibold cursor-pointer text-foreground"
          >
            <HiPlay className="w-4 h-4 text-muted-foreground shrink-0" />
            <span>Candle Replay</span>
            <Badge
              variant="outline"
              className="ml-1 shrink-0 border-primary/30 text-primary text-[10px] px-2 py-0.5"
            >
              Beta
            </Badge>
          </Label>
          <Switch
            id="candle-replay"
            checked={replayEnabled}
            onCheckedChange={onReplayToggle}
            className="shrink-0"
          />
        </div>
        <div
          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
            autoRefresh
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-muted/30 border-transparent hover:border-border/50'
          }`}
        >
          <Label
            htmlFor="auto-refresh"
            className="flex items-center flex-1 min-w-0 gap-2.5 text-xs font-semibold cursor-pointer text-foreground"
          >
            <HiLightningBolt
              className={`w-4 h-4 shrink-0 ${
                autoRefresh
                  ? 'text-emerald-500 animate-pulse'
                  : 'text-muted-foreground'
              }`}
            />
            <span>Live Data Stream</span>
            {autoRefresh && (
              <Badge
                variant="secondary"
                className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-2 py-0.5 ml-1 font-bold shadow-sm"
              >
                LIVE
              </Badge>
            )}
          </Label>
          <Switch
            id="auto-refresh"
            checked={autoRefresh}
            onCheckedChange={onAutoRefreshChange}
            className="shrink-0"
          />
        </div>
        <div
          className={`transition-all duration-300 ${
            autoRefresh
              ? 'opacity-100 max-h-24'
              : 'opacity-0 max-h-0 overflow-hidden'
          }`}
        >
          <div className="flex items-center gap-2.5 p-3 text-xs border rounded-lg bg-gradient-to-r from-emerald-500/10 via-emerald-400/10 to-emerald-500/10 border-emerald-500/30 shadow-sm">
            <div className="relative shrink-0">
              <div className="absolute w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                Real-time updates enabled
              </div>
              <div className="text-emerald-600/80 dark:text-emerald-400/80 text-[10px] mt-1 leading-relaxed">
                Chart automatically refreshes with new market data
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
