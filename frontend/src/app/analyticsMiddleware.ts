import { Middleware } from '@reduxjs/toolkit';
import {
  trackLogin,
  trackLogout,
  trackRegistration,
  trackWatchlistAction,
  trackAssetInteraction,
  trackAccountAction,
  setUserProperties,
  trackEvent,
  trackError,
} from '@/lib/analytics';

interface ReduxAction {
  type?: string;
  payload?: {
    user?: {
      id?: number;
      email?: string;
      username?: string;
    };
    name?: string;
    symbol?: string;
    data?: {
      access?: string;
      user?: {
        id?: number;
        email?: string;
        username?: string;
      };
    };
    [key: string]: unknown;
  };
  meta?: {
    arg?: {
      endpointName?: string;
      originalArgs?: {
        watchlist_id?: number;
        asset_id?: number;
        symbol?: string;
        name?: string;
        id?: number;
      };
      symbol?: string;
      toString?: () => string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  error?: {
    message?: string;
    [key: string]: unknown;
  };
}

/**
 * Redux middleware to automatically track analytics events
 * based on dispatched actions (including RTK Query)
 */
export const analyticsMiddleware: Middleware = () => next => action => {
  const typedAction = action as ReduxAction;

  if (typedAction.type) {
    const actionType = typedAction.type;

    // ===============================
    // RTK Query API Events
    // ===============================

    // User Authentication (RTK Query)
    if (actionType === 'baseApi/executeMutation/fulfilled') {
      const endpointName = typedAction.meta?.arg?.endpointName;
      
      if (endpointName === 'loginUser') {
        trackLogin('credentials');
        if (typedAction.payload?.data?.user) {
          const user = typedAction.payload.data.user;
          setUserProperties(user.id?.toString() || 'unknown', {
            email: user.email || '',
            username: user.username || '',
          });
        }
      }
      
      if (endpointName === 'googleLogin') {
        trackLogin('google');
        if (typedAction.payload?.data?.user) {
          const user = typedAction.payload.data.user;
          setUserProperties(user.id?.toString() || 'unknown', {
            email: user.email || '',
            username: user.username || '',
          });
        }
      }
      
      if (endpointName === 'registerUser') {
        trackRegistration('credentials');
      }

      // Watchlist RTK Query Mutations
      if (endpointName === 'createWatchList') {
        const watchlistName = typedAction.meta?.arg?.originalArgs?.name;
        trackWatchlistAction('create', watchlistName);
      }

      if (endpointName === 'deleteWatchList') {
        const watchlistId = typedAction.meta?.arg?.originalArgs;
        trackWatchlistAction('delete', watchlistId?.toString());
      }

      if (endpointName === 'addAssetToWatchList') {
        const args = typedAction.meta?.arg?.originalArgs;
        trackWatchlistAction('add_asset', `watchlist:${args?.watchlist_id}, asset:${args?.asset_id}`);
      }

      if (endpointName === 'removeAssetFromWatchList') {
        const args = typedAction.meta?.arg?.originalArgs;
        trackWatchlistAction('remove_asset', `watchlist:${args?.watchlist_id}, asset:${args?.asset_id}`);
      }

      if (endpointName === 'updateWatchList') {
        const watchlistId = typedAction.meta?.arg?.originalArgs?.id;
        trackWatchlistAction('update', watchlistId?.toString());
      }

      // Alpaca Account Actions
      if (endpointName === 'createAlpaca') {
        trackAccountAction('connect_alpaca');
      }

      if (endpointName === 'updateAlpaca') {
        trackAccountAction('update_alpaca');
      }

      if (endpointName === 'startWebsocket') {
        trackEvent('Alpaca', 'Start Websocket');
      }

      if (endpointName === 'syncAssets') {
        trackEvent('Alpaca', 'Sync Assets');
      }

      // Paper Trading Actions
      if (endpointName === 'createPaperTrade') {
        trackEvent('Paper Trading', 'Create Trade');
      }

      if (endpointName === 'updatePaperTrade') {
        trackEvent('Paper Trading', 'Update Trade');
      }

      if (endpointName === 'deletePaperTrade') {
        trackEvent('Paper Trading', 'Delete Trade');
      }
    }

    // Track RTK Query errors (but filter out false positives)
    if (actionType === 'baseApi/executeMutation/rejected' || 
        actionType === 'baseApi/executeQuery/rejected') {
      const endpointName = typedAction.meta?.arg?.endpointName;
      const errorMessage = typedAction.error?.message || 'Unknown error';
      
      // Filter out RTK Query false positives that aren't actual errors
      const isFalsePositive = 
        errorMessage.includes('Aborted due to condition callback') || // Skipped queries
        errorMessage.includes('Promise was aborted') ||                 // User cancelled
        errorMessage.includes('Request was cancelled');                 // Intentional cancellation
      
      // Only track actual errors
      if (endpointName && !isFalsePositive) {
        trackError(`${endpointName}: ${errorMessage}`, 'API Error');
      }
    }

    // ===============================
    // Regular Redux Actions (Slices)
    // ===============================

    // Auth slice events
    if (actionType === 'auth/setCredentials') {
      if (typedAction.payload?.user) {
        const user = typedAction.payload.user;
        setUserProperties(user.id?.toString() || 'unknown', {
          email: user.email || '',
          username: user.username || '',
        });
      }
    }

    if (actionType === 'auth/logout') {
      trackLogout();
    }

    // Asset slice events
    if (actionType === 'asset/setSelectedAsset') {
      trackAssetInteraction('view', typedAction.payload?.symbol);
    }

    // Legacy action tracking (in case you have custom thunks)
    if (actionType === 'auth/login/fulfilled') {
      trackLogin('credentials');
    }

    if (actionType === 'auth/googleLogin/fulfilled') {
      trackLogin('google');
    }

    if (actionType === 'auth/register/fulfilled') {
      trackRegistration('credentials');
    }

    if (actionType === 'watchlist/createWatchlist/fulfilled') {
      trackWatchlistAction('create', typedAction.payload?.name);
    }

    if (actionType === 'watchlist/deleteWatchlist/fulfilled') {
      trackWatchlistAction('delete', typedAction.meta?.arg?.toString?.());
    }

    if (actionType === 'asset/searchAssets/fulfilled') {
      if (typedAction.meta?.arg && typeof typedAction.meta.arg === 'string') {
        trackAssetInteraction('search', typedAction.meta.arg);
      }
    }
  }

  // Continue with the action
  return next(action);
};
