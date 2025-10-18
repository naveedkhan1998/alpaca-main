import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PanelHeaderProps {
  title: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  dense?: boolean;
  minimal?: boolean;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  icon,
  onClose,
  dense,
  minimal = true,
}) => {
  if (minimal && onClose) {
    return (
      <div className="sticky z-20 flex justify-end mr-2 top-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-0 transition-all border rounded-lg shadow-lg w-7 h-7 bg-background/80 hover:bg-destructive/90 hover:text-destructive-foreground border-border/40 backdrop-blur-sm hover:scale-110"
          aria-label={`Hide ${title.toLowerCase()}`}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  // Standard header
  return (
    <div
      className={`flex items-center justify-between ${
        dense ? 'px-3 py-2.5' : 'px-4 py-3'
      } border-b border-border/40 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 backdrop-blur-sm`}
    >
      <div className="flex items-center gap-2.5">
        {icon ? (
          <div className="flex items-center justify-center w-8 h-8 border rounded-lg shadow-sm bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-primary/20">
            {icon}
          </div>
        ) : null}
        <span className="text-sm font-bold tracking-tight text-foreground">
          {title}
        </span>
      </div>
      {onClose ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="w-8 h-8 p-0 transition-colors rounded-lg hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Hide ${title.toLowerCase()}`}
        >
          <X className="w-4 h-4" />
        </Button>
      ) : null}
    </div>
  );
};

export default PanelHeader;
