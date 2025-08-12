import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from 'src/app/store';
import { User, AlpacaAccount } from '@/types/common-types';
import { getToken } from '@/api/auth';

const access_token = getToken();

interface AuthState {
  access?: string | null;
  user?: User | null;
  alpacaAccount?: AlpacaAccount | null;
  hasAlpacaAccount?: boolean;
  isAlpacaAccountLoading?: boolean;
}

const initialState: AuthState = {
  access: access_token || null,
  user: null,
  alpacaAccount: null,
  hasAlpacaAccount: false,
  isAlpacaAccountLoading: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ access?: string; user?: User }>
    ) => {
      const { access, user } = action.payload;
      state.access = access;
      state.user = user;
    },
    setAlpacaAccount: (state, action: PayloadAction<AlpacaAccount | null>) => {
      state.alpacaAccount = action.payload;
      // Update the boolean flag based on whether account exists
      const hasAccount = !!action.payload;
      state.hasAlpacaAccount = hasAccount;
    },
    setAlpacaAccountLoading: (state, action: PayloadAction<boolean>) => {
      state.isAlpacaAccountLoading = action.payload;
    },
    logOut: state => {
      state.access = null;
      state.user = null;
      state.alpacaAccount = null;
      state.hasAlpacaAccount = false;
      state.isAlpacaAccountLoading = false;
    },
  },
});

export const {
  setCredentials,
  setAlpacaAccount,
  setAlpacaAccountLoading,
  logOut,
} = authSlice.actions;

export default authSlice.reducer;

export const getCurrentToken = (state: RootState) => state.auth.access;
export const getLoggedInUser = (state: RootState) => state.auth.user;
export const getAlpacaAccountFromState = (state: RootState) =>
  state.auth.alpacaAccount;
export const getHasAlpacaAccount = (state: RootState) =>
  state.auth.hasAlpacaAccount;
export const getIsAlpacaAccountLoading = (state: RootState) =>
  state.auth.isAlpacaAccountLoading;
