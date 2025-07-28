package com.breeze.backend.repository;

import com.breeze.backend.model.PercentageInstrument;
import com.breeze.backend.model.SubscribedInstruments;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PercentageInstrumentRepository extends JpaRepository<PercentageInstrument, Long> {
    Optional<PercentageInstrument> findByInstrument(SubscribedInstruments instrument);
}
