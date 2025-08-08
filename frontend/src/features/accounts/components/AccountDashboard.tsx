import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Power,
  User,
  Clock,
  Info,
  RefreshCcw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import type { AlpacaAccount } from '@/types/common-types';
import { useSyncAssetsMutation } from '@/api/alpacaService';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

interface AccountDashboardProps {
  account: AlpacaAccount;
  lastUpdatedHours: number | null;
}

const iconVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 20 },
  },
};

// Type guards and helper to extract a useful error message without using `any`
function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

function isSerializedError(error: unknown): error is SerializedError {
  return typeof error === 'object' && error !== null && 'message' in error;
}

function extractErrorMessage(
  error: unknown,
  fallback = 'Failed to start sync'
): string {
  if (typeof error === 'string') return error;
  if (isFetchBaseQueryError(error)) {
    const data = error.data as unknown;
    if (data && typeof data === 'object') {
      const d = data as { msg?: string; detail?: string; error?: string };
      return d.msg ?? d.detail ?? d.error ?? fallback;
    }
    return fallback;
  }
  if (isSerializedError(error)) {
    return error.message ?? fallback;
  }
  return fallback;
}

const AccountDashboard = ({
  account,
  lastUpdatedHours,
}: AccountDashboardProps) => {
  const [syncAssets, { isLoading: isSyncing }] = useSyncAssetsMutation();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncMsg(null);
    setSyncError(null);
    try {
      const res = await syncAssets().unwrap();
      setSyncMsg(
        res?.msg ?? 'Asset sync started. This may take a few minutes.'
      );
    } catch (e: unknown) {
      setSyncError(extractErrorMessage(e));
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <Card className="w-full overflow-hidden shadow-lg bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="p-6 bg-muted/50">
          <motion.div
            variants={iconVariants}
            className="flex items-center justify-between"
          >
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              Alpaca Account Dashboard
            </CardTitle>
            <Badge
              variant={account.is_active ? 'success' : 'destructive'}
              className="flex items-center gap-2 py-1 pl-2 pr-3 text-sm"
            >
              {account.is_active ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Power className="w-4 h-4" />
              )}
              {account.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </motion.div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <motion.div
            variants={iconVariants}
            className="grid grid-cols-1 gap-6 md:grid-cols-2"
          >
            <div className="p-4 space-y-4 rounded-lg bg-background/50">
              <h3 className="flex items-center font-semibold text-muted-foreground">
                <User className="w-5 h-5 mr-3 text-primary" />
                Account Holder
              </h3>
              <p className="text-xl font-semibold text-foreground">
                {account.name}
              </p>
            </div>
            <div className="p-4 space-y-4 rounded-lg bg-background/50">
              <h3 className="flex items-center font-semibold text-muted-foreground">
                <RefreshCcw className="w-5 h-5 mr-3 text-primary" />
                Sync Assets
              </h3>
              <div className="flex items-center gap-3">
                <Button onClick={handleSync} disabled={isSyncing}>
                  <RefreshCcw
                    className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`}
                  />
                  {isSyncing ? 'Starting…' : 'Start Sync'}
                </Button>
              </div>
              {syncMsg && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  {syncMsg}
                </p>
              )}
              {syncError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {syncError}
                </p>
              )}
            </div>
          </motion.div>

          <motion.div variants={iconVariants}>
            <Separator />
          </motion.div>

          <motion.div
            variants={iconVariants}
            className="p-4 space-y-2 rounded-lg bg-background/50"
          >
            <h3 className="flex items-center font-semibold text-muted-foreground">
              <Clock className="w-5 h-5 mr-3 text-primary" />
              Last Synced
            </h3>
            <p className="text-lg font-medium text-foreground">
              {lastUpdatedHours !== null
                ? `${lastUpdatedHours.toFixed(1)} hours ago`
                : 'N/A'}
            </p>
          </motion.div>

          <motion.div variants={iconVariants}>
            <Alert
              variant="default"
              className="border-blue-200 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-800"
            >
              <Info className="w-5 h-5 text-blue-600" />
              <AlertTitle className="font-semibold text-blue-800 dark:text-blue-200">
                Important Notice
              </AlertTitle>
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                For uninterrupted trading, it's crucial to refresh your session
                token daily.
              </AlertDescription>
            </Alert>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AccountDashboard;
