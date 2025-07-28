import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, Store } from '@reduxjs/toolkit';
import { vi } from 'vitest';

// Define types
interface MockState {
  auth: {
    token: string | null;
    user: object | null;
  };
}

interface MockAction {
  type: string;
  payload?: object;
}

// Create a mock store setup
export const createMockStore = (initialState: Partial<MockState> = {}) => {
  return configureStore({
    reducer: {
      // Add your reducers here - this is a basic setup
      auth: (state = { token: null, user: null }, action: MockAction) => {
        switch (action.type) {
          case 'SET_CREDENTIALS':
            return { ...state, ...(action.payload || {}) };
          default:
            return state;
        }
      },
    },
    preloadedState: initialState,
  });
};

// Custom render function that includes providers
const customRender = (
  ui: React.ReactElement,
  options: RenderOptions & {
    initialState?: Partial<MockState>;
    store?: Store;
  } = {}
) => {
  const {
    initialState,
    store = createMockStore(initialState),
    ...renderOptions
  } = options;

  const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => (
    <Provider store={store}>
      <BrowserRouter>{children}</BrowserRouter>
    </Provider>
  );

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
};

// Mock localStorage
export const mockLocalStorage = () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  return localStorageMock;
};

// Mock window.location
export const mockLocation = (href = 'http://localhost:3000/') => {
  const locationMock = {
    href,
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  };

  Object.defineProperty(window, 'location', {
    value: locationMock,
    writable: true,
  });

  return locationMock;
};

// re-export testing library utilities
export { screen, fireEvent, waitFor, within } from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// override render method
export { customRender as render };
