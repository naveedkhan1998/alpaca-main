import type React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Circle, Server, Zap, Activity } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
      return <Server className="w-3 h-3 shrink-0" />;
    }
    if (name.includes('cache') || name.includes('redis')) {
      return <Zap className="w-3 h-3 shrink-0" />;
    }
    return <Activity className="w-3 h-3 shrink-0" />;
  };

  const statusColor = {
    ok: 'text-success',
    pending: 'text-warning',
    error: 'text-destructive',
  };

  return (
    <div className="flex items-center justify-between px-2 py-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {getServiceIcon(name)}
        <span className="text-[12px]">{formatServiceName(name)}</span>
      </div>
      <Circle className={`w-2 h-2 fill-current ${statusColor[status]}`} />
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

  const statusDotColor = {
    ok: 'bg-success',
    pending: 'bg-warning',
    error: 'bg-destructive',
  };

  const statusText = {
    ok: 'All systems operational',
    pending: 'Checking services...',
    error: `${errorCount} service${errorCount !== 1 ? 's' : ''} down`,
  };

  if (compact) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <TooltipProvider>
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      className="flex items-center justify-center w-8 h-8 hover:bg-sidebar-accent/50"
                      aria-label={`System status: ${overallStatus}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${statusDotColor[overallStatus]} ${overallStatus === 'pending' ? 'animate-pulse' : ''}`}
                      />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs">System Status</p>
                </TooltipContent>
                <DropdownMenuContent
                  className="rounded-md min-w-56"
                  side="right"
                  align="end"
                  sideOffset={8}
                >
                  <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[12px] font-medium">
                      System Status
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${statusDotColor[overallStatus]}`}
                    />
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <p className="text-[11px] text-muted-foreground">
                      {statusText[overallStatus]}
                    </p>
                  </div>
                  {serviceCount > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      {Object.entries(healthStatus)
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
                        ))}
                    </>
                  )}
                  {serviceCount > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="flex items-center gap-3 px-2 py-1.5 text-[11px] text-muted-foreground">
                        <span>{healthyCount} healthy</span>
                        {errorCount > 0 && (
                          <span className="text-destructive">
                            {errorCount} error{errorCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="h-8 px-2.5 hover:bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              aria-label={`System status: ${overallStatus}`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${statusDotColor[overallStatus]} ${overallStatus === 'pending' ? 'animate-pulse' : ''}`}
              />
              <span className="text-[12px] text-sidebar-foreground/70">
                Status
              </span>
              <span className="ml-auto text-[10px] font-mono text-sidebar-foreground/40">
                {healthyCount}/{serviceCount}
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-md"
            side="top"
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[12px] font-medium">System Status</span>
              <span
                className={`w-2 h-2 rounded-full ${statusDotColor[overallStatus]}`}
              />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-[11px] text-muted-foreground">
                {statusText[overallStatus]}
              </p>
            </div>
            {serviceCount > 0 && (
              <>
                <DropdownMenuSeparator />
                {Object.entries(healthStatus)
                  .sort(([, a], [, b]) => {
                    const order = { error: 0, pending: 1, ok: 2 };
                    return order[a] - order[b];
                  })
                  .map(([name, status]) => (
                    <ServiceStatusItem key={name} name={name} status={status} />
                  ))}
              </>
            )}
            {serviceCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="flex items-center gap-3 px-2 py-1.5 text-[11px] text-muted-foreground">
                  <span>{healthyCount} healthy</span>
                  {errorCount > 0 && (
                    <span className="text-destructive">
                      {errorCount} error{errorCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default HealthStatusComponent;
