import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { HiOutlineChartPie, HiOutlineScale, HiOutlineTrendingUp, HiOutlineCurrencyDollar } from 'react-icons/hi';
import { Button } from '@/components/ui/button';

const INDICATORS = [
  { name: 'RSI', label: 'Relative Strength Index', icon: <HiOutlineChartPie className="w-4 h-4" /> },
  { name: 'BollingerBands', label: 'Bollinger Bands', icon: <HiOutlineScale className="w-4 h-4" /> },
  { name: 'EMA', label: 'Exponential Moving Average', icon: <HiOutlineTrendingUp className="w-4 h-4" /> },
  { name: 'ATR', label: 'Average True Range', icon: <HiOutlineCurrencyDollar className="w-4 h-4" /> },
] as const;

interface IndicatorsPanelProps {
  activeIndicators: string[];
  onToggle: (name: string, enabled: boolean) => void;
  onClearAll: () => void;
}

export const IndicatorsPanel: React.FC<IndicatorsPanelProps> = ({ activeIndicators, onToggle, onClearAll }) => {
  return (
    <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-card-foreground">Indicators</span>
          {activeIndicators.length > 0 && (
            <Badge className="ml-auto" variant="secondary">{activeIndicators.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {INDICATORS.map(indicator => (
          <div key={indicator.name} className="flex items-center justify-between p-2 rounded-lg bg-background/50 min-h-[36px]">
            <Label htmlFor={`indicator-${indicator.name}`} className="flex items-center flex-1 min-w-0 gap-2 text-xs font-medium cursor-pointer text-card-foreground">
              <span className="shrink-0">{indicator.icon}</span>
              <span className="truncate">{indicator.label}</span>
            </Label>
            <Switch id={`indicator-${indicator.name}`} checked={activeIndicators.includes(indicator.name)} onCheckedChange={checked => onToggle(indicator.name, checked)} className="shrink-0" />
          </div>
        ))}
        {activeIndicators.length > 0 && (
          <div className="pt-1">
            <Button size="sm" variant="ghost" onClick={onClearAll} className="text-xs h-7">Clear all</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

