import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HiChartSquareBar,
  HiPresentationChartLine,
  HiTrendingUp,
  HiChartBar,
  HiBeaker,
  HiViewGrid,
} from 'react-icons/hi';
import type { SeriesType } from 'lightweight-charts';

const chartTypeMeta: {
  value: SeriesType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'Candlestick',
    label: 'Candlesticks',
    icon: <HiChartBar className="w-4 h-4" />,
  },
  { value: 'Line', label: 'Line', icon: <HiTrendingUp className="w-4 h-4" /> },
  {
    value: 'Area',
    label: 'Area',
    icon: <HiPresentationChartLine className="w-4 h-4" />,
  },
  {
    value: 'Bar',
    label: 'Bars',
    icon: <HiChartSquareBar className="w-4 h-4" />,
  },
  {
    value: 'Baseline',
    label: 'Baseline',
    icon: <HiBeaker className="w-4 h-4" />,
  },
];

interface ChartStyleSelectorProps {
  chartType: SeriesType;
  onChange: (type: SeriesType) => void;
}

export const ChartStyleSelector: React.FC<ChartStyleSelectorProps> = ({
  chartType,
  onChange,
}) => {
  return (
    <Card className="overflow-hidden shadow-md border-border/40 bg-gradient-to-br from-card via-card to-muted/10 backdrop-blur-sm">
      <CardHeader className="px-4 py-3 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent border-b border-border/30">
        <CardTitle className="flex items-center gap-2.5 text-sm">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 shadow-sm">
            <HiViewGrid className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-bold text-foreground tracking-tight">
            Chart Style
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          {chartTypeMeta.map(type => (
            <div
              key={type.value}
              className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                chartType === type.value
                  ? 'border-primary/40 bg-primary/10 shadow-sm ring-1 ring-primary/20'
                  : 'border-border/30 hover:border-primary/30 hover:bg-muted/50'
              }`}
              onClick={() => onChange(type.value)}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg shrink-0 transition-colors ${
                    chartType === type.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {type.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-semibold text-xs truncate ${
                      chartType === type.value
                        ? 'text-primary'
                        : 'text-foreground'
                    }`}
                  >
                    {type.label}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
