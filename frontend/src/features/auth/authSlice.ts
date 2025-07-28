import { PayloadAction, createSlice } from '@reduxjs/toolkit';
import { RootState } from 'src/app/store';
import { User, BreezeAccount } from '@/types/common-types';
import { getToken } from '@/api/auth';

const access_token = getToken();

interface AuthState {
  access?: string | null;
  user?: User | null;
  breezeAccount?: BreezeAccount | null;
  hasBreezeAccount?: boolean;
  isBreezeAccountLoading?: boolean;
}

const initialState: AuthState = {
  access: access_token || null,
  user: null,
  breezeAccount: null,
  hasBreezeAccount: false,
  isBreezeAccountLoading: false,
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
    setBreezeAccount: (state, action: PayloadAction<BreezeAccount | null>) => {
      state.breezeAccount = action.payload;
      // Update the boolean flag based on whether account exists
      const hasAccount = !!action.payload;
      state.hasBreezeAccount = hasAccount;
    },
    setBreezeAccountLoading: (state, action: PayloadAction<boolean>) => {
      state.isBreezeAccountLoading = action.payload;
    },
    logOut: state => {
      state.access = null;
      state.user = null;
      state.breezeAccount = null;
      state.hasBreezeAccount = false;
      state.isBreezeAccountLoading = false;
    },
  },
});

export const {
  setCredentials,
  setBreezeAccount,
  setBreezeAccountLoading,
  logOut,
} = authSlice.actions;

export default authSlice.reducer;

export const getCurrentToken = (state: RootState) => state.auth.access;
export const getLoggedInUser = (state: RootState) => state.auth.user;
export const getBreezeAccountFromState = (state: RootState) =>
  state.auth.breezeAccount;
export const getHasBreezeAccount = (state: RootState) =>
  state.auth.hasBreezeAccount;
export const getIsBreezeAccountLoading = (state: RootState) =>
  state.auth.isBreezeAccountLoading;
