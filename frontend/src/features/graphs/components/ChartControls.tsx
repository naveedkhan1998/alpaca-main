import { useAppDispatch, useAppSelector } from 'src/app/hooks';
import {
  setTimeframe,
  setChartType,
  setShowVolume,
  setAutoRefresh,
  selectTimeframe,
  selectChartType,
  selectShowVolume,
  selectAutoRefresh,
  addIndicator,
  removeIndicator,
  selectActiveIndicators,
} from '../graphSlice';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { HiInformationCircle } from 'react-icons/hi';
import { PresetsPanel } from './controls/PresetsPanel';
import { TimeframeSelector } from './controls/TimeframeSelector';
import { ChartStyleSelector } from './controls/ChartStyleSelector';
import { IndicatorsPanel } from './controls/IndicatorsPanel';
import { SettingsPanel } from './controls/SettingsPanel';

export default function ChartControls() {
  const dispatch = useAppDispatch();
  const timeframe = useAppSelector(selectTimeframe);
  const chartType = useAppSelector(selectChartType);
  const showVolume = useAppSelector(selectShowVolume);
  const autoRefresh = useAppSelector(selectAutoRefresh);
  const activeIndicators = useAppSelector(selectActiveIndicators);

  const timeframeOptions = [
    { value: 1, label: '1m' },
    { value: 5, label: '5m' },
    { value: 15, label: '15m' },
    { value: 60, label: '1h' },
    { value: 240, label: '4h' },
    { value: 1440, label: '1D' },
  ];

  const handleIndicatorToggle = (indicatorName: string, checked: boolean) => {
    if (checked) dispatch(addIndicator(indicatorName));
    else dispatch(removeIndicator(indicatorName));
  };

  const clearIndicators = () => {
    activeIndicators.forEach(ind => dispatch(removeIndicator(ind)));
  };

  const applyPreset = (preset: 'classic' | 'clean' | 'baseline') => {
    switch (preset) {
      case 'classic':
        dispatch(setChartType('Candlestick'));
        dispatch(setShowVolume(true));
        break;
      case 'clean':
        dispatch(setChartType('Line'));
        dispatch(setShowVolume(false));
        break;
      case 'baseline':
        dispatch(setChartType('Baseline'));
        dispatch(setShowVolume(false));
        break;
    }
  };

  return (
    <div className="space-y-3 scrollbar-hidden ">
      {autoRefresh && (
        <Card className="shadow-sm border-green-500/30 bg-gradient-to-r from-green-500/10 via-green-400/10 to-green-500/10 backdrop-blur-sm">
          <CardContent className="px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center flex-1 min-w-0 gap-2">
                <div className="relative">
                  <div className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                <span className="text-xs font-medium text-green-400 truncate">
                  Live data active
                </span>
              </div>
              <Badge
                variant="secondary"
                className="text-xs text-green-400 bg-green-500/20 border-green-500/30 shrink-0"
              >
                LIVE
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HiInformationCircle className="w-3 h-3 shrink-0" />
            <div className="overflow-hidden">
              <div className="hidden sm:block">
                <span>
                  Shortcuts:{' '}
                  <kbd className="px-1 py-0.5 rounded bg-muted mx-1 text-[10px]">
                    F
                  </kbd>{' '}
                  Fullscreen
                  <Separator
                    orientation="vertical"
                    className="inline-block h-3 mx-2"
                  />
                  <kbd className="px-1 py-0.5 rounded bg-muted mx-1 text-[10px]">
                    V
                  </kbd>{' '}
                  Volume
                  <Separator
                    orientation="vertical"
                    className="inline-block h-3 mx-2"
                  />
                  <kbd className="px-1 py-0.5 rounded bg-muted mx-1 text-[10px]">
                    C
                  </kbd>{' '}
                  Controls
                </span>
              </div>
              <div className="block sm:hidden text-[10px]">
                <span>Tap and hold chart for options</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PresetsPanel onPreset={applyPreset} />

      <TimeframeSelector
        timeframe={timeframe}
        options={timeframeOptions}
        onChange={val => dispatch(setTimeframe(val))}
      />

      <ChartStyleSelector
        chartType={chartType}
        onChange={val => dispatch(setChartType(val))}
      />

      <IndicatorsPanel
        activeIndicators={activeIndicators}
        onToggle={handleIndicatorToggle}
        onClearAll={clearIndicators}
      />

      <SettingsPanel
        showVolume={showVolume}
        onShowVolumeChange={show => dispatch(setShowVolume(show))}
        autoRefresh={autoRefresh}
        onAutoRefreshChange={auto => dispatch(setAutoRefresh(auto))}
      />
    </div>
  );
}
