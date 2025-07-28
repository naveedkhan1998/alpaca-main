package com.breeze.backend.repository;

import com.breeze.backend.model.Tick;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TickRepository extends JpaRepository<Tick, Long> {
}
