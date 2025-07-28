import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { useGetBreezeQuery } from '@/api/breezeServices';
import {
  setBreezeAccount,
  setBreezeAccountLoading,
  getCurrentToken,
  getBreezeAccountFromState,
  getHasBreezeAccount,
  getIsBreezeAccountLoading,
} from '../authSlice';

export const useBreezeAccount = () => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(getCurrentToken);
  const breezeAccount = useAppSelector(getBreezeAccountFromState);
  const hasBreezeAccount = useAppSelector(getHasBreezeAccount);
  const isBreezeAccountLoading = useAppSelector(getIsBreezeAccountLoading);

  const { data, isLoading, isSuccess, error } = useGetBreezeQuery(undefined, {
    skip: !accessToken, // Only fetch if user is authenticated
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    dispatch(setBreezeAccountLoading(isLoading));

    if (isSuccess && data?.data) {
      const account = data.data.length > 0 ? data.data[0] : null;
      dispatch(setBreezeAccount(account));
    } else if (error) {
      dispatch(setBreezeAccount(null));
    }
  }, [dispatch, accessToken, data, isLoading, isSuccess, error]);

  return {
    breezeAccount, // Sensitive data only in memory
    hasBreezeAccount, // Boolean flag from localStorage
    isBreezeAccountLoading,
    refetch: () => {
      // This will be handled by RTK Query's refetch
    },
  };
};
