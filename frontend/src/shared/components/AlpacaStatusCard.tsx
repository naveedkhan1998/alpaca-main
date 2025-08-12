import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  WifiOff,
  Wifi,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useCheckAlpacaStatusQuery } from '@/api/alpacaService';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
};

const AlpacaStatusCard: React.FC = () => {
  const {
    data: alpacaStatusData,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useCheckAlpacaStatusQuery(undefined, {
    pollingInterval: 60000,
  });

  // Derived state for error message
  const errorMessage = React.useMemo(() => {
    if (!error) return null;
    if ('status' in error && error.status === 404) {
      return 'Service not found. Please check your configuration.';
    }
    return 'Connection error. Please try again.';
  }, [error]);

  const isConnected = alpacaStatusData?.data?.connection_status ?? false;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full"
    >
      <Card className="overflow-hidden border-border/50 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  isConnected && !isLoading
                    ? 'bg-success/10 text-success'
                    : isLoading
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-destructive/10 text-destructive'
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isConnected ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  Connection Status
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Trading platform connection
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={isConnected} isLoading={isLoading} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading || isFetching}
                className="w-8 h-8 p-0"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading || isFetching ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {errorMessage ? (
            <Alert
              variant="destructive"
              className="border-destructive/20 bg-destructive/5"
            >
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="ml-2 text-sm">
                {errorMessage}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">
                    {isLoading
                      ? 'Checking connection...'
                      : isConnected
                        ? 'Connected to Alpaca'
                        : 'Not connected'}
                  </span>
                </div>
                {isConnected && !isLoading && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-xs text-muted-foreground">Live</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
                <span>Auto-refresh: 60s</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
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
        className="text-xs bg-muted/20 text-muted-foreground border-muted-foreground/20"
      >
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Checking
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        status
          ? 'bg-success/10 text-success border-success/20 font-medium'
          : 'bg-destructive/10 text-destructive border-destructive/20 font-medium'
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full mr-1.5 ${status ? 'bg-success animate-pulse' : 'bg-destructive'}`}
      />
      {status ? 'Connected' : 'Disconnected'}
    </Badge>
  );
};

export default AlpacaStatusCard;
