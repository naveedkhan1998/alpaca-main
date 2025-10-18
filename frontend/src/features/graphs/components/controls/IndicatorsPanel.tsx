import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  HiOutlineChartPie,
  HiOutlineScale,
  HiOutlineTrendingUp,
  HiOutlineCurrencyDollar,
  HiOutlineCog,
} from 'react-icons/hi';
import { Button } from '@/components/ui/button';
import IndicatorSettingsDialog from '../IndicatorSettingsDialog';

const INDICATORS = [
  {
    name: 'RSI',
    label: 'Relative Strength Index',
    icon: <HiOutlineChartPie className="w-4 h-4" />,
  },
  {
    name: 'BollingerBands',
    label: 'Bollinger Bands',
    icon: <HiOutlineScale className="w-4 h-4" />,
  },
  {
    name: 'EMA',
    label: 'Exponential Moving Average',
    icon: <HiOutlineTrendingUp className="w-4 h-4" />,
  },
  {
    name: 'ATR',
    label: 'Average True Range',
    icon: <HiOutlineCurrencyDollar className="w-4 h-4" />,
  },
] as const;

interface IndicatorsPanelProps {
  activeIndicators: string[];
  onToggle: (name: string, enabled: boolean) => void;
  onClearAll: () => void;
}

export const IndicatorsPanel: React.FC<IndicatorsPanelProps> = ({
  activeIndicators,
  onToggle,
  onClearAll,
}) => {
  const [settingsDialog, setSettingsDialog] = useState<{
    isOpen: boolean;
    indicator: string | null;
  }>({ isOpen: false, indicator: null });

  const handleSettingsClick = (e: React.MouseEvent, indicatorName: string) => {
    e.stopPropagation();
    setSettingsDialog({ isOpen: true, indicator: indicatorName });
  };

  const handleCloseSettings = () => {
    setSettingsDialog({ isOpen: false, indicator: null });
  };

  return (
    <>
      <Card className="overflow-hidden shadow-md border-border/40 bg-gradient-to-br from-card via-card to-muted/10 backdrop-blur-sm">
        <CardHeader className="px-4 py-3 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent border-b border-border/30">
          <CardTitle className="flex items-center gap-2.5 text-sm">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 shadow-sm">
              <HiOutlineChartPie className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-bold text-foreground tracking-tight">
              Technical Indicators
            </span>
            {activeIndicators.length > 0 && (
              <Badge className="ml-auto text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm">
                {activeIndicators.length} active
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-3 space-y-2">
          {INDICATORS.map(indicator => (
            <div
              key={indicator.name}
              className={`flex items-center justify-between p-3 rounded-lg transition-all border ${
                activeIndicators.includes(indicator.name)
                  ? 'bg-primary/10 border-primary/30 shadow-sm'
                  : 'bg-muted/30 border-transparent hover:bg-muted/50'
              }`}
            >
              <Label
                htmlFor={`indicator-${indicator.name}`}
                className="flex items-center flex-1 min-w-0 gap-2.5 text-xs font-semibold cursor-pointer text-foreground"
              >
                <span className="shrink-0 text-muted-foreground">
                  {indicator.icon}
                </span>
                <span className="truncate">{indicator.label}</span>
              </Label>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => handleSettingsClick(e, indicator.name)}
                  className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
                  title={`Configure ${indicator.label}`}
                >
                  <HiOutlineCog className="w-4 h-4" />
                </Button>
                <Switch
                  id={`indicator-${indicator.name}`}
                  checked={activeIndicators.includes(indicator.name)}
                  onCheckedChange={checked => onToggle(indicator.name, checked)}
                  className="shrink-0"
                />
              </div>
            </div>
          ))}
          {activeIndicators.length > 0 && (
            <div className="pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearAll}
                className="w-full text-xs font-medium h-8 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                Clear all indicators
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {settingsDialog.indicator && (
        <IndicatorSettingsDialog
          indicator={
            settingsDialog.indicator as
              | 'RSI'
              | 'ATR'
              | 'EMA'
              | 'BollingerBands'
              | 'MACD'
          }
          isOpen={settingsDialog.isOpen}
          onClose={handleCloseSettings}
        />
      )}
    </>
  );
};
