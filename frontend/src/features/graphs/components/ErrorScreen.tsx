import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface ErrorScreenProps {
  title?: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

const ErrorScreen = ({
  title = 'Connection Error',
  description = 'Unable to load chart data. Check your connection and try again.',
  primaryLabel = 'Try Again',
  secondaryLabel = 'Go Back',
  onPrimaryAction = () => window.location.reload(),
  onSecondaryAction = () => window.history.back(),
}: ErrorScreenProps) => {
  return (
    <div className="flex items-center justify-center h-[100dvh] bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-destructive/10">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>

        <h1 className="mt-4 text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        <div className="flex flex-col gap-2 mt-6">
          <Button
            onClick={onPrimaryAction}
            className="flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {primaryLabel}
          </Button>
          <Button variant="outline" onClick={onSecondaryAction}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {secondaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorScreen;
