import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PanelHeaderProps {
  title: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  dense?: boolean;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({ title, icon, onClose, dense }) => {
  return (
    <div className={`flex items-center justify-between ${dense ? 'p-2' : 'p-4'} border-b border-border/30`}>
      <div className="flex items-center space-x-3">
        {icon ? (
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-chart-1/20 to-chart-1/10">
            {icon}
          </div>
        ) : null}
        <span className="font-bold text-card-foreground">{title}</span>
      </div>
      {onClose ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="w-8 h-8 p-0 rounded-lg"
          aria-label={`Hide ${title.toLowerCase()}`}
        >
          <X className="w-4 h-4" />
        </Button>
      ) : null}
    </div>
  );
};

export default PanelHeader;

