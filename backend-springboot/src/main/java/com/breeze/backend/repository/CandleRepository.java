package com.breeze.backend.repository;

import com.breeze.backend.model.Candle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandleRepository extends JpaRepository<Candle, Long> {
    List<Candle> findByInstrumentIdOrderByDate(Long instrumentId);
}
