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
import { Eye, Heart, Building2, TrendingUp, Shield } from 'lucide-react';
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
        badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        gradient: 'from-blue-500 to-indigo-500',
      };
    case 'us_option':
      return {
        badge: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        gradient: 'from-purple-500 to-fuchsia-500',
      };
    case 'crypto':
      return {
        badge: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        gradient: 'from-orange-500 to-amber-500',
      };
    default:
      return {
        badge: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300 border-gray-200 dark:border-gray-800',
        gradient: 'from-gray-500 to-slate-500',
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
        className="relative h-full overflow-hidden transition cursor-pointer group hover:shadow-lg"
        onClick={() => onSelect(asset)}
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 transition-opacity duration-300 opacity-0 pointer-events-none group-hover:opacity-100">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-5`}
          />
        </div>

        <CardHeader className="relative">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className={config.badge}>
              {asset.asset_class.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
            <CardTitle className="text-xl truncate">{asset.symbol}</CardTitle>
          </div>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {asset.name}
          </p>
        </CardHeader>

        <CardContent className="relative space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Exchange</p>
              <p className="font-medium truncate">{asset.exchange}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tradable</p>
              <Badge
                variant={asset.tradable ? 'default' : 'secondary'}
                className="text-xs"
              >
                {asset.tradable ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              <span>{asset.marginable ? 'Marginable' : 'Cash only'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{asset.shortable ? 'Shortable' : 'Long only'}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="relative flex items-center justify-end gap-2 pt-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={e => onWatchlist(asset, e)}
            className="hover:text-red-500 transition-colors"
          >
            <Heart className="w-4 h-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={e => {
              e.stopPropagation();
              onSelect(asset);
            }}
            className="gap-1"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">View</span>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default AssetCard;
