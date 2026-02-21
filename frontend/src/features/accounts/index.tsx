import { motion } from 'framer-motion';
import { Loader2, RefreshCcw } from 'lucide-react';

import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
  PageActions,
} from '@/components/PageLayout';

import { useAppSelector } from 'src/app/hooks';
import { getIsAlpacaAccountLoading } from '../auth/authSlice';

import AlpacaStatusCard from '../../shared/components/AlpacaStatusCard';
import { useSyncAssetsMutation } from '@/api/alpacaService';
import { Button } from '@/components/ui/button';

const AccountsPage = () => {
  const isAlpacaAccountLoading = useAppSelector(getIsAlpacaAccountLoading);
  const [syncAssets, { isLoading: isSyncing }] = useSyncAssetsMutation();

  const handleSync = async () => {
    await syncAssets();
  };

  if (isAlpacaAccountLoading) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="space-y-3 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary/60" />
          <p className="text-[12px] text-muted-foreground/60 font-mono">
            Loading account...
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      header={<PageHeader>Account Dashboard</PageHeader>}
      subheader={
        <PageSubHeader>
          Monitor connection status and sync assets.
        </PageSubHeader>
      }
      actions={
        <PageActions>
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full sm:w-auto h-7 text-[12px] px-2.5"
            size="sm"
          >
            <RefreshCcw
              className={`w-3 h-3 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`}
            />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
        </PageActions>
      }
    >
      <PageContent>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.2 }}
        >
          <AlpacaStatusCard />
        </motion.div>
      </PageContent>
    </PageLayout>
  );
};

export default AccountsPage;
