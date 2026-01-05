/**
 * IndicatorConfigDialog Component
 *
 * A bottom drawer for configuring indicator parameters.
 * Uses Drawer for a mobile-feel bottom sheet experience on all devices.
 */

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HiRefresh } from 'react-icons/hi';
import type {
  IndicatorInstance,
  IndicatorDefinition,
  NumericParameter,
  ColorParameter,
  SelectParameter,
  BooleanParameter,
  IndicatorConfig,
} from '../../lib/indicators/types';
import { getDefaultConfig } from '../../lib/indicators';

interface IndicatorConfigDialogProps {
  /** The indicator instance being configured */
  instance: IndicatorInstance | null;
  /** The indicator definition */
  definition: IndicatorDefinition | null;
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Callback to save changes */
  onSave: (instanceId: string, config: IndicatorConfig) => void;
}

const IndicatorConfigDialog: React.FC<IndicatorConfigDialogProps> = ({
  instance,
  definition,
  isOpen,
  onClose,
  onSave,
}) => {
  const [localConfig, setLocalConfig] = useState<IndicatorConfig>({});

  // Initialize local config when drawer opens
  useEffect(() => {
    if (instance && isOpen) {
      setLocalConfig({ ...instance.config });
    }
  }, [instance, isOpen]);

  if (!instance || !definition) return null;

  const handleSave = () => {
    onSave(instance.instanceId, localConfig);
    onClose();
  };

  const handleReset = () => {
    const defaultConfig = getDefaultConfig(instance.indicatorId);
    setLocalConfig(defaultConfig as IndicatorConfig);
  };

  const updateValue = (key: string, value: number | string | boolean) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  // Render a numeric parameter with slider
  const renderNumericParam = (param: NumericParameter) => {
    const value = (localConfig[param.key] as number) ?? param.default;
    const isFloat = param.step < 1;

    return (
      <div key={param.key} className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor={param.key} className="text-sm font-semibold">
              {param.label}
            </Label>
            {param.description && (
              <p className="text-xs text-muted-foreground">
                {param.description}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-primary">
              {isFloat ? value.toFixed(1) : value}
            </span>
          </div>
        </div>
        <Slider
          id={param.key}
          min={param.min}
          max={param.max}
          step={param.step}
          value={[value]}
          onValueChange={([v]) => updateValue(param.key, v)}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{param.min}</span>
          <span>{param.max}</span>
        </div>
      </div>
    );
  };

  // Render a color parameter
  const renderColorParam = (param: ColorParameter) => {
    const value = (localConfig[param.key] as string) ?? param.default;

    return (
      <div key={param.key} className="space-y-2">
        <Label htmlFor={param.key} className="text-sm font-semibold">
          {param.label}
        </Label>
        <div className="flex items-center gap-3">
          <Input
            id={param.key}
            type="color"
            value={value}
            onChange={e => updateValue(param.key, e.target.value)}
            className="w-12 h-10 border-2 cursor-pointer p-1"
          />
          <span className="text-sm uppercase text-muted-foreground font-mono">
            {value}
          </span>
          <div
            className="w-8 h-8 border-2 rounded border-border shadow-sm"
            style={{ backgroundColor: value }}
          />
        </div>
      </div>
    );
  };

  // Render a select parameter
  const renderSelectParam = (param: SelectParameter) => {
    const value = (localConfig[param.key] as string) ?? param.default;

    return (
      <div key={param.key} className="space-y-2">
        <Label htmlFor={param.key} className="text-sm font-semibold">
          {param.label}
        </Label>
        <Select value={value} onValueChange={v => updateValue(param.key, v)}>
          <SelectTrigger id={param.key}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {param.options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  // Render a boolean parameter
  const renderBooleanParam = (param: BooleanParameter) => {
    const value = (localConfig[param.key] as boolean) ?? param.default;

    return (
      <div key={param.key} className="flex items-center justify-between py-2">
        <div>
          <Label htmlFor={param.key} className="text-sm font-semibold">
            {param.label}
          </Label>
          {param.description && (
            <p className="text-xs text-muted-foreground">{param.description}</p>
          )}
        </div>
        <Switch
          id={param.key}
          checked={value}
          onCheckedChange={v => updateValue(param.key, v)}
        />
      </div>
    );
  };

  // Group parameters by type for better organization
  const numericParams = definition.parameters.filter(p => p.type === 'number');
  const colorParams = definition.parameters.filter(p => p.type === 'color');
  const selectParams = definition.parameters.filter(p => p.type === 'select');
  const booleanParams = definition.parameters.filter(p => p.type === 'boolean');

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-xl font-bold">
            {definition.name} Settings
          </DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground">
            Configure indicator parameters
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="max-h-[50dvh] px-4">
          <div className="space-y-6 pb-4 pr-4">
            {/* Numeric parameters */}
            {numericParams.length > 0 && (
              <div className="space-y-4">
                {numericParams.map(param =>
                  renderNumericParam(param as NumericParameter)
                )}
              </div>
            )}

            {/* Select parameters */}
            {selectParams.length > 0 && (
              <div className="space-y-4">
                {selectParams.map(param =>
                  renderSelectParam(param as SelectParameter)
                )}
              </div>
            )}

            {/* Boolean parameters */}
            {booleanParams.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                {booleanParams.map(param =>
                  renderBooleanParam(param as BooleanParameter)
                )}
              </div>
            )}

            {/* Color parameters */}
            {colorParams.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <h4 className="text-sm font-semibold text-muted-foreground">
                  Colors
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {colorParams.map(param =>
                    renderColorParam(param as ColorParameter)
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {definition.description}
              </p>
            </div>
          </div>
        </ScrollArea>

        <DrawerFooter className="border-t pt-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
              type="button"
            >
              <HiRefresh className="w-4 h-4" />
              Reset to Default
            </Button>
            <Button
              onClick={handleSave}
              type="button"
              className="w-full sm:w-auto"
            >
              Apply Changes
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default IndicatorConfigDialog;
