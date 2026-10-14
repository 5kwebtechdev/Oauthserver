package com.pkce.authserver.repository;

import com.pkce.authserver.superme.model.CoinTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoinTransactionRepository extends JpaRepository<CoinTransaction, Long> {
}
