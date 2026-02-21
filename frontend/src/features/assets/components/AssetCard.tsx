import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { Asset } from '@/types/common-types';

type Props = {
  asset: Asset;
  onSelect: (asset: Asset) => void;
  onWatchlist: (asset: Asset, e: React.MouseEvent) => void;
};

const getAssetClassColor = (assetClass: string) => {
  switch (assetClass) {
    case 'us_equity':
      return 'bg-primary/10 text-primary';
    case 'us_option':
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400';
    case 'crypto':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const AssetCard: React.FC<Props> = ({
  asset,
  onSelect,
  onWatchlist,
}) => {
  return (
    <Card
      className="transition-colors cursor-pointer hover:bg-muted/50"
      onClick={() => onSelect(asset)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-mono font-medium">{asset.symbol}</p>
            <p className="text-sm text-muted-foreground truncate max-w-[180px]">
              {asset.name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={e => onWatchlist(asset, e)}
            className="p-0 w-7 h-7"
          >
            <Heart className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Badge
            variant="secondary"
            className={`text-xs ${getAssetClassColor(asset.asset_class)}`}
          >
            {asset.asset_class.replace('_', ' ')}
          </Badge>
          <Badge
            variant={asset.tradable ? 'default' : 'secondary'}
            className="text-xs"
          >
            {asset.tradable ? 'Tradable' : 'No Trade'}
          </Badge>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">{asset.exchange}</p>
      </CardContent>
    </Card>
  );
};
