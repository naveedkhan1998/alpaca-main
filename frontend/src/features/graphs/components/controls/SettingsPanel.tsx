import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { HiAdjustments, HiChartSquareBar, HiLightningBolt } from 'react-icons/hi';

interface SettingsPanelProps {
  showVolume: boolean;
  onShowVolumeChange: (value: boolean) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ showVolume, onShowVolumeChange, autoRefresh, onAutoRefreshChange }) => {
  return (
    <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1.5 border rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0">
            <HiAdjustments className="w-3 h-3" />
          </div>
          <span className="font-semibold text-card-foreground">Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-background/50 min-h-[36px]">
          <Label htmlFor="show-volume" className="flex items-center flex-1 min-w-0 gap-2 text-xs font-medium cursor-pointer text-card-foreground">
            <HiChartSquareBar className="w-3 h-3 text-muted-foreground shrink-0" />
            <span>Show Volume</span>
          </Label>
          <Switch id="show-volume" checked={showVolume} onCheckedChange={onShowVolumeChange} className="shrink-0" />
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-background/50 min-h-[36px]">
          <Label htmlFor="auto-refresh" className="flex items-center flex-1 min-w-0 gap-2 text-xs font-medium cursor-pointer text-card-foreground">
            <HiLightningBolt className={`w-3 h-3 shrink-0 ${autoRefresh ? 'text-green-400 animate-pulse' : 'text-muted-foreground'}`} />
            <span>Live Data</span>
            {autoRefresh && <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0.5 ml-1">ON</Badge>}
          </Label>
          <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={onAutoRefreshChange} className="shrink-0" />
        </div>
        <div className={`transition-all duration-300 ${autoRefresh ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          <div className="flex items-center gap-2 p-2 text-xs border rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
            <div className="relative shrink-0">
              <div className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-green-400">Real-time updates active</div>
              <div className="text-green-400/80 text-[10px] mt-0.5">Chart refreshes automatically with new market data</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

