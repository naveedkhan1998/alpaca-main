import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PanelHeaderProps {
  title: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  dense?: boolean;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  icon,
  onClose,
  dense,
}) => {
  return (
    <div
      className={`flex items-center justify-between ${
        dense ? 'px-3 py-2.5' : 'px-4 py-3'
      } border-b border-border/40 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 backdrop-blur-sm`}
    >
      <div className="flex items-center gap-2.5">
        {icon ? (
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 shadow-sm">
            {icon}
          </div>
        ) : null}
        <span className="text-sm font-bold text-foreground tracking-tight">
          {title}
        </span>
      </div>
      {onClose ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="w-8 h-8 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label={`Hide ${title.toLowerCase()}`}
        >
          <X className="w-4 h-4" />
        </Button>
      ) : null}
    </div>
  );
};

export default PanelHeader;
