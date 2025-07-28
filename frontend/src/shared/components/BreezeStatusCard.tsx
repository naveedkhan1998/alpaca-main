import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  WifiOff,
  Wifi,
  AlertCircle,
  RefreshCw,
  Activity,
  Radio,
  Zap,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useCheckBreezeStatusQuery } from '@/api/breezeServices';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut' as const,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
};

const BreezeStatusCard: React.FC = () => {
  const {
    data: breezeStatusData,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useCheckBreezeStatusQuery(undefined, {
    pollingInterval: 60000,
  });

  // Derived state for error message
  const errorMessage = React.useMemo(() => {
    if (!error) return null;
    if ('status' in error && error.status === 404) {
      return 'Breeze service not found. Please check your configuration.';
    }
  }, [error]);

  const getOverallStatus = () => {
    if (!breezeStatusData?.data) return 'unknown';
    const { session_status, websocket_status } = breezeStatusData.data;
    if (session_status && websocket_status) return 'healthy';
    if (session_status || websocket_status) return 'partial';
    return 'down';
  };

  const overallStatus = getOverallStatus();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full"
    >
      <Card className="overflow-hidden shadow-xl border-border/50 bg-gradient-to-br from-card via-card to-card/80">
        {/* Header with status indicator */}
        <CardHeader className="relative p-6 border-b bg-gradient-to-r from-muted/30 to-muted/10 border-border/50">
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-primary/10 border-primary/20">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-foreground">
                  Breeze Connection
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Trading platform status monitor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading || isFetching}
                className="transition-all duration-200 bg-background/50 hover:bg-accent/50 border-border/50"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading || isFetching ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </motion.div>

          {/* Overall status indicator */}
          <motion.div variants={itemVariants} className="mt-4">
            <OverallStatusIndicator
              status={overallStatus}
              isLoading={isLoading || isFetching}
            />
          </motion.div>
        </CardHeader>

        <CardContent className="p-6">
          {errorMessage ? (
            <motion.div variants={itemVariants}>
              <Alert
                variant="destructive"
                className="border-destructive/20 bg-destructive/5"
              >
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="ml-2 text-sm">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <StatusItem
                  title="Session Status"
                  status={breezeStatusData?.data.session_status ?? false}
                  isLoading={isLoading || isFetching}
                  icon={Radio}
                  description="Authentication & account access"
                />
                <StatusItem
                  title="Live Data Feed"
                  status={breezeStatusData?.data.websocket_status ?? false}
                  isLoading={isLoading || isFetching}
                  icon={Zap}
                  description="Real-time market data stream"
                />
              </div>

              <Separator className="bg-border/50" />

              {/* Connection metrics */}
              <div className="flex items-center justify-between px-3 py-2 text-xs rounded-md text-muted-foreground bg-muted/20">
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
                <span>Auto-refresh: 60s</span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface StatusItemProps {
  title: string;
  status: boolean;
  isLoading: boolean;
  icon: React.ElementType;
  description: string;
}

const StatusItem: React.FC<StatusItemProps> = ({
  title,
  status,
  isLoading,
  icon: Icon,
  description,
}) => {
  const getStatusConfig = () => {
    if (isLoading) {
      return {
        bgGradient: 'bg-gradient-to-br from-muted/20 to-muted/10',
        borderColor: 'border-border/30',
        iconColor: 'text-muted-foreground',
        pulseColor: 'bg-muted-foreground',
      };
    }

    if (status) {
      return {
        bgGradient: 'bg-gradient-to-br from-success/5 to-success/10',
        borderColor: 'border-success/20',
        iconColor: 'text-success',
        pulseColor: 'bg-success',
      };
    }

    return {
      bgGradient: 'bg-gradient-to-br from-destructive/5 to-destructive/10',
      borderColor: 'border-destructive/20',
      iconColor: 'text-destructive',
      pulseColor: 'bg-destructive',
    };
  };

  const config = getStatusConfig();

  return (
    <div
      className={`relative p-4 rounded-lg border transition-all duration-300 ${config.bgGradient} ${config.borderColor} ${
        isLoading ? 'opacity-60' : 'hover:scale-[1.02]'
      } overflow-hidden group`}
    >
      {/* Subtle animated background for active connections */}
      {status && !isLoading && (
        <div
          className={`absolute inset-0 ${config.pulseColor} opacity-[0.02] `}
        />
      )}

      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-md ${config.bgGradient} border ${config.borderColor}`}
            >
              <Icon className={`w-4 h-4 ${config.iconColor} animate-pulse`} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {description}
              </p>
            </div>
          </div>

          <StatusBadge status={status} isLoading={isLoading} />
        </div>

        {/* Connection indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {status ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-destructive" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {isLoading ? 'Checking...' : status ? 'Active' : 'Inactive'}
            </span>
          </div>

          {status && !isLoading && (
            <div className="flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${config.pulseColor} animate-pulse`}
              />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: boolean; isLoading: boolean }> = ({
  status,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Badge
        variant="outline"
        className="bg-muted/20 text-muted-foreground border-muted-foreground/20"
      >
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Checking
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={
        status
          ? 'bg-success/10 text-success border-success/20 font-medium'
          : 'bg-destructive/10 text-destructive border-destructive/20 font-medium'
      }
    >
      <div
        className={`w-2 h-2 rounded-full mr-1.5 ${status ? 'bg-success animate-pulse' : 'bg-destructive'}`}
      />
      {status ? 'Connected' : 'Disconnected'}
    </Badge>
  );
};

const OverallStatusIndicator: React.FC<{
  status: string;
  isLoading: boolean;
}> = ({ status, isLoading }) => {
  const getStatusConfig = () => {
    if (isLoading) {
      return {
        icon: <Activity className="w-4 h-4 text-warning animate-pulse" />,
        text: 'Checking Connection Status',
        bgGradient: 'bg-gradient-to-r from-warning/5 to-warning/10',
        borderColor: 'border-warning/20',
        badge: {
          text: 'Updating',
          className: 'bg-warning/10 text-warning border-warning/20',
        },
      };
    }

    switch (status) {
      case 'healthy':
        return {
          icon: <Wifi className="w-4 h-4 text-success" />,
          text: 'All Connections Active',
          bgGradient: 'bg-gradient-to-r from-success/5 to-success/10',
          borderColor: 'border-success/20',
          badge: {
            text: 'Operational',
            className: 'bg-success/10 text-success border-success/20',
          },
        };
      case 'partial':
        return {
          icon: <AlertCircle className="w-4 h-4 text-warning" />,
          text: 'Partial Connection Issues',
          bgGradient: 'bg-gradient-to-r from-warning/5 to-warning/10',
          borderColor: 'border-warning/20',
          badge: {
            text: 'Degraded',
            className: 'bg-warning/10 text-warning border-warning/20',
          },
        };
      case 'down':
        return {
          icon: <WifiOff className="w-4 h-4 text-destructive" />,
          text: 'Connection Issues Detected',
          bgGradient: 'bg-gradient-to-r from-destructive/5 to-destructive/10',
          borderColor: 'border-destructive/20',
          badge: {
            text: 'Offline',
            className:
              'bg-destructive/10 text-destructive border-destructive/20',
          },
        };
      default:
        return {
          icon: <AlertCircle className="w-4 h-4 text-muted-foreground" />,
          text: 'Status Unknown',
          bgGradient: 'bg-gradient-to-r from-muted/5 to-muted/10',
          borderColor: 'border-muted/20',
          badge: {
            text: 'Unknown',
            className: 'bg-muted/10 text-muted-foreground border-muted/20',
          },
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`p-3 rounded-lg border ${config.bgGradient} ${config.borderColor}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {config.icon}
          <span className="text-sm font-medium text-foreground">
            {config.text}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`text-xs ${config.badge.className}`}
        >
          {config.badge.text}
        </Badge>
      </div>
    </div>
  );
};

export default BreezeStatusCard;
