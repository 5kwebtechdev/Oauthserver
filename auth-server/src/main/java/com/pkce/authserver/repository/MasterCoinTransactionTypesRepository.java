package com.pkce.authserver.repository;

import com.pkce.authserver.superme.model.MasterCoinTransactionTypes;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MasterCoinTransactionTypesRepository extends JpaRepository<MasterCoinTransactionTypes, Integer> {
    Optional<MasterCoinTransactionTypes> findFirstByValueIgnoreCase(String value);
}
