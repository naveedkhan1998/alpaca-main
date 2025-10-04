import { RootState } from 'src/app/store';
import { getCeleryWorkerUrls } from '@/lib/environment';
import { createSlice, createAsyncThunk, Dispatch } from '@reduxjs/toolkit';

// Define health status type
type HealthStatus = 'ok' | 'error' | 'pending';

// Define a type for the slice state
interface HealthState {
  [key: string]: HealthStatus;
}

const initialState: HealthState = {};

export const checkHealth = createAsyncThunk<
  { name: string; status: Exclude<HealthStatus, 'pending'> }[],
  void,
  { dispatch: Dispatch }
>('health/checkHealth', async (_, { dispatch }) => {
  // need to skip this for development since everything is running on localhost
  if (!process.env.production) {
    return [];
  }
  const workers = getCeleryWorkerUrls();

  // Set all workers to pending state
  workers.forEach(worker => {
    dispatch(setServiceStatus({ name: worker.name, status: 'pending' }));
  });

  const responses = await Promise.all(
    workers.map(async worker => {
      try {
        const response = await fetch(worker.url);
        return {
          name: worker.name,
          status: response.ok ? ('ok' as const) : ('error' as const),
        };
      } catch (error) {
        console.error(`Error checking health for ${worker.name}:`, error);
        return {
          name: worker.name,
          status: 'error' as const,
        };
      }
    })
  );

  responses.forEach(response => {
    dispatch(setServiceStatus(response));
  });

  return responses;
});

export const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    setServiceStatus: (
      state,
      action: { payload: { name: string; status: HealthStatus } }
    ) => {
      state[action.payload.name] = action.payload.status;
    },
  },
});

export const { setServiceStatus } = healthSlice.actions;

export default healthSlice.reducer;

export const selectHealthStatus = (state: RootState) => state.health;

export type { HealthStatus };
