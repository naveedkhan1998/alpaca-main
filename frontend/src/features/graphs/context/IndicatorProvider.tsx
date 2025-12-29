/**
 * IndicatorProvider
 *
 * Context provider for managing indicator state across the application.
 * Provides methods for adding, removing, and configuring indicators,
 * as well as access to the current indicator instances and calculated outputs.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import { nanoid } from '@reduxjs/toolkit';
import {
  selectIndicatorInstances,
  addIndicatorInstance,
  removeIndicatorInstance,
  updateIndicatorInstanceConfig,
  clearAllIndicators,
  toggleIndicatorVisibility,
  updateIndicatorLabel,
} from '../graphSlice';
import IndicatorSelector from '../components/IndicatorSelector';
import IndicatorConfigDialog from '../components/IndicatorConfigDialog';
import {
  getDefaultConfig,
  getIndicator,
  type IndicatorId,
  type IndicatorConfig,
  type IndicatorInstance,
  type IndicatorDefinition,
} from '../lib/indicators';

/**
 * Indicator context value interface
 */
interface IndicatorContextValue {
  /** Current indicator instances from Redux state */
  instances: IndicatorInstance[];

  /** Add a new indicator by its ID */
  addIndicator: (
    indicatorId: IndicatorId,
    config?: Partial<IndicatorConfig>
  ) => string;

  /** Remove an indicator instance by ID */
  removeIndicator: (instanceId: string) => void;

  /** Update an indicator's configuration */
  updateConfig: (instanceId: string, config: IndicatorConfig) => void;

  /** Toggle indicator visibility */
  toggleVisibility: (instanceId: string) => void;

  /** Update indicator label */
  updateLabel: (instanceId: string, label: string) => void;

  /** Clear all indicators */
  clearAll: () => void;

  /** Open the indicator selector modal */
  openSelector: () => void;

  /** Close the indicator selector modal */
  closeSelector: () => void;

  /** Open the indicator config dialog for a specific instance */
  openConfig: (instanceId: string) => void;

  /** Close the indicator config dialog */
  closeConfig: () => void;

  /** Check if the selector is open */
  isSelectorOpen: boolean;

  /** Get indicator definition by ID */
  getDefinition: (indicatorId: IndicatorId) => IndicatorDefinition | undefined;

  /** Get default config for an indicator */
  getDefault: (indicatorId: IndicatorId) => IndicatorConfig;
}

const IndicatorContext = createContext<IndicatorContextValue | null>(null);

/**
 * Hook to access the indicator UI context (modals, selectors)
 * Note: For calculated indicator data, use useIndicators from hooks/useIndicators
 * @throws Error if used outside of IndicatorProvider
 */
export function useIndicatorUI(): IndicatorContextValue {
  const context = useContext(IndicatorContext);
  if (!context) {
    throw new Error('useIndicatorUI must be used within an IndicatorProvider');
  }
  return context;
}

interface IndicatorProviderProps {
  children: ReactNode;
}

/**
 * Provider component that wraps the application and provides indicator management
 */
export function IndicatorProvider({ children }: IndicatorProviderProps) {
  const dispatch = useAppDispatch();
  const instances = useAppSelector(selectIndicatorInstances);

  // Local UI state for modals
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [configState, setConfigState] = useState<{
    isOpen: boolean;
    instanceId: string | null;
  }>({ isOpen: false, instanceId: null });

  // Add a new indicator
  const addIndicator = useCallback(
    (indicatorId: IndicatorId, config?: Partial<IndicatorConfig>): string => {
      const instanceId = nanoid();
      const defaultConfig = getDefaultConfig(indicatorId);
      dispatch(
        addIndicatorInstance({
          instanceId,
          indicatorId,
          config: { ...defaultConfig, ...config } as IndicatorConfig,
          visible: true,
        })
      );
      return instanceId;
    },
    [dispatch]
  );

  // Remove an indicator
  const removeIndicator = useCallback(
    (instanceId: string) => {
      dispatch(removeIndicatorInstance(instanceId));
    },
    [dispatch]
  );

  // Update indicator config
  const updateConfig = useCallback(
    (instanceId: string, config: IndicatorConfig) => {
      dispatch(updateIndicatorInstanceConfig({ instanceId, config }));
    },
    [dispatch]
  );

  // Toggle visibility
  const toggleVisibility = useCallback(
    (instanceId: string) => {
      dispatch(toggleIndicatorVisibility(instanceId));
    },
    [dispatch]
  );

  // Update label
  const updateLabel = useCallback(
    (instanceId: string, label: string) => {
      dispatch(updateIndicatorLabel({ instanceId, label }));
    },
    [dispatch]
  );

  // Clear all indicators
  const clearAll = useCallback(() => {
    dispatch(clearAllIndicators());
  }, [dispatch]);

  // Modal controls
  const openSelector = useCallback(() => setSelectorOpen(true), []);
  const closeSelector = useCallback(() => setSelectorOpen(false), []);
  const openConfig = useCallback(
    (instanceId: string) => setConfigState({ isOpen: true, instanceId }),
    []
  );
  const closeConfig = useCallback(
    () => setConfigState({ isOpen: false, instanceId: null }),
    []
  );

  // Get indicator definition
  const getDefinition = useCallback(
    (indicatorId: IndicatorId) => getIndicator(indicatorId),
    []
  );

  // Get default config
  const getDefault = useCallback(
    (indicatorId: IndicatorId) =>
      getDefaultConfig(indicatorId) as IndicatorConfig,
    []
  );

  // Memoized context value
  const contextValue = useMemo<IndicatorContextValue>(
    () => ({
      instances,
      addIndicator,
      removeIndicator,
      updateConfig,
      toggleVisibility,
      updateLabel,
      clearAll,
      openSelector,
      closeSelector,
      openConfig,
      closeConfig,
      isSelectorOpen: selectorOpen,
      getDefinition,
      getDefault,
    }),
    [
      instances,
      addIndicator,
      removeIndicator,
      updateConfig,
      toggleVisibility,
      updateLabel,
      clearAll,
      openSelector,
      closeSelector,
      openConfig,
      closeConfig,
      selectorOpen,
      getDefinition,
      getDefault,
    ]
  );

  // Get current config dialog instance and definition
  const configInstance = configState.instanceId
    ? instances.find(i => i.instanceId === configState.instanceId)
    : null;
  const configDefinition = configInstance
    ? getIndicator(configInstance.indicatorId)
    : null;

  return (
    <IndicatorContext.Provider value={contextValue}>
      {children}

      {/* Indicator Selector Modal */}
      <IndicatorSelector
        isOpen={selectorOpen}
        onClose={closeSelector}
        activeInstances={instances}
        onAddIndicator={addIndicator}
        onRemoveIndicator={removeIndicator}
        onOpenSettings={openConfig}
      />

      {/* Indicator Config Drawer */}
      <IndicatorConfigDialog
        instance={configInstance ?? null}
        definition={configDefinition ?? null}
        isOpen={configState.isOpen}
        onClose={closeConfig}
        onSave={(instanceId, config) => {
          updateConfig(instanceId, config);
          closeConfig();
        }}
      />
    </IndicatorContext.Provider>
  );
}

export default IndicatorProvider;
