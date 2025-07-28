package com.breeze.backend.repository;

import com.breeze.backend.model.Exchanges;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ExchangesRepository extends JpaRepository<Exchanges, Long> {
    Optional<Exchanges> findByTitle(String title);
}
