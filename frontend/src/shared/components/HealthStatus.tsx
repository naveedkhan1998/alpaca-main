import type React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Circle, Server, Zap, Activity } from 'lucide-react';
import {
  selectHealthStatus,
  type HealthStatus,
} from 'src/features/health/healthSlice';
import { useAppSelector } from 'src/app/hooks';

const ServiceStatusItem = ({
  name,
  status,
}: {
  name: string;
  status: HealthStatus;
}) => {
  const formatServiceName = (name: string) => {
    return name
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getServiceIcon = (name: string) => {
    if (name.includes('database') || name.includes('db')) {
      return <Server className="w-3.5 h-3.5" />;
    }
    if (name.includes('cache') || name.includes('redis')) {
      return <Zap className="w-3.5 h-3.5" />;
    }
    return <Activity className="w-3.5 h-3.5" />;
  };

  const statusColor = {
    ok: 'text-success',
    pending: 'text-warning',
    error: 'text-destructive',
  };

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {getServiceIcon(name)}
        <span className="text-sm">{formatServiceName(name)}</span>
      </div>
      <Circle
        className={`w-2 h-2 fill-current ${statusColor[status]}`}
      />
    </div>
  );
};

const HealthStatusComponent: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const healthStatus = useAppSelector(selectHealthStatus);

  const getOverallStatus = (): HealthStatus => {
    const statuses = Object.values(healthStatus);
    if (statuses.length === 0) return 'pending';
    if (statuses.some(status => status === 'pending')) return 'pending';
    if (statuses.some(status => status === 'error')) return 'error';
    return 'ok';
  };

  const overallStatus = getOverallStatus();
  const serviceCount = Object.keys(healthStatus).length;
  const healthyCount = Object.values(healthStatus).filter(
    status => status === 'ok'
  ).length;
  const errorCount = Object.values(healthStatus).filter(
    status => status === 'error'
  ).length;

  const statusColor = {
    ok: 'bg-success',
    pending: 'bg-warning',
    error: 'bg-destructive',
  };

  const statusText = {
    ok: 'All systems operational',
    pending: 'Checking services...',
    error: `${errorCount} service${errorCount !== 1 ? 's' : ''} down`,
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50 ${compact ? 'justify-center w-8 h-8' : 'w-full'}`}
          aria-label={`System status: ${overallStatus}`}
        >
          <span className={`w-2 h-2 rounded-full ${statusColor[overallStatus]} ${overallStatus === 'pending' ? 'animate-pulse' : ''}`} />
          {!compact && <span>Status</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" side="right" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">System Status</span>
            <span className={`w-2 h-2 rounded-full ${statusColor[overallStatus]}`} />
          </div>
          
          <p className="text-xs text-muted-foreground">
            {statusText[overallStatus]}
          </p>

          {serviceCount > 0 && (
            <div className="pt-2 space-y-1 border-t">
              {Object.entries(healthStatus)
                .sort(([, a], [, b]) => {
                  const order = { error: 0, pending: 1, ok: 2 };
                  return order[a] - order[b];
                })
                .map(([name, status]) => (
                  <ServiceStatusItem key={name} name={name} status={status} />
                ))}
            </div>
          )}

          {serviceCount > 0 && (
            <div className="flex items-center gap-3 pt-2 text-xs border-t text-muted-foreground">
              <span>{healthyCount} healthy</span>
              {errorCount > 0 && (
                <span className="text-destructive">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default HealthStatusComponent;
