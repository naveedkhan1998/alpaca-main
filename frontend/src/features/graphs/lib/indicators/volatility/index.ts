/**
 * Volatility Indicators
 */

import bollingerBands from './bollingerBands';
import keltnerChannel from './keltnerChannel';
import atr from './atr';
import standardDeviation from './standardDeviation';
import historicalVolatility from './historicalVolatility';

export const volatility = [
  bollingerBands,
  keltnerChannel,
  atr,
  standardDeviation,
  historicalVolatility,
];

export {
  bollingerBands,
  keltnerChannel,
  atr,
  standardDeviation,
  historicalVolatility,
};
