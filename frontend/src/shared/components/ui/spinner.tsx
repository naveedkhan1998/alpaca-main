import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="status" {...props}>
      <Loader2 className={cn('h-4 w-4 animate-spin', className)} />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
