import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  updateIndicatorConfig,
  resetIndicatorConfig,
  selectIndicatorConfig,
  type RSIConfig,
  type ATRConfig,
  type EMAConfig,
  type BollingerBandsConfig,
  type MACDConfig,
} from '../graphSlice';
import { HiRefresh } from 'react-icons/hi';
import { useIsMobile } from '@/hooks/useMobile';

type IndicatorType = 'RSI' | 'ATR' | 'EMA' | 'BollingerBands' | 'MACD';

interface IndicatorSettingsDialogProps {
  indicator: IndicatorType;
  isOpen: boolean;
  onClose: () => void;
}

const IndicatorSettingsDialog: React.FC<IndicatorSettingsDialogProps> = ({
  indicator,
  isOpen,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const config = useAppSelector(selectIndicatorConfig(indicator));
  const [localConfig, setLocalConfig] = useState(config);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    setLocalConfig(config);
  }, [config, isOpen]);

  const handleSave = () => {
    dispatch(updateIndicatorConfig({ indicator, config: localConfig }));
    onClose();
  };

  const handleReset = () => {
    dispatch(resetIndicatorConfig(indicator));
    setLocalConfig(config);
  };

  const renderRSISettings = (cfg: RSIConfig) => (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="rsi-period" className="text-sm font-semibold">
            Period
          </Label>
          <span className="text-sm font-bold text-primary">{cfg.period}</span>
        </div>
        <Slider
          id="rsi-period"
          min={5}
          max={50}
          step={1}
          value={[cfg.period]}
          onValueChange={([value]) => setLocalConfig({ ...cfg, period: value })}
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="rsi-overbought" className="text-sm font-semibold">
            Overbought Level
          </Label>
          <span className="text-sm font-bold text-primary">
            {cfg.overbought}
          </span>
        </div>
        <Slider
          id="rsi-overbought"
          min={60}
          max={90}
          step={1}
          value={[cfg.overbought]}
          onValueChange={([value]) =>
            setLocalConfig({ ...cfg, overbought: value })
          }
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="rsi-oversold" className="text-sm font-semibold">
            Oversold Level
          </Label>
          <span className="text-sm font-bold text-primary">{cfg.oversold}</span>
        </div>
        <Slider
          id="rsi-oversold"
          min={10}
          max={40}
          step={1}
          value={[cfg.oversold]}
          onValueChange={([value]) =>
            setLocalConfig({ ...cfg, oversold: value })
          }
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="rsi-color" className="text-sm font-semibold">
          Line Color
        </Label>
        <Input
          id="rsi-color"
          type="color"
          value={cfg.color}
          onChange={e => setLocalConfig({ ...cfg, color: e.target.value })}
          className="w-full h-10 cursor-pointer"
        />
      </div>
    </div>
  );

  const renderATRSettings = (cfg: ATRConfig) => (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="atr-period" className="text-sm font-semibold">
            Period
          </Label>
          <span className="text-sm font-bold text-primary">{cfg.period}</span>
        </div>
        <Slider
          id="atr-period"
          min={5}
          max={50}
          step={1}
          value={[cfg.period]}
          onValueChange={([value]) => setLocalConfig({ ...cfg, period: value })}
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="atr-color" className="text-sm font-semibold">
          Line Color
        </Label>
        <Input
          id="atr-color"
          type="color"
          value={cfg.color}
          onChange={e => setLocalConfig({ ...cfg, color: e.target.value })}
          className="w-full h-10 cursor-pointer"
        />
      </div>
    </div>
  );

  const renderEMASettings = (cfg: EMAConfig) => (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="ema-period" className="text-sm font-semibold">
            Period
          </Label>
          <span className="text-sm font-bold text-primary">{cfg.period}</span>
        </div>
        <Slider
          id="ema-period"
          min={5}
          max={200}
          step={1}
          value={[cfg.period]}
          onValueChange={([value]) => setLocalConfig({ ...cfg, period: value })}
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="ema-color" className="text-sm font-semibold">
          Line Color
        </Label>
        <Input
          id="ema-color"
          type="color"
          value={cfg.color}
          onChange={e => setLocalConfig({ ...cfg, color: e.target.value })}
          className="w-full h-10 cursor-pointer"
        />
      </div>
    </div>
  );

  const renderBollingerBandsSettings = (cfg: BollingerBandsConfig) => (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="bb-period" className="text-sm font-semibold">
            Period
          </Label>
          <span className="text-sm font-bold text-primary">{cfg.period}</span>
        </div>
        <Slider
          id="bb-period"
          min={5}
          max={50}
          step={1}
          value={[cfg.period]}
          onValueChange={([value]) => setLocalConfig({ ...cfg, period: value })}
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="bb-stddev" className="text-sm font-semibold">
            Standard Deviation
          </Label>
          <span className="text-sm font-bold text-primary">{cfg.stdDev}</span>
        </div>
        <Slider
          id="bb-stddev"
          min={1}
          max={4}
          step={0.1}
          value={[cfg.stdDev]}
          onValueChange={([value]) => setLocalConfig({ ...cfg, stdDev: value })}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="bb-upper-color" className="text-xs font-semibold">
            Upper
          </Label>
          <Input
            id="bb-upper-color"
            type="color"
            value={cfg.upperColor}
            onChange={e =>
              setLocalConfig({ ...cfg, upperColor: e.target.value })
            }
            className="w-full h-10 cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bb-middle-color" className="text-xs font-semibold">
            Middle
          </Label>
          <Input
            id="bb-middle-color"
            type="color"
            value={cfg.middleColor}
            onChange={e =>
              setLocalConfig({ ...cfg, middleColor: e.target.value })
            }
            className="w-full h-10 cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bb-lower-color" className="text-xs font-semibold">
            Lower
          </Label>
          <Input
            id="bb-lower-color"
            type="color"
            value={cfg.lowerColor}
            onChange={e =>
              setLocalConfig({ ...cfg, lowerColor: e.target.value })
            }
            className="w-full h-10 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );

  const renderMACDSettings = (cfg: MACDConfig) => (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="macd-fast" className="text-sm font-semibold">
            Fast Period
          </Label>
          <span className="text-sm font-bold text-primary">
            {cfg.fastPeriod}
          </span>
        </div>
        <Slider
          id="macd-fast"
          min={5}
          max={30}
          step={1}
          value={[cfg.fastPeriod]}
          onValueChange={([value]) =>
            setLocalConfig({ ...cfg, fastPeriod: value })
          }
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="macd-slow" className="text-sm font-semibold">
            Slow Period
          </Label>
          <span className="text-sm font-bold text-primary">
            {cfg.slowPeriod}
          </span>
        </div>
        <Slider
          id="macd-slow"
          min={15}
          max={50}
          step={1}
          value={[cfg.slowPeriod]}
          onValueChange={([value]) =>
            setLocalConfig({ ...cfg, slowPeriod: value })
          }
          className="w-full"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="macd-signal" className="text-sm font-semibold">
            Signal Period
          </Label>
          <span className="text-sm font-bold text-primary">
            {cfg.signalPeriod}
          </span>
        </div>
        <Slider
          id="macd-signal"
          min={5}
          max={20}
          step={1}
          value={[cfg.signalPeriod]}
          onValueChange={([value]) =>
            setLocalConfig({ ...cfg, signalPeriod: value })
          }
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="macd-macd-color" className="text-xs font-semibold">
            MACD
          </Label>
          <Input
            id="macd-macd-color"
            type="color"
            value={cfg.macdColor}
            onChange={e =>
              setLocalConfig({ ...cfg, macdColor: e.target.value })
            }
            className="w-full h-10 cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="macd-signal-color" className="text-xs font-semibold">
            Signal
          </Label>
          <Input
            id="macd-signal-color"
            type="color"
            value={cfg.signalColor}
            onChange={e =>
              setLocalConfig({ ...cfg, signalColor: e.target.value })
            }
            className="w-full h-10 cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="macd-histogram-color"
            className="text-xs font-semibold"
          >
            Histogram
          </Label>
          <Input
            id="macd-histogram-color"
            type="color"
            value={cfg.histogramColor}
            onChange={e =>
              setLocalConfig({ ...cfg, histogramColor: e.target.value })
            }
            className="w-full h-10 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );

  const renderSettings = () => {
    switch (indicator) {
      case 'RSI':
        return renderRSISettings(localConfig as RSIConfig);
      case 'ATR':
        return renderATRSettings(localConfig as ATRConfig);
      case 'EMA':
        return renderEMASettings(localConfig as EMAConfig);
      case 'BollingerBands':
        return renderBollingerBandsSettings(
          localConfig as BollingerBandsConfig
        );
      case 'MACD':
        return renderMACDSettings(localConfig as MACDConfig);
      default:
        return null;
    }
  };

  const getIndicatorName = () => {
    switch (indicator) {
      case 'RSI':
        return 'Relative Strength Index (RSI)';
      case 'ATR':
        return 'Average True Range (ATR)';
      case 'EMA':
        return 'Exponential Moving Average (EMA)';
      case 'BollingerBands':
        return 'Bollinger Bands';
      case 'MACD':
        return 'MACD';
      default:
        return indicator;
    }
  };

  const settingsContent = (
    <>
      <div className="px-4 py-4 sm:px-0">{renderSettings()}</div>

      <div className="flex flex-col-reverse gap-2 px-4 pb-4 sm:flex-row sm:justify-end sm:space-x-2 sm:px-0 sm:pb-0">
        <Button
          variant="outline"
          onClick={handleReset}
          className="gap-2"
          type="button"
        >
          <HiRefresh className="w-4 h-4" />
          Reset to Default
        </Button>
        <Button onClick={handleSave} type="button" className="w-full sm:w-auto">
          Apply Changes
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90dvh]">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold">
              {getIndicatorName()} Settings
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Customize the parameters for this indicator. Changes apply
              immediately to the chart.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto">{settingsContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {getIndicatorName()} Settings
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Customize the parameters for this indicator. Changes apply
            immediately to the chart.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">{renderSettings()}</div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
            type="button"
          >
            <HiRefresh className="w-4 h-4" />
            Reset to Default
          </Button>
          <Button onClick={handleSave} type="button">
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IndicatorSettingsDialog;
