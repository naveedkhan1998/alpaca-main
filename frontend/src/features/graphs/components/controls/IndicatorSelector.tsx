/**
 * IndicatorSelector Component
 *
 * A modal-based UI for browsing, searching, and adding indicators.
 * Uses Dialog for a TradingView-style centered modal experience.
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  HiSearch,
  HiPlus,
  HiTrash,
  HiCog,
  HiChartPie,
  HiTrendingUp,
  HiViewGrid,
  HiChartBar,
  HiChartSquareBar,
} from 'react-icons/hi';
import {
  getIndicatorsGrouped,
  type IndicatorDefinition,
  type IndicatorId,
  type IndicatorGroup,
  type IndicatorInstance,
} from '../../lib/indicators';

interface IndicatorSelectorProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Currently active indicator instances */
  activeInstances: IndicatorInstance[];
  /** Callback to add an indicator */
  onAddIndicator: (indicatorId: IndicatorId) => void;
  /** Callback to remove an indicator instance */
  onRemoveIndicator: (instanceId: string) => void;
  /** Callback to open settings for an instance */
  onOpenSettings: (instanceId: string) => void;
}

// Icon mapping for indicator groups
const GROUP_ICONS: Record<string, React.ReactNode> = {
  'Moving Averages': <HiTrendingUp className="w-4 h-4" />,
  'Volatility Bands': <HiViewGrid className="w-4 h-4" />,
  Momentum: <HiChartPie className="w-4 h-4" />,
  Volatility: <HiChartSquareBar className="w-4 h-4" />,
  Volume: <HiChartBar className="w-4 h-4" />,
};

const IndicatorSelector: React.FC<IndicatorSelectorProps> = ({
  isOpen,
  onClose,
  activeInstances,
  onAddIndicator,
  onRemoveIndicator,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'overlay' | 'panel'>(
    'all'
  );

  // Get grouped indicators
  const indicatorGroups = useMemo(() => getIndicatorsGrouped(), []);

  // Filter groups based on active tab and search query
  const filteredGroups = useMemo((): IndicatorGroup[] => {
    let groups: IndicatorGroup[] = indicatorGroups;

    // Filter by category
    if (activeTab !== 'all') {
      groups = groups.filter((g: IndicatorGroup) => g.category === activeTab);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      groups = groups
        .map((group: IndicatorGroup) => ({
          ...group,
          indicators: group.indicators.filter(
            (ind: IndicatorDefinition) =>
              ind.name.toLowerCase().includes(query) ||
              ind.shortName.toLowerCase().includes(query) ||
              ind.description.toLowerCase().includes(query)
          ),
        }))
        .filter((group: IndicatorGroup) => group.indicators.length > 0);
    }

    return groups;
  }, [indicatorGroups, activeTab, searchQuery]);

  // Get count of active instances for an indicator type
  const getInstanceCount = (indicatorId: IndicatorId): number => {
    return activeInstances.filter(inst => inst.indicatorId === indicatorId)
      .length;
  };

  // Get instances of a specific indicator type
  const getInstancesOfType = (
    indicatorId: IndicatorId
  ): IndicatorInstance[] => {
    return activeInstances.filter(inst => inst.indicatorId === indicatorId);
  };

  // Render a single indicator item
  const renderIndicatorItem = (indicator: IndicatorDefinition) => {
    const instanceCount = getInstanceCount(indicator.id);
    const instances = getInstancesOfType(indicator.id);
    const hasInstances = instanceCount > 0;

    return (
      <div
        key={indicator.id}
        className={`p-3 rounded-lg border transition-colors ${
          hasInstances
            ? 'bg-accent/50 border-primary/30'
            : 'border-transparent hover:bg-muted/50 hover:border-border'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{indicator.name}</span>
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {indicator.shortName}
              </Badge>
              {hasInstances && (
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0 bg-primary text-primary-foreground"
                >
                  {instanceCount}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {indicator.description}
            </p>
          </div>
          <Button
            variant={hasInstances ? 'outline' : 'default'}
            size="sm"
            className="h-8 px-2"
            onClick={() => onAddIndicator(indicator.id)}
          >
            <HiPlus className="w-4 h-4" />
          </Button>
        </div>

        {/* Show active instances */}
        {instances.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
            {instances.map(instance => {
              const config = instance.config;
              const label =
                instance.label ||
                `${indicator.shortName}(${config.period || ''})`;

              return (
                <div
                  key={instance.instanceId}
                  className="flex items-center justify-between text-xs bg-card/50 rounded px-2 py-1"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onOpenSettings(instance.instanceId)}
                    >
                      <HiCog className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:text-destructive"
                      onClick={() => onRemoveIndicator(instance.instanceId)}
                    >
                      <HiTrash className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render a group of indicators
  const renderGroup = (group: IndicatorGroup) => {
    const icon = GROUP_ICONS[group.name] || <HiChartPie className="w-4 h-4" />;

    return (
      <div key={`${group.category}-${group.name}`} className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {icon}
          <span>{group.name}</span>
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {group.category}
          </Badge>
        </div>
        <div className="space-y-2">
          {group.indicators.map(ind => renderIndicatorItem(ind))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 !grid-rows-[auto_auto_auto_1fr_auto] grid">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <HiChartPie className="w-5 h-5" />
            Indicators
            {activeInstances.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeInstances.length} active
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Add technical indicators to your chart
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 py-2">
          <div className="relative">
            <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search indicators..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-6 py-2">
          <Tabs
            value={activeTab}
            onValueChange={v => setActiveTab(v as typeof activeTab)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="overlay">Overlay</TabsTrigger>
              <TabsTrigger value="panel">Panel</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Indicator list */}
        <ScrollArea className="px-6 min-h-0">
          <div className="space-y-6 pb-4 pr-2">
            {filteredGroups.length > 0 ? (
              filteredGroups.map(group => renderGroup(group))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <HiSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No indicators found</p>
                {searchQuery && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with clear all */}
        {activeInstances.length > 0 && (
          <div className="border-t p-4 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => {
                activeInstances.forEach(inst =>
                  onRemoveIndicator(inst.instanceId)
                );
              }}
            >
              <HiTrash className="w-4 h-4 mr-2" />
              Clear all indicators
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IndicatorSelector;
