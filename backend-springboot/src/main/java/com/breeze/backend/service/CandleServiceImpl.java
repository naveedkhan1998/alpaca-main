package com.breeze.backend.service;

import com.breeze.backend.dto.CandleDto;
import com.breeze.backend.model.Candle;
import com.breeze.backend.repository.CandleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CandleServiceImpl implements CandleService {

    @Autowired
    private CandleRepository candleRepository;

    @Override
    public List<CandleDto> getCandles(Long instrumentId, Integer timeframe) {
        List<Candle> candles = candleRepository.findByInstrumentIdOrderByDate(instrumentId);
        List<CandleDto> candleDtos = candles.stream().map(this::convertToDto).collect(Collectors.toList());

        if (timeframe != null) {
            return resampleCandles(candleDtos, timeframe);
        }
        return candleDtos;
    }

    private CandleDto convertToDto(Candle candle) {
        CandleDto candleDto = new CandleDto();
        candleDto.setOpen(candle.getOpen());
        candleDto.setHigh(candle.getHigh());
        candleDto.setLow(candle.getLow());
        candleDto.setClose(candle.getClose());
        candleDto.setVolume(candle.getVolume());
        candleDto.setDate(candle.getDate());
        return candleDto;
    }

    private List<CandleDto> resampleCandles(List<CandleDto> candles, int timeframe) {
        if (candles == null || candles.isEmpty()) {
            return new ArrayList<>();
        }

        List<CandleDto> resampledCandles = new ArrayList<>();
        LocalDateTime currentBucketStartTime = candles.get(0).getDate();
        currentBucketStartTime = currentBucketStartTime.withSecond(0).withNano(0);

        double open = candles.get(0).getOpen();
        double high = Double.MIN_VALUE;
        double low = Double.MAX_VALUE;
        double close = candles.get(0).getClose();
        double volume = 0.0;

        for (CandleDto candle : candles) {
            LocalDateTime candleTime = candle.getDate();

            // Check if the candle falls into the current bucket
            if (candleTime.isBefore(currentBucketStartTime.plusMinutes(timeframe))) {
                high = Math.max(high, candle.getHigh());
                low = Math.min(low, candle.getLow());
                close = candle.getClose();
                volume += candle.getVolume() != null ? candle.getVolume() : 0.0;
            } else {
                // New bucket starts
                resampledCandles.add(createCandleDto(open, high, low, close, volume, currentBucketStartTime));

                // Move to the next bucket start time
                currentBucketStartTime = currentBucketStartTime.plusMinutes(timeframe);
                while (candleTime.isAfter(currentBucketStartTime.plusMinutes(timeframe)) || candleTime.isEqual(currentBucketStartTime.plusMinutes(timeframe))) {
                    currentBucketStartTime = currentBucketStartTime.plusMinutes(timeframe);
                }

                open = candle.getOpen();
                high = candle.getHigh();
                low = candle.getLow();
                close = candle.getClose();
                volume = candle.getVolume() != null ? candle.getVolume() : 0.0;
            }
        }

        // Add the last bucket
        resampledCandles.add(createCandleDto(open, high, low, close, volume, currentBucketStartTime));

        return resampledCandles;
    }

    private CandleDto createCandleDto(double open, double high, double low, double close, double volume, LocalDateTime date) {
        CandleDto candleDto = new CandleDto();
        candleDto.setOpen(open);
        candleDto.setHigh(high);
        candleDto.setLow(low);
        candleDto.setClose(close);
        candleDto.setVolume(volume);
        candleDto.setDate(date);
        return candleDto;
    }
}
