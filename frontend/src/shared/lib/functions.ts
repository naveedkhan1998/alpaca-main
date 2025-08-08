import { Candle } from '@/types/common-types';
import { CandlestickData, LineData } from 'lightweight-charts';

export function formatDate(originalDate: string) {
  // Handle null, undefined, or empty strings
  if (!originalDate || typeof originalDate !== 'string') {
    console.warn('Invalid date string provided to formatDate:', originalDate);
    return Math.floor(Date.now() / 1000); // Return current timestamp as fallback
  }

  try {
    // Use the original date string which includes timezone information
    // This will parse correctly and maintain the original timezone
    const parsedDate = new Date(originalDate);

    // Check if the parsed date is valid
    if (isNaN(parsedDate.getTime())) {
      console.warn('Failed to parse date string:', originalDate);
      return Math.floor(Date.now() / 1000);
    }

    // Extract timezone offset from the original string
    // Example: "2025-07-09T13:30:00-04:00" -> "-04:00"
    const timezoneMatch = originalDate.match(/([+-]\d{2}:\d{2})$/);

    if (timezoneMatch) {
      // If timezone is present, we need to adjust to show the original market time
      const timezoneOffset = timezoneMatch[1];
      const offsetMatch = timezoneOffset.match(/([+-])(\d{2}):(\d{2})/);

      if (offsetMatch) {
        const [, sign, hours, minutes] = offsetMatch;
        const offsetMinutes =
          (parseInt(hours) * 60 + parseInt(minutes)) * (sign === '-' ? -1 : 1);

        // Adjust the timestamp to show the time as it was in the original timezone
        const adjustedTime = parsedDate.getTime() + offsetMinutes * 60 * 1000;
        return adjustedTime / 1000;
      }
    }

    // If no timezone info, return as is
    return parsedDate.getTime() / 1000;
  } catch (error) {
    console.warn('Error parsing date:', originalDate, error);
    return Math.floor(Date.now() / 1000);
  }
}

export const calculateMA = (
  data: CandlestickData[],
  period: number
): LineData[] => {
  const maData: LineData[] = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((total, candle) => total + candle.close, 0);
    const ma = sum / period;

    maData.push({
      time: data[i].time,
      value: ma,
    });
  }

  return maData;
};

export const calculateBollingerBands = (
  data: Candle[],
  period: number = 20,
  stdDev: number = 2
) => {
  if (data.length < period) return [];

  const bands = [];
  let sum = 0;
  let sumSquares = 0;

  // Initialize the sum and sumSquares for the first period
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
    sumSquares += data[i].close ** 2;
  }

  for (let i = period - 1; i < data.length; i++) {
    if (i >= period) {
      // Slide the window: subtract the element that is left behind and add the new element
      sum += data[i].close - data[i - period].close;
      sumSquares += data[i].close ** 2 - data[i - period].close ** 2;
    }

    const mean = sum / period;
    const variance = sumSquares / period - mean ** 2;
    const stdDevValue = Math.sqrt(variance);

    const dateField =
      data[i].timestamp || (data[i] as unknown as { date: string }).date;
    bands.push({
      time: formatDate(dateField),
      upper: mean + stdDev * stdDevValue,
      middle: mean,
      lower: mean - stdDev * stdDevValue,
    });
  }

  return bands;
};

export const calculateRSI = (data: Candle[], period: number = 14) => {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  const dateField =
    data[period].timestamp ||
    (data[period] as unknown as { date: string }).date;
  rsi.push({
    time: formatDate(dateField),
    value: 100 - 100 / (1 + avgGain / avgLoss),
  });

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
    const dateFieldCurrent =
      data[i].timestamp || (data[i] as unknown as { date: string }).date;
    rsi.push({
      time: formatDate(dateFieldCurrent),
      value: 100 - 100 / (1 + avgGain / avgLoss),
    });
  }
  return rsi;
};

export const calculateMACD = (
  data: Candle[],
  shortPeriod: number = 12,
  longPeriod: number = 26,
  signalPeriod: number = 9
) => {
  const ema = (data: Candle[], period: number) => {
    const k = 2 / (period + 1);
    const emaArray = [];
    emaArray.push(data[0].close); // First value is just the close value

    for (let i = 1; i < data.length; i++) {
      emaArray.push(data[i].close * k + emaArray[i - 1] * (1 - k));
    }

    return emaArray;
  };

  const shortEma = ema(data, shortPeriod);
  const longEma = ema(data, longPeriod);
  const macdLine = shortEma.map((value, index) => value - longEma[index]);
  const signalLine = ema(
    //@ts-expect-error no shit 2
    macdLine.map((value, index) => ({
      close: value,
      timestamp:
        data[index].timestamp ||
        (data[index] as unknown as { date: string }).date,
    })),
    signalPeriod
  );
  const histogram = macdLine.map((value, index) => value - signalLine[index]);

  return data.map((candle, index) => {
    const dateField =
      candle.timestamp || (candle as unknown as { date: string }).date;
    return {
      time: formatDate(dateField),
      macd: macdLine[index],
      signal: signalLine[index],
      histogram: histogram[index],
    };
  });
};

export const calculateATR = (data: Candle[], period: number = 14) => {
  const trs: number[] = [];
  const atrs: { time: number; value: number }[] = [];

  for (let i = 0; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = i > 0 ? data[i - 1].close : high; // Use high if no previous close

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trs.push(tr);

    if (i >= period - 1) {
      let atr: number;
      if (i === period - 1) {
        atr = trs.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
      } else {
        atr = (atrs[atrs.length - 1].value * (period - 1) + tr) / period;
      }
      const dateField =
        data[i].timestamp || (data[i] as unknown as { date: string }).date;
      atrs.push({ time: formatDate(dateField), value: atr });
    }
  }
  return atrs;
};
