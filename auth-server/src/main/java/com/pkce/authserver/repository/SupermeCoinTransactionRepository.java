package com.pkce.authserver.repository;

import com.pkce.authserver.superme.model.CoinTransaction;
import com.pkce.authserver.superme.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Reads SuperMeBE's live mindfullP1.CoinTransaction table - mirrors
 * CoinTransactionRepository#sumEarnedByUser/sumSpentByUser on their side, so the "coins" figure
 * in this server's /oauth2/token "user" payload matches the ledger instead of the stored
 * User.coins column, which can drift out of sync with it.
 */
public interface SupermeCoinTransactionRepository extends JpaRepository<CoinTransaction, Long> {

    @Query("SELECT COALESCE(SUM(ct.amount), 0) FROM CoinTransaction ct WHERE ct.user = :user AND ct.amount > 0")
    int sumEarnedByUser(@Param("user") User user);

    @Query("SELECT COALESCE(SUM(ct.amount), 0) FROM CoinTransaction ct WHERE ct.user = :user AND ct.amount < 0")
    int sumSpentByUser(@Param("user") User user);
}
