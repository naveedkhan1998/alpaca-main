import { User } from '@/types/common-types';

type TokenProp = {
  value: {
    access: string;
  };
};

const storeToken = ({ value }: TokenProp) => {
  if (value) {
    const { access } = value;
    localStorage.setItem('access_token', access);
  }
};

const getToken = () => {
  const access_token = localStorage.getItem('access_token');
  return { access_token };
};

const removeToken = () => {
  localStorage.removeItem('access_token');
};

const storeUser = (user: User) => {
  localStorage.setItem('alpaca_user', JSON.stringify(user));
};

const getUser = (): User | null => {
  const user = localStorage.getItem('alpaca_user');
  return user ? JSON.parse(user) : null;
};

const removeUser = () => {
  localStorage.removeItem('alpaca_user');
};

const storeAlpacaAccountExists = (exists: boolean) => {
  localStorage.setItem('has_alpaca_account', JSON.stringify(exists));
};

const getAlpacaAccountExists = (): boolean => {
  const exists = localStorage.getItem('has_alpaca_account');
  return exists ? JSON.parse(exists) : false;
};

const removeAlpacaAccountExists = () => {
  localStorage.removeItem('has_alpaca_account');
};

export {
  storeToken,
  getToken,
  removeToken,
  storeUser,
  getUser,
  removeUser,
  storeAlpacaAccountExists,
  getAlpacaAccountExists,
  removeAlpacaAccountExists,
};
