import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HiClock } from 'react-icons/hi';

interface TimeframeOption {
  value: number;
  label: string;
}

interface TimeframeSelectorProps {
  timeframe: number;
  options: TimeframeOption[];
  onChange: (value: number) => void;
}

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  timeframe,
  options,
  onChange,
}) => {
  return (
    <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-3 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="p-1.5 border rounded-lg bg-primary/10 text-primary border-primary/20 shrink-0">
            <HiClock className="w-3 h-3" />
          </div>
          <div className="flex items-center flex-1 min-w-0 gap-2">
            <span className="font-semibold text-card-foreground">
              Timeframe
            </span>
            {timeframe && (
              <Badge
                variant="secondary"
                className="ml-auto text-xs border bg-primary/10 text-primary border-primary/20 shrink-0"
              >
                {options.find(t => t.value === timeframe)?.label ||
                  `${timeframe}m`}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-3 gap-1.5">
          {options.map(tf => (
            <Button
              key={tf.value}
              size="sm"
              variant={timeframe === tf.value ? 'default' : 'outline'}
              className="h-8 text-xs font-medium"
              onClick={() => onChange(tf.value)}
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
