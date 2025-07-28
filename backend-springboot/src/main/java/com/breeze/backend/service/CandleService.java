package com.breeze.backend.service;

import com.breeze.backend.dto.CandleDto;

import java.util.List;

public interface CandleService {
    List<CandleDto> getCandles(Long instrumentId, Integer timeframe);
}
