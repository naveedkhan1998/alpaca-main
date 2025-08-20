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
import { Eye, Heart, Building2 } from 'lucide-react';
import { Asset } from '@/types/common-types';

type Props = {
  asset: Asset;
  onSelect: (asset: Asset) => void;
  onWatchlist: (asset: Asset, e: React.MouseEvent) => void;
};

const getAssetClassColor = (assetClass: string) => {
  switch (assetClass) {
    case 'us_equity':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'us_option':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    case 'crypto':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

export const AssetCard: React.FC<Props> = ({
  asset,
  onSelect,
  onWatchlist,
}) => {
  return (
    <Card
      className="h-full transition-all duration-300 cursor-pointer hover:shadow-glow/50 hover:scale-[1.02] group glass-card"
      onClick={() => onSelect(asset)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl glass-card group-hover:glass-button transition-all duration-300">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">{asset.symbol}</CardTitle>
          </div>
          <Badge className={`${getAssetClassColor(asset.asset_class)} font-medium`}>
            {asset.asset_class.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {asset.name}
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm pt-0">
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Exchange</p>
          <p className="truncate font-semibold">{asset.exchange}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Tradable</p>
          <p className="font-semibold text-success">{asset.tradable ? 'Yes' : 'No'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Marginable</p>
          <p className="font-semibold">{asset.marginable ? 'Yes' : 'No'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Shortable</p>
          <p className="font-semibold">{asset.shortable ? 'Yes' : 'No'}</p>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-end gap-2 pt-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="glass-card hover:glass-button transition-all duration-300 touch-target"
          onClick={e => onWatchlist(asset, e)}
        >
          <Heart className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="glass-button hover:shadow-glow transition-all duration-300 touch-target"
          onClick={e => {
            e.stopPropagation();
            onSelect(asset);
          }}
        >
          <Eye className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AssetCard;
