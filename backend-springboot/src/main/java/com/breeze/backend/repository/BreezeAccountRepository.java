package com.breeze.backend.repository;

import com.breeze.backend.model.BreezeAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BreezeAccountRepository extends JpaRepository<BreezeAccount, Long> {
    List<BreezeAccount> findByUserId(Long userId);
}
