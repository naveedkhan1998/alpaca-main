import { toast } from 'sonner';
import { clearGuestMode } from './guestMode';

const LOGIN_URL = '/login';

export const promptLogin = (
  description = 'Log in to continue with this action.',
  onLogin?: () => void
) => {
  toast('Login required', {
    description,
    action: {
      label: 'Log in',
      onClick: () => {
        clearGuestMode();
        if (onLogin) onLogin();
        window.location.href = LOGIN_URL;
      },
    },
  });
};
