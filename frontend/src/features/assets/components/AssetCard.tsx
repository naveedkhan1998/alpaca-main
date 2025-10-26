import React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Heart, Building2, Shield, TrendingUp } from 'lucide-react';
import { Asset } from '@/types/common-types';
import { motion } from 'framer-motion';

type Props = {
  asset: Asset;
  onSelect: (asset: Asset) => void;
  onWatchlist: (asset: Asset, e: React.MouseEvent) => void;
};

const getAssetClassColor = (assetClass: string) => {
  switch (assetClass) {
    case 'us_equity':
      return {
        badge: 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 dark:from-blue-900/20 dark:to-blue-800/20 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        icon: 'text-blue-600 dark:text-blue-400',
        accent: 'border-blue-200/50 dark:border-blue-800/30',
      };
    case 'us_option':
      return {
        badge: 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 dark:from-purple-900/20 dark:to-purple-800/20 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        icon: 'text-purple-600 dark:text-purple-400',
        accent: 'border-purple-200/50 dark:border-purple-800/30',
      };
    case 'crypto':
      return {
        badge: 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 dark:from-orange-900/20 dark:to-orange-800/20 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        icon: 'text-orange-600 dark:text-orange-400',
        accent: 'border-orange-200/50 dark:border-orange-800/30',
      };
    default:
      return {
        badge: 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 dark:from-gray-900/20 dark:to-gray-800/20 dark:text-gray-300 border-gray-200 dark:border-gray-800',
        icon: 'text-gray-600 dark:text-gray-400',
        accent: 'border-gray-200/50 dark:border-gray-800/30',
      };
  }
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export const AssetCard: React.FC<Props> = ({
  asset,
  onSelect,
  onWatchlist,
}) => {
  const config = getAssetClassColor(asset.asset_class);

  return (
    <motion.div {...fadeInUp} className="h-full">
      <Card
        className={`relative h-full overflow-hidden transition-all duration-200 cursor-pointer group hover:shadow-lg hover:shadow-black/5 border-0 shadow-sm bg-card ${config.accent}`}
        onClick={() => onSelect(asset)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-3">
            <Badge className={`${config.badge} border shadow-sm font-medium text-xs px-2.5 py-1`}>
              {asset.asset_class.replace('_', ' ').toUpperCase()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => onWatchlist(asset, e)}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
              title="Add to Watchlist"
            >
              <Heart className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-muted/50 ${config.icon}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-bold truncate leading-tight">
                {asset.symbol}
              </CardTitle>
              <p className="text-sm text-muted-foreground font-medium">
                {asset.exchange}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {asset.name}
          </p>
        </CardHeader>

        <CardContent className="pt-0 pb-4">
          <div className="space-y-3">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={asset.tradable ? 'default' : 'secondary'}
                className="text-xs px-2.5 py-1 font-medium"
              >
                {asset.tradable ? 'Tradable' : 'No Trade'}
              </Badge>
              {asset.marginable && (
                <Badge variant="outline" className="text-xs px-2.5 py-1 border-dashed">
                  <Shield className="w-3 h-3 mr-1" />
                  Margin
                </Badge>
              )}
              {asset.shortable && (
                <Badge variant="outline" className="text-xs px-2.5 py-1 border-dashed">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Short
                </Badge>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-0">
          <Button
            variant="default"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              onSelect(asset);
            }}
            className="w-full gap-2 h-9 font-medium"
          >
            <Eye className="w-4 h-4" />
            View Details
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
