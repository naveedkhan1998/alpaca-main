package com.breeze.backend.repository;

import com.breeze.backend.model.SubscribedInstruments;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubscribedInstrumentsRepository extends JpaRepository<SubscribedInstruments, Long> {
}
