import { useCallback } from 'react';
import type { Candle } from '@/types/common-types';
import type { Asset } from '@/types/common-types';

interface UseChartDownloadProps {
  asset: Asset | undefined | null;
  candles: Candle[];
  timeframe: number;
}

export function useChartDownload({
  asset,
  candles,
  timeframe,
}: UseChartDownloadProps) {
  const handleDownload = useCallback(() => {
    if (!candles || candles.length === 0) return;

    const headers = 'Date,Time,Open,High,Low,Close,Volume';
    const csvData = candles.map(
      ({ date, open, high, low, close, volume = 0 }) => {
        const dt = new Date(date);
        return `${dt.toLocaleDateString()},${dt.toLocaleTimeString()},${open},${high},${low},${close},${volume}`;
      }
    );
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${csvData.join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${asset?.name ?? 'asset'}_${timeframe}_data.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [asset?.name, candles, timeframe]);

  return { handleDownload };
}
