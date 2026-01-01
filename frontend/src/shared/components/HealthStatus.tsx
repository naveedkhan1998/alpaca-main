import type React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Activity, Circle, Server, Zap } from 'lucide-react';
import {
  selectHealthStatus,
  type HealthStatus,
} from 'src/features/health/healthSlice';
import { useAppSelector } from 'src/app/hooks';
import { useIsMobile } from '@/hooks/useMobile';

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
    <div className="flex items-center justify-between gap-3 px-3 py-2 border rounded-lg border-border/60 bg-muted/30">
      <div className="flex items-center gap-2 text-muted-foreground">
        {getServiceIcon(name)}
        <span className="text-sm font-medium text-foreground">
          {formatServiceName(name)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Circle className={`h-2 w-2 fill-current ${statusColor[status]}`} />
        <span className="capitalize">{status}</span>
      </div>
    </div>
  );
};

const HealthStatusComponent: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const healthStatus = useAppSelector(selectHealthStatus);
  const isMobile = useIsMobile();

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

  const statusTone = {
    ok: 'bg-success/10 text-success border-success/20',
    pending: 'bg-warning/10 text-warning border-warning/20',
    error: 'bg-destructive/10 text-destructive border-destructive/20',
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
          className={`group flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-muted/50 hover:text-foreground ${compact ? 'justify-center h-9 w-9 px-0' : 'w-full sm:w-full'}`}
          aria-label={`System status: ${overallStatus}`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`absolute inset-0 rounded-full ${statusColor[overallStatus]} ${overallStatus === 'pending' ? 'animate-pulse' : ''}`}
            />
            <span className="absolute inset-0 rounded-full bg-background/30 ring-2 ring-background" />
          </span>
          {!compact && (
            <span className="flex items-center gap-1">
              System
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                status
              </span>
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] max-w-sm p-4 sm:w-80"
        side={isMobile ? 'bottom' : 'right'}
        align={isMobile ? 'center' : 'start'}
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                System status
              </p>
              <p className="text-xs text-muted-foreground">
                {statusText[overallStatus]}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone[overallStatus]}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${statusColor[overallStatus]} ${overallStatus === 'pending' ? 'animate-pulse' : ''}`}
              />
              {overallStatus === 'ok'
                ? 'Operational'
                : overallStatus === 'pending'
                  ? 'Checking'
                  : 'Degraded'}
            </div>
          </div>

          <div className="p-3 border rounded-xl border-border/60 bg-muted/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {healthyCount}/{serviceCount || 0} healthy
              </span>
              <span className={errorCount > 0 ? 'text-destructive' : ''}>
                {errorCount} issue{errorCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
              <div
                className={`h-full ${statusColor[overallStatus]}`}
                style={{
                  width:
                    serviceCount === 0
                      ? '100%'
                      : `${Math.round((healthyCount / serviceCount) * 100)}%`,
                }}
              />
            </div>
          </div>

          {serviceCount > 0 && (
            <div className="space-y-2">
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
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default HealthStatusComponent;
