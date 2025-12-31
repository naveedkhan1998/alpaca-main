import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  getCurrentToken,
  getIsGuest,
  setGuestMode,
} from 'src/features/auth/authSlice';
import { promptLogin } from '@/lib/loginPrompt';

export const useRequireAuth = () => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(getCurrentToken);
  const isGuest = useAppSelector(getIsGuest);

  return useCallback(
    (actionLabel?: string) => {
      if (accessToken) return true;

      const description = actionLabel
        ? `Log in to ${actionLabel}.`
        : 'Log in to continue with this action.';

      promptLogin(description, () => {
        if (isGuest) {
          dispatch(setGuestMode(false));
        }
      });

      return false;
    },
    [accessToken, dispatch, isGuest]
  );
};
