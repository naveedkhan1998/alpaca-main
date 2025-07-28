import React, { memo } from 'react';
import { ChevronDown, History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const HISTORIC_DATA_DURATIONS = [4, 5, 6, 7, 8, 52, 104] as const;

const DurationSelector: React.FC<{
  duration: number;
  onDurationChange: (duration: number) => void;
}> = memo(({ duration, onDurationChange }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <History className="w-4 h-4" />
      <span>Historic Data Period</span>
    </div>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="justify-between w-full border-border bg-background hover:bg-muted"
        >
          {duration} weeks of data
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        className="bg-background border-border w-[--radix-dropdown-menu-trigger-width]"
      >
        {HISTORIC_DATA_DURATIONS.map(weeks => (
          <DropdownMenuItem key={weeks} onClick={() => onDurationChange(weeks)}>
            {weeks} weeks
            {weeks >= 52
              ? ` (${Math.round(weeks / 52)} year${weeks > 52 ? 's' : ''})`
              : ''}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
));

DurationSelector.displayName = 'DurationSelector';

export default DurationSelector;
