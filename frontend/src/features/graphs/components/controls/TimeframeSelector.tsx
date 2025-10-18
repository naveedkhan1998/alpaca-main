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
    <Card className="overflow-hidden shadow-md border-border/40 bg-gradient-to-br from-card via-card to-muted/10 backdrop-blur-sm">
      <CardHeader className="px-4 py-3 bg-gradient-to-r from-muted/40 via-muted/20 to-transparent border-b border-border/30">
        <CardTitle className="flex items-center gap-2.5 text-sm">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 shadow-sm">
            <HiClock className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex items-center flex-1 min-w-0 gap-2">
            <span className="font-bold text-foreground tracking-tight">
              Timeframe
            </span>
            {timeframe && (
              <Badge
                variant="secondary"
                className="ml-auto text-xs font-semibold border bg-primary/15 text-primary border-primary/30 shrink-0 shadow-sm"
              >
                {options.find(t => t.value === timeframe)?.label ||
                  `${timeframe}m`}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3">
        <div className="grid grid-cols-3 gap-2">
          {options.map(tf => (
            <Button
              key={tf.value}
              size="sm"
              variant={timeframe === tf.value ? 'default' : 'outline'}
              className={`h-9 text-xs font-semibold transition-all ${
                timeframe === tf.value
                  ? 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90'
                  : 'hover:bg-muted/80 hover:border-primary/30'
              }`}
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
