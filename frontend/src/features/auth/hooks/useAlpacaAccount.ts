import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { useGetAlpacaQuery } from '@/api/alpacaService';
import {
  setAlpacaAccount,
  setAlpacaAccountLoading,
  getCurrentToken,
  getAlpacaAccountFromState,
  getHasAlpacaAccount,
  getIsAlpacaAccountLoading,
} from '../authSlice';

export const useAlpacaAccount = () => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(getCurrentToken);
  const alpacaAccount = useAppSelector(getAlpacaAccountFromState);
  const hasAlpacaAccount = useAppSelector(getHasAlpacaAccount);
  const isAlpacaAccountLoading = useAppSelector(getIsAlpacaAccountLoading);

  const { data, isLoading, isSuccess, error } = useGetAlpacaQuery(undefined, {
    skip: !accessToken, // Only fetch if user is authenticated
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    dispatch(setAlpacaAccountLoading(isLoading));

    if (isSuccess && data?.data) {
      const account = data.data.length > 0 ? data.data[0] : null;
      dispatch(setAlpacaAccount(account));
    } else if (error) {
      dispatch(setAlpacaAccount(null));
    }
  }, [dispatch, accessToken, data, isLoading, isSuccess, error]);

  return {
    alpacaAccount, // Sensitive data only in memory
    hasAlpacaAccount, // Boolean flag from localStorage
    isAlpacaAccountLoading,
    refetch: () => {
      // This will be handled by RTK Query's refetch
    },
  };
};
