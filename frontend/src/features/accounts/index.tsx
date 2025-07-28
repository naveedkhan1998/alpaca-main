import { ChangeEvent, useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import {
  PageLayout,
  PageHeader,
  PageSubHeader,
  PageContent,
} from '@/components/PageLayout';
import { useUpdateBreezeMutation } from '@/api/breezeServices';
import type { BreezeAccount } from '@/types/common-types';
import { useAppSelector } from 'src/app/hooks';
import {
  getBreezeAccountFromState,
  getIsBreezeAccountLoading,
  getHasBreezeAccount,
} from '../auth/authSlice';

import CreateBreezeForm from './components/CreateBreezeForm';
import AccountDashboard from './components/AccountDashboard';
import UpdateSessionTokenDialog from './components/UpdateSessionTokenDialog';
import BreezeStatusCard from '../../shared/components/BreezeStatusCard';

const AccountsPage = () => {
  const breezeAccount = useAppSelector(getBreezeAccountFromState);
  const isBreezeAccountLoading = useAppSelector(getIsBreezeAccountLoading);
  const hasBreezeAccount = useAppSelector(getHasBreezeAccount);

  const [lastUpdatedHours, setLastUpdatedHours] = useState<number | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BreezeAccount | null>(
    null
  );
  const [sessionToken, setSessionToken] = useState('');

  const [updateBreeze, { isLoading: isUpdating }] = useUpdateBreezeMutation();

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSessionToken(e.target.value);
  }, []);

  const handleOpenLink = useCallback((key: string) => {
    window.open(
      `https://api.icicidirect.com/apiuser/login?api_key=${key}`,
      '_blank'
    );
  }, []);

  const sendToken = useCallback(async () => {
    if (selectedAccount) {
      const updatedAccount = {
        ...selectedAccount,
        session_token: sessionToken,
      };
      try {
        await updateBreeze({ data: updatedAccount }).unwrap();
        toast.success('Session token updated successfully');
        // The useBreezeAccount hook will automatically refetch on state change
        setOpenModal(false);
        setSessionToken('');
      } catch {
        toast.error('Failed to update session token');
      }
    }
  }, [selectedAccount, sessionToken, updateBreeze]);

  useEffect(() => {
    if (breezeAccount && breezeAccount.last_updated) {
      const lastUpdatedTime = new Date(breezeAccount.last_updated);
      const currentTime = new Date();
      const timeDifferenceInHours =
        (currentTime.getTime() - lastUpdatedTime.getTime()) / (1000 * 60 * 60);
      setLastUpdatedHours(timeDifferenceInHours);
    }
  }, [breezeAccount]);

  if (isBreezeAccountLoading) {
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
  if (!hasBreezeAccount || !breezeAccount) {
    return <CreateBreezeForm />;
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
            account={breezeAccount}
            lastUpdatedHours={lastUpdatedHours}
            onUpdateSession={() => {
              setSelectedAccount(breezeAccount);
              setOpenModal(true);
            }}
            onOpenLink={handleOpenLink}
          />
        </div>

        <UpdateSessionTokenDialog
          open={openModal}
          onOpenChange={setOpenModal}
          sessionToken={sessionToken}
          onSessionTokenChange={handleChange}
          onUpdate={sendToken}
          isUpdating={isUpdating}
          apiKey={selectedAccount?.api_key || ''}
          onOpenLink={handleOpenLink}
        />
      </PageContent>
    </PageLayout>
  );
};

export default AccountsPage;
