package com.pkce.authserver.repository;

import com.pkce.authserver.superme.model.CoinTransactionReason;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CoinTransactionReasonRepository extends JpaRepository<CoinTransactionReason, Integer> {
    Optional<CoinTransactionReason> findFirstByTypeIdAndDescription(Integer typeId, String description);
}
