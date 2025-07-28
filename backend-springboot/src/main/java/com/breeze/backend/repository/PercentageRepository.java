package com.breeze.backend.repository;

import com.breeze.backend.model.Percentage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PercentageRepository extends JpaRepository<Percentage, Long> {
}
