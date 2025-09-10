import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HiAdjustments, HiBeaker, HiChartBar, HiTrendingUp } from 'react-icons/hi';

type Preset = 'classic' | 'clean' | 'baseline';

interface PresetsPanelProps {
  onPreset: (preset: Preset) => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({ onPreset }) => {
  return (
    <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1.5 border rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0">
            <HiAdjustments className="w-3 h-3" />
          </div>
          <span className="font-semibold text-card-foreground">Presets</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-3 gap-1.5">
          <Button size="sm" variant="outline" className="justify-center h-8 gap-1 px-2 text-xs" onClick={() => onPreset('classic')}>
            <HiChartBar className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Classic</span>
            <span className="sm:hidden">C</span>
          </Button>
          <Button size="sm" variant="outline" className="justify-center h-8 gap-1 px-2 text-xs" onClick={() => onPreset('clean')}>
            <HiTrendingUp className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Clean</span>
            <span className="sm:hidden">Cl</span>
          </Button>
          <Button size="sm" variant="outline" className="justify-center h-8 gap-1 px-2 text-xs" onClick={() => onPreset('baseline')}>
            <HiBeaker className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Base</span>
            <span className="sm:hidden">B</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

