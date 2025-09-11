import type React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff,
  Server,
  Zap,
} from 'lucide-react';
import {
  selectHealthStatus,
  type HealthStatus,
} from 'src/features/health/healthSlice';
import { useAppSelector } from 'src/app/hooks';

const StatusIndicator = ({
  status,
  size = 'sm',
}: {
  status: HealthStatus;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (status === 'ok') {
    return <CheckCircle className={`${sizeClasses[size]} text-success`} />;
  }
  if (status === 'pending') {
    return (
      <Clock className={`${sizeClasses[size]} text-warning animate-pulse`} />
    );
  }
  return <XCircle className={`${sizeClasses[size]} text-destructive`} />;
};

const StatusBadge = ({ status }: { status: HealthStatus }) => {
  const variants = {
    ok: {
      className: 'bg-success/10 text-success border-success/20 font-medium',
      text: 'Operational',
    },
    pending: {
      className: 'bg-warning/10 text-warning border-warning/20 font-medium',
      text: 'Checking',
    },
    error: {
      className:
        'bg-destructive/10 text-destructive border-destructive/20 font-medium',
      text: 'Error',
    },
  };

  const config = variants[status];
  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {config.text}
    </Badge>
  );
};

const OverallStatusDisplay = ({
  status,
  serviceCount,
  healthyCount,
  errorCount,
}: {
  status: HealthStatus;
  serviceCount: number;
  healthyCount: number;
  errorCount: number;
}) => {
  const statusConfig = {
    ok: {
      icon: <Wifi className="w-4 h-4 text-success" />,
      text: 'All Systems Operational',
      description: `${serviceCount} services running normally`,
      bgGradient: 'bg-gradient-to-r from-success/5 to-success/10',
      borderColor: 'border-success/20',
      pulseColor: 'bg-success',
    },
    pending: {
      icon: <Activity className="w-4 h-4 text-warning animate-pulse" />,
      text: 'System Check in Progress',
      description: 'Monitoring service health...',
      bgGradient: 'bg-gradient-to-r from-warning/5 to-warning/10',
      borderColor: 'border-warning/20',
      pulseColor: 'bg-warning',
    },
    error: {
      icon: <WifiOff className="w-4 h-4 text-destructive" />,
      text: 'Service Issues Detected',
      description: `${errorCount} service${errorCount !== 1 ? 's' : ''} experiencing problems`,
      bgGradient: 'bg-gradient-to-r from-destructive/5 to-destructive/10',
      borderColor: 'border-destructive/20',
      pulseColor: 'bg-destructive',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`relative p-4 rounded-lg border ${config.bgGradient} ${config.borderColor} overflow-hidden`}
    >
      {/* Subtle animated background pulse for active states */}
      {status !== 'ok' && (
        <div
          className={`absolute inset-0 ${config.pulseColor} opacity-[0.02] `}
        />
      )}

      <div className="relative flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-semibold text-foreground ">
              {config.text}
            </h4>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {config.description}
          </p>
          {serviceCount > 0 && (
            <div className="flex items-center gap-4 mt-2 text-xs ">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-muted-foreground">
                  {healthyCount} healthy
                </span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">
                    {errorCount} error{errorCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
      return <Server className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    if (name.includes('cache') || name.includes('redis')) {
      return <Zap className="w-3.5 h-3.5 text-muted-foreground" />;
    }
    return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="group flex items-center justify-between px-3 py-2.5 transition-all duration-200 rounded-md hover:bg-accent/30 hover:scale-[1.01]">
      <div className="flex items-center flex-1 min-w-0 gap-3">
        <div className="flex items-center gap-2">
          <StatusIndicator status={status} size="sm" />
          {getServiceIcon(name)}
        </div>
        <span className="text-sm font-medium truncate transition-colors text-foreground group-hover:text-accent-foreground">
          {formatServiceName(name)}
        </span>
      </div>
      <StatusBadge status={status} />
    </div>
  );
};

const HealthStatusComponent: React.FC = () => {
  // Using mock data - replace with your actual selector
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full transition-all duration-200 hover:bg-accent/50 hover:scale-105 group"
          aria-label={`System status: ${overallStatus}`}
        >
          <StatusIndicator status={overallStatus} size="md" />
          {errorCount > 0 && (
            <span className="absolute flex items-center justify-center w-3 h-3 rounded-full -top-1 -right-1 bg-destructive animate-pulse">
              <span className="text-[10px] font-bold text-destructive-foreground">
                {errorCount}
              </span>
            </span>
          )}
          {/* Subtle glow effect on hover */}
          <div className="absolute inset-0 transition-opacity duration-200 rounded-md opacity-0 bg-accent/10 group-hover:opacity-100 -z-10" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="p-0 shadow-xl w-96 border-border/50"
        align="end"
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground">System Health</h3>
            </div>
            <div className="px-2 py-1 text-xs rounded text-muted-foreground bg-muted/50">
              Updated {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Overall Status */}
          <OverallStatusDisplay
            status={overallStatus}
            serviceCount={serviceCount}
            healthyCount={healthyCount}
            errorCount={errorCount}
          />

          {/* Service Details */}
          {serviceCount > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">
                  Service Details
                </span>
                <span className="text-xs text-muted-foreground">
                  {serviceCount} total
                </span>
              </div>

              <Separator className="mb-3 bg-border/50" />

              <div className="pr-1 space-y-1 overflow-y-auto max-h-64">
                {Object.entries(healthStatus).length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <div className="text-center">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-sm font-medium">
                        No services configured
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        Add services to monitor their health status
                      </p>
                    </div>
                  </div>
                ) : (
                  Object.entries(healthStatus)
                    .sort(([, a], [, b]) => {
                      const order = { error: 0, pending: 1, ok: 2 };
                      return order[a] - order[b];
                    })
                    .map(([name, status]) => (
                      <ServiceStatusItem
                        key={name}
                        name={name}
                        status={status}
                      />
                    ))
                )}
              </div>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HealthStatusComponent;
