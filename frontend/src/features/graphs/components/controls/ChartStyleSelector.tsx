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
    <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1.5 border rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0">
            <HiViewGrid className="w-3 h-3" />
          </div>
          <span className="font-semibold text-card-foreground">
            Chart Style
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-2 gap-1.5">
          {chartTypeMeta.map(type => (
            <div
              key={type.value}
              className={`p-2 rounded-lg border-2 transition-all duration-200 cursor-pointer ${chartType === type.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/50'}`}
              onClick={() => onChange(type.value)}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${chartType === type.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {type.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-semibold text-xs truncate ${chartType === type.value ? 'text-primary' : 'text-card-foreground'}`}
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
