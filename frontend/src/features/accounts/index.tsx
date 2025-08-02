import { useEffect, useState } from 'react';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
} from '@/components/PageLayout';

import { useAppSelector } from 'src/app/hooks';
import {
  getAlpacaAccountFromState,
  getIsAlpacaAccountLoading,
  getHasAlpacaAccount,
} from '../auth/authSlice';

import AccountDashboard from './components/AccountDashboard';
import BreezeStatusCard from '../../shared/components/AlpacaStatusCard';

import CreateAlpacaForm from './components/CreateAlpacaForm';

const AccountsPage = () => {
  const alpacaAccount = useAppSelector(getAlpacaAccountFromState);
  const isAlpacaAccountLoading = useAppSelector(getIsAlpacaAccountLoading);
  const hasAlpacaAccount = useAppSelector(getHasAlpacaAccount);

  const [lastUpdatedHours, setLastUpdatedHours] = useState<number | null>(null);

  useEffect(() => {
    if (alpacaAccount && alpacaAccount.last_updated) {
      const lastUpdatedTime = new Date(alpacaAccount.last_updated);
      const currentTime = new Date();
      const timeDifferenceInHours =
        (currentTime.getTime() - lastUpdatedTime.getTime()) / (1000 * 60 * 60);
      setLastUpdatedHours(timeDifferenceInHours);
    }
  }, [alpacaAccount]);

  if (isAlpacaAccountLoading) {
    return (
      <div className="flex items-center justify-center h-[100dvh]">
        <div className="space-y-4 text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">
            Loading your account details...
          </p>
        </div>
      </div>
    );
  }

  // Show create form if no account exists (using persisted boolean)
  if (!hasAlpacaAccount || !alpacaAccount) {
    return <CreateAlpacaForm />;
  }

  return (
    <PageLayout
      header={
        <PageHeader>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text">
            Breeze Account
          </span>
        </PageHeader>
      }
      subheader={
        <PageSubHeader>Manage your ICICI Direct Breeze account</PageSubHeader>
      }
    >
      <PageContent>
        <div className="space-y-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <BreezeStatusCard />
          </motion.div>

          <AccountDashboard
            account={alpacaAccount}
            lastUpdatedHours={lastUpdatedHours}
          />
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default AccountsPage;
