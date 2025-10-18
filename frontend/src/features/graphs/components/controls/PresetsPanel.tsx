import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HiAdjustments,
  HiBeaker,
  HiChartBar,
  HiTrendingUp,
} from 'react-icons/hi';

type Preset = 'classic' | 'clean' | 'baseline';

interface PresetsPanelProps {
  onPreset: (preset: Preset) => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({ onPreset }) => {
  return (
    <Card className="overflow-hidden shadow-md border-border/40 bg-gradient-to-br from-card via-card to-muted/10 backdrop-blur-sm">
      <CardHeader className="px-4 py-3 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent border-b border-border/30">
        <CardTitle className="flex items-center gap-2.5 text-sm">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 shadow-sm">
            <HiAdjustments className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-bold text-foreground tracking-tight">
            Quick Presets
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-col justify-center h-auto gap-2 px-2 py-3 text-xs transition-all hover:bg-primary/10 hover:border-primary/30 hover:shadow-sm group"
            onClick={() => onPreset('classic')}
          >
            <HiChartBar className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-medium">Classic</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-col justify-center h-auto gap-2 px-2 py-3 text-xs transition-all hover:bg-primary/10 hover:border-primary/30 hover:shadow-sm group"
            onClick={() => onPreset('clean')}
          >
            <HiTrendingUp className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-medium">Clean</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-col justify-center h-auto gap-2 px-2 py-3 text-xs transition-all hover:bg-primary/10 hover:border-primary/30 hover:shadow-sm group"
            onClick={() => onPreset('baseline')}
          >
            <HiBeaker className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="font-medium">Baseline</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
