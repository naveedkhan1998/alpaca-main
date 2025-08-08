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
      className="h-full transition cursor-pointer hover:shadow-md"
      onClick={() => onSelect(asset)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">{asset.symbol}</CardTitle>
          </div>
          <Badge className={getAssetClassColor(asset.asset_class)}>
            {asset.asset_class.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
          {asset.name}
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">Exchange</p>
          <p className="truncate">{asset.exchange}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tradable</p>
          <p>{asset.tradable ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Marginable</p>
          <p>{asset.marginable ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Shortable</p>
          <p>{asset.shortable ? 'Yes' : 'No'}</p>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={e => onWatchlist(asset, e)}>
          <Heart className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
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
