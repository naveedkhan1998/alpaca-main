const GUEST_MODE_STORAGE_KEY = 'alpaca.guest';

const isBrowser = typeof window !== 'undefined';

export const getGuestMode = (): boolean => {
  if (!isBrowser) return false;
  return localStorage.getItem(GUEST_MODE_STORAGE_KEY) === 'true';
};

export const setGuestMode = (enabled: boolean) => {
  if (!isBrowser) return;
  if (enabled) {
    localStorage.setItem(GUEST_MODE_STORAGE_KEY, 'true');
  } else {
    localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
  }
};

export const clearGuestMode = () => {
  if (!isBrowser) return;
  localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
};

export { GUEST_MODE_STORAGE_KEY };
