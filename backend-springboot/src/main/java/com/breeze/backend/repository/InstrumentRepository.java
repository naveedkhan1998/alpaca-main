package com.breeze.backend.repository;

import com.breeze.backend.model.Exchanges;
import com.breeze.backend.model.Instrument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InstrumentRepository extends JpaRepository<Instrument, Long> {
    List<Instrument> findByExchangeAndShortNameContainingIgnoreCase(Exchanges exchange, String shortName);
}
