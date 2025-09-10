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
        <div className="space-y-4 text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">Loading account information...</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      header={<PageHeader>Account Dashboard</PageHeader>}
      subheader={<PageSubHeader>Monitor connection status and sync assets.</PageSubHeader>}
      actions={
        <PageActions>
          <Button onClick={handleSync} disabled={isSyncing} className="w-full sm:w-auto" size="sm">
            <RefreshCcw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing Assets...' : 'Sync Assets'}
          </Button>
        </PageActions>
      }
    >
      <PageContent>
        <div className="space-y-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <AlpacaStatusCard />
          </motion.div>
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default AccountsPage;
