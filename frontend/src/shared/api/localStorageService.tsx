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
  localStorage.setItem('breeze_user', JSON.stringify(user));
};

const getUser = (): User | null => {
  const user = localStorage.getItem('breeze_user');
  return user ? JSON.parse(user) : null;
};

const removeUser = () => {
  localStorage.removeItem('breeze_user');
};

const storeBreezeAccountExists = (exists: boolean) => {
  localStorage.setItem('has_breeze_account', JSON.stringify(exists));
};

const getBreezeAccountExists = (): boolean => {
  const exists = localStorage.getItem('has_breeze_account');
  return exists ? JSON.parse(exists) : false;
};

const removeBreezeAccountExists = () => {
  localStorage.removeItem('has_breeze_account');
};

export {
  storeToken,
  getToken,
  removeToken,
  storeUser,
  getUser,
  removeUser,
  storeBreezeAccountExists,
  getBreezeAccountExists,
  removeBreezeAccountExists,
};
